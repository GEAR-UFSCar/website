import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { pontosNoCiclo } from "@/lib/alertas"
import { hojeISO } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Membros e desempenho | GEAR",
  robots: { index: false, follow: false },
}

const th = "py-3 pr-4 text-left font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground"
const td = "py-3 pr-4 align-top"

/**
 * Membros e desempenho (044). Em ordem alfabética, sem ranking: o foco é
 * ninguém sumir. Pontos só da Academia e só aprovados; tarefa não tem ponto.
 */
export default async function DesempenhoPage() {
  await exigirMembroAprovado()
  const hoje = hojeISO()
  const supabase = await createClient()
  const [pessoasR, cicloR, tarefasR, aprovadasR] = await Promise.all([
    supabase.from("perfis").select("id, nome_completo, frente, nivel_formacao").eq("aprovado", true).eq("ativo", true).order("nome_completo"),
    supabase.from("ciclos").select("nome, inicio, fim, meta_pontos").lte("inicio", hoje).gte("fim", hoje).order("inicio", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sprint_tarefas").select("responsavel_id, estado, tipo, concluida_em").not("responsavel_id", "is", null),
    supabase.from("progresso").select("usuario_id, concluido_em, modulo:modulos (pontos)").eq("estado", "Aprovada"),
  ])
  const erro = pessoasR.error ?? tarefasR.error ?? aprovadasR.error
  const ciclo = cicloR.data
  const tarefas = tarefasR.data ?? []
  const aprovadas = ((aprovadasR.data ?? []) as unknown as { usuario_id: string; concluido_em: string | null; modulo: { pontos: number } | null }[]).map((a) => ({
    usuario_id: a.usuario_id,
    concluido_em: a.concluido_em,
    pontos: a.modulo?.pontos ?? 0,
  }))
  const noCiclo = (iso: string | null) => Boolean(ciclo && iso && iso.slice(0, 10) >= ciclo.inicio && iso.slice(0, 10) <= ciclo.fim)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Membros e desempenho">
        Quem está fazendo o quê{ciclo ? ` no ${ciclo.nome}` : ""}. Em ordem alfabética, sem ranking: a ideia é ninguém sumir,
        não competir. Pontos são só da Academia e só contam quando a comprovação é aprovada.
      </PageHeader>
      {erro ? (
        <ErroDados titulo="DESEMPENHO INDISPONÍVEL" erro={erro} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/044_organizacao_fase3.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse">
            <thead>
              <tr className="border-b border-linha-forte">
                <th className={th}>Membro</th>
                <th className={th}>Trilha</th>
                <th className={th}>Tarefas concluídas no ciclo</th>
                <th className={th}>Pontos no ciclo{ciclo ? ` / ${ciclo.meta_pontos}` : ""}</th>
                <th className={th}>Pontos validados (total)</th>
                <th className={th}>Agora</th>
              </tr>
            </thead>
            <tbody>
              {(pessoasR.data ?? []).map((p) => {
                const minhas = tarefas.filter((t) => t.responsavel_id === p.id)
                const doMembro = aprovadas.filter((a) => a.usuario_id === p.id)
                const ativas = minhas.filter((t) => t.estado !== "Concluída")
                const temPrincipal = ativas.some((t) => t.tipo === "principal")
                const temReserva = ativas.some((t) => t.tipo === "reserva")
                return (
                  <tr key={p.id} className="border-b border-linha">
                    <td className={td}>
                      <Link href={`/membros/diretorio/${p.id}`} className="font-sans text-sm hover:text-[var(--gear-amber)]">{p.nome_completo ?? "sem nome"}</Link>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{p.nivel_formacao}</p>
                    </td>
                    <td className={`${td} font-sans text-sm font-light`}>{p.frente ?? "ainda não escolheu"}</td>
                    <td className={`${td} font-mono text-sm tabular-nums`}>{ciclo ? minhas.filter((t) => t.estado === "Concluída" && noCiclo(t.concluida_em)).length : "—"}</td>
                    <td className={`${td} font-mono text-sm tabular-nums`}>{ciclo ? pontosNoCiclo(doMembro, ciclo) : "—"}</td>
                    <td className={`${td} font-mono text-sm tabular-nums`}>{doMembro.reduce((s, a) => s + a.pontos, 0)}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {temPrincipal ? <Pilula>principal</Pilula> : <Pilula tom="alerta">sem principal</Pilula>}
                        {temReserva ? <Pilula>reserva</Pilula> : <Pilula tom="alerta">sem reserva</Pilula>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
