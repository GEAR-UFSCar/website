import type { Metadata } from "next"

import { CompetenciasLista } from "@/components/competencias-lista"
import { ErroDados } from "@/components/erro-dados"
import { ModuloForm } from "@/components/modulo-form"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { eDiretoria, temCargo } from "@/lib/administracao"
import { COLUNAS_COMPROVACAO, COLUNAS_MODULO, NIVEIS_ACADEMIA, pontosAprovados, type Comprovacao, type Modulo } from "@/lib/academia"
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

  const [modulos, minhas, guias] = await Promise.all([
    supabase.from("modulos").select(COLUNAS_MODULO),
    supabase.from("progresso").select(COLUNAS_COMPROVACAO).eq("usuario_id", user.id),
    supabase.from("artigos").select("id, titulo").is("slug", null).order("titulo"),
  ])

  const competencias = ((modulos.data ?? []) as Modulo[]).sort(
    (a, b) => NIVEIS_ACADEMIA.indexOf(a.nivel as never) - NIVEIS_ACADEMIA.indexOf(b.nivel as never) || (a.codigo ?? "~").localeCompare(b.codigo ?? "~") || a.ordem - b.ordem,
  )
  const comprovacoes = (minhas.data ?? []) as Comprovacao[]
  const aprovadas = comprovacoes.filter((c) => c.estado === "Aprovada").length
  const emAndamento = comprovacoes.filter((c) => c.estado && c.estado !== "Aprovada").length

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="01 · Academia GEAR">
        Escolha uma competência, faça, e envie o link da evidência. Uma pessoa revisora (formação Principal ou
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
          <div className="mt-8 grid grid-cols-3 gap-px border border-linha bg-linha">
            {[
              [pontosAprovados(comprovacoes, competencias), "pontos validados"],
              [aprovadas, "aprovadas"],
              [emAndamento, "em revisão ou ajustes"],
            ].map(([n, r]) => (
              <div key={r} className="bg-[var(--gear-navy)] p-4 md:p-6">
                <p className={numero}>{n}</p>
                <p className={rotulo}>{r}</p>
              </div>
            ))}
          </div>

          {temCargo(perfil?.cargo) && (
            <Recolhivel rotulo="Nova competência" aberto={competencias.length === 0} className="mt-8">
              <ModuloForm guias={guias.data ?? []} />
            </Recolhivel>
          )}

          <CompetenciasLista
            competencias={competencias}
            minhas={comprovacoes}
            guias={guias.data ?? []}
            gerencia={temCargo(perfil?.cargo)}
            apaga={eDiretoria(perfil?.cargo)}
          />
        </>
      )}
    </section>
  )
}
