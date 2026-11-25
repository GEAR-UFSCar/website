import type { Metadata } from "next"
import Link from "next/link"

import { CompetenciasLista } from "@/components/competencias-lista"
import { ErroDados } from "@/components/erro-dados"
import { ModuloForm } from "@/components/modulo-form"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { eDiretoria, temCargo } from "@/lib/administracao"
import { COLUNAS_COMPROVACAO, COLUNAS_MODULO, NIVEIS_ACADEMIA, ordenarLicoes, pontosAprovados, proximaLicao, sequenciaDias, type Comprovacao, type Modulo } from "@/lib/academia"
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
 * Academia por competências (043). O membro escolhe o que comprovar, envia a
 * evidência e uma pessoa revisora valida. Pontos só contam aprovados.
 */
export default async function AcademiaPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  const [modulos, minhas, guias, licoesR, feitasR] = await Promise.all([
    supabase.from("modulos").select(COLUNAS_MODULO),
    supabase.from("progresso").select(COLUNAS_COMPROVACAO).eq("usuario_id", user.id),
    supabase.from("artigos").select("id, titulo").is("slug", null).order("titulo"),
    supabase.from("licoes").select("id, modulo_id, ordem, titulo"),
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
  const doModulo = (id: string) => licoes.filter((l) => l.modulo_id === id)
  const progresso = Object.fromEntries(
    competencias.map((m) => [m.id, { feitas: doModulo(m.id).filter((l) => feitas.has(l.id)).length, total: doModulo(m.id).length }]),
  )
  const dias = [...feitasLista.map((f) => f.feita_em), ...comprovacoes.map((c) => c.enviada_em)].filter((d): d is string => Boolean(d)).map(diaGear)
  const sequencia = sequenciaDias(dias, hojeISO())
  // a competência da lição feita mais recente que ainda tem lição pela frente
  const modRecente = feitasLista
    .map((f) => licoes.find((l) => l.id === f.licao_id)?.modulo_id)
    .find((mid) => mid && proximaLicao(doModulo(mid), feitas))
  const continuar = modRecente ? { modulo: competencias.find((m) => m.id === modRecente), licao: proximaLicao(doModulo(modRecente), feitas)! } : null

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="01 · Academia GEAR">
        Escolha uma competência, siga as lições (texto, vídeo e quiz com resposta na hora) e envie o link da evidência. Uma pessoa revisora (formação Principal ou
        Avançada) confere contra o critério de aceite. Pontos só contam quando a comprovação é aprovada; é isso
        que embasa a Avaliação Técnica antes da escolha de trilha.
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

          {continuar?.modulo && (
            <Link
              href={`/membros/aprendizagem/${continuar.modulo.id}?licao=${continuar.licao.id}`}
              className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--gear-amber)] p-4 transition-colors hover:bg-[var(--gear-navy)]"
            >
              <span>
                <span className={rotulo}>Continuar de onde parou</span>
                <span className="mt-1 block font-sans text-base">{continuar.modulo.titulo} · {continuar.licao.titulo}</span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gear-amber)]">Seguir →</span>
            </Link>
          )}

          {temCargo(perfil?.cargo) && (
            <Recolhivel rotulo="Nova competência" aberto={competencias.length === 0} className="mt-8">
              <ModuloForm guias={guias.data ?? []} competencias={competencias} />
            </Recolhivel>
          )}

          <CompetenciasLista
            competencias={competencias}
            minhas={comprovacoes}
            progresso={progresso}
            guias={guias.data ?? []}
            gerencia={temCargo(perfil?.cargo)}
            apaga={eDiretoria(perfil?.cargo)}
          />
        </>
      )}
    </section>
  )
}
