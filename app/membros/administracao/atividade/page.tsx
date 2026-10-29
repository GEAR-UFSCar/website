import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { dataDoDia, diaGear, diasAtrasISO, hojeISO } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Atividade | GEAR",
  robots: { index: false, follow: false },
}

/** Sem sinal nenhum há mais que isto, a pessoa aparece como parada. */
const DIAS_PARADO = 30
const JANELA = 90

/**
 * Quem está ativo e quem sumiu: o último sinal de cada membro aprovado, juntando
 * diário de sprint, presença em evento, tarefa concluída e conclusão de módulo.
 * ponytail: olha só os últimos 90 dias e soma no servidor; se o grupo passar de
 * centenas de membros, trocar por uma view agregada no banco.
 */
export default async function AtividadePage() {
  const supabase = await createClient()
  const desde = diasAtrasISO(JANELA)
  const hoje = hojeISO()

  const [pessoasR, diarioR, chamadaR, tarefasR, progressoR] = await Promise.all([
    supabase.from("perfis").select("id, nome_completo, frente").eq("aprovado", true).order("nome_completo"),
    supabase.from("sprint_atualizacoes").select("autor_id, created_at").gte("created_at", desde),
    supabase.from("eventos_chamada").select("usuario_id, dia").gte("dia", desde.slice(0, 10)),
    supabase.from("sprint_tarefas").select("responsavel_id, feita, prazo").not("responsavel_id", "is", null),
    supabase.from("progresso").select("usuario_id, concluido_em").gte("concluido_em", desde),
  ])
  const erro = pessoasR.error ?? diarioR.error ?? chamadaR.error ?? tarefasR.error ?? progressoR.error

  const ultimo = new Map<string, string>()
  const marcar = (id: string | null, dia: string | null) => {
    if (!id || !dia) return
    if (!ultimo.has(id) || ultimo.get(id)! < dia) ultimo.set(id, dia)
  }
  for (const d of diarioR.data ?? []) marcar(d.autor_id, diaGear(d.created_at))
  for (const c of chamadaR.data ?? []) marcar(c.usuario_id, c.dia)
  for (const p of progressoR.data ?? []) marcar(p.usuario_id, p.concluido_em && diaGear(p.concluido_em))

  const abertas = new Map<string, { abertas: number; atrasadas: number }>()
  for (const t of tarefasR.data ?? []) {
    if (t.feita || !t.responsavel_id) continue
    const a = abertas.get(t.responsavel_id) ?? { abertas: 0, atrasadas: 0 }
    a.abertas++
    if (t.prazo && t.prazo < hoje) a.atrasadas++
    abertas.set(t.responsavel_id, a)
  }

  const limite = diaGear(diasAtrasISO(DIAS_PARADO))
  const linhas = (pessoasR.data ?? [])
    .map((p) => ({ ...p, ultimo: ultimo.get(p.id) ?? null, tarefas: abertas.get(p.id) ?? { abertas: 0, atrasadas: 0 } }))
    // mais tempo parado primeiro: é quem precisa de conversa
    .sort((a, b) => (a.ultimo ?? "").localeCompare(b.ultimo ?? ""))
  const parados = linhas.filter((l) => !l.ultimo || l.ultimo < limite).length

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Atividade">
        Último sinal de cada membro nos últimos {JANELA} dias: diário de sprint, presença em evento ou módulo concluído.
        {` ${parados} ${parados === 1 ? "pessoa está parada" : "pessoas estão paradas"} há mais de ${DIAS_PARADO} dias.`} É
        um indício para puxar conversa, não uma nota: quem trabalha sem registrar também aparece aqui.
      </PageHeader>

      {erro ? (
        <ErroDados titulo="ATIVIDADE INDISPONÍVEL" erro={erro} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code>.
        </ErroDados>
      ) : (
        <table className="mt-10 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-linha-forte">
              {["Membro", "Último sinal", "Tarefas abertas"].map((h) => (
                <th key={h} scope="col" className="py-3 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const parado = !l.ultimo || l.ultimo < limite
              return (
                <tr key={l.id} className="border-b border-linha">
                  <td className="py-3 pr-4">
                    <Link href={`/membros/diretorio/${l.id}`} className="font-sans text-sm hover:text-[var(--gear-amber)]">{l.nome_completo}</Link>
                    {l.frente && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{l.frente}</span>}
                  </td>
                  <td className={`py-3 pr-4 font-mono text-[11px] ${parado ? "text-[var(--gear-amber)]" : ""}`}>
                    {l.ultimo ? dataDoDia(l.ultimo) : `nada em ${JANELA} dias`}
                  </td>
                  <td className="py-3 font-mono text-[11px] tabular-nums">
                    {l.tarefas.abertas}
                    {l.tarefas.atrasadas > 0 && <span className="text-[var(--gear-amber)]"> · {l.tarefas.atrasadas} atrasada(s)</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
