import type { Metadata } from "next"
import Link from "next/link"

import { CompetenciasLista } from "@/components/competencias-lista"
import { ErroDados } from "@/components/erro-dados"
import { ModuloForm } from "@/components/modulo-form"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { temCargo } from "@/lib/administracao"
import { COLUNAS_COMPROVACAO, COLUNAS_MODULO, continuarEstudo, diasEstudados, NIVEIS_ACADEMIA, ordenarLicoes, pontosAprovados, sequenciaDias, type Comprovacao, type Modulo } from "@/lib/academia"
import { diaGear, hojeISO } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "01 · Academia GEAR | GEAR",
  robots: { index: false, follow: false },
}

const numero = "font-mono text-3xl text-[var(--gear-amber)] tabular-nums"
const rotulo = "mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"

/**
 * Academia por competências (043) com lições (047). Catálogo, números de quem
 * vê e "continuar de onde parou"; o resto mora na página de cada competência.
 */
export default async function AcademiaPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  const [modulos, minhas, guias, licoesR, feitasR] = await Promise.all([
    supabase.from("modulos").select(COLUNAS_MODULO),
    supabase.from("progresso").select(COLUNAS_COMPROVACAO).eq("usuario_id", user.id),
    supabase.from("artigos").select("id, titulo").is("slug", null).order("titulo"),
    supabase.from("licoes").select("id, modulo_id, ordem, titulo, duracao_min"),
    supabase.from("licoes_feitas").select("licao_id, feita_em").eq("usuario_id", user.id).order("feita_em", { ascending: false }),
  ])

  const competencias = ((modulos.data ?? []) as Modulo[]).sort(
    (a, b) => NIVEIS_ACADEMIA.indexOf(a.nivel as never) - NIVEIS_ACADEMIA.indexOf(b.nivel as never) || (a.codigo ?? "~").localeCompare(b.codigo ?? "~") || a.ordem - b.ordem,
  )
  const comprovacoes = (minhas.data ?? []) as Comprovacao[]
  const aprovadas = comprovacoes.filter((c) => c.estado === "Aprovada").length
  const emAndamento = comprovacoes.filter((c) => c.estado && c.estado !== "Aprovada").length

  // 047: lições. Progresso por competência, sequência de dias e "continuar".
  const licoes = (licoesR.data ?? []).sort(ordenarLicoes)
  const feitasLista = feitasR.data ?? []
  const feitas = new Set(feitasLista.map((f) => f.licao_id))
  const progresso: Record<string, { feitas: number; total: number; minutos: number }> = {}
  for (const l of licoes) {
    const p = (progresso[l.modulo_id] ??= { feitas: 0, total: 0, minutos: 0 })
    p.total++
    p.minutos += l.duracao_min ?? 0
    if (feitas.has(l.id)) p.feitas++
  }
  const sequencia = sequenciaDias(diasEstudados([...feitasLista.map((f) => f.feita_em), ...comprovacoes.map((c) => c.enviada_em)], diaGear), hojeISO())
  const seguir = continuarEstudo(licoes, feitasLista)
  const continuar = seguir ? { href: seguir.href, licao: seguir.licao.titulo, modulo: competencias.find((m) => m.id === seguir.moduloId)?.titulo } : null

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="01 · Academia GEAR">
        Escolha uma competência, siga as lições e comprove com uma evidência. Pontos só contam quando uma pessoa
        revisora (formação Principal ou Avançada) aprova, e são eles que embasam a Avaliação Técnica antes da
        escolha de trilha.
      </PageHeader>

      {modulos.error ? (
        <ErroDados titulo="ACADEMIA INDISPONÍVEL" erro={modulos.error} className="mt-10 max-w-2xl">
          Se o erro fala em <code>codigo</code>, <code>pontos</code> ou <code>estado</code>, falta rodar{" "}
          <code>supabase/043_organizacao_fase2.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-px border border-linha bg-linha md:grid-cols-4">
            {[
              [pontosAprovados(comprovacoes, competencias), "pontos validados"],
              [aprovadas, "aprovadas"],
              [emAndamento, "em revisão ou ajustes"],
              [sequencia, sequencia === 1 ? "dia seguido estudando" : "dias seguidos estudando"],
            ].map(([n, r]) => (
              <div key={r} className="bg-[var(--gear-navy)] p-4 md:p-6">
                <p className={numero}>{n}</p>
                <p className={rotulo}>{r}</p>
              </div>
            ))}
          </div>

          {continuar && (
            <Link
              href={continuar.href}
              className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--gear-amber)] p-4 transition-colors hover:bg-[var(--gear-navy)]"
            >
              <span>
                <span className={rotulo}>Continuar de onde parou</span>
                <span className="mt-1 block font-sans text-base">{continuar.modulo} · {continuar.licao}</span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gear-amber)]">Seguir →</span>
            </Link>
          )}

          {temCargo(perfil?.cargo) && (
            <Recolhivel rotulo="Nova competência" aberto={competencias.length === 0} className="mt-8">
              <ModuloForm guias={guias.data ?? []} competencias={competencias} />
            </Recolhivel>
          )}

          <CompetenciasLista competencias={competencias} minhas={comprovacoes} progresso={progresso} />
        </>
      )}
    </section>
  )
}
