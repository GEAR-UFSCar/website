import type { Metadata } from "next"

import { ChamadaForm, LancamentoForm, type EventoChamada } from "@/components/horas-gestao"
import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { agoraISO, dataDoDia, diaGear, diasAtrasISO, hojeISO } from "@/lib/datas"
import { ALERTA_PERCENTUAL, ALERTA_SEGUIDAS, duracaoSugerida, formatarHoras, frequencia, type Sessao } from "@/lib/horas"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Horas e presença | GEAR",
  robots: { index: false, follow: false },
}

export default async function HorasGestaoPage() {
  const user = await exigirUsuario()
  const supabase = await createClient()
  const desde = diasAtrasISO(120)

  const [eventosR, pessoasR, chamadasR, lancadasR, recentesChamadaR, recentesLancR, sessoesR, avisosR] = await Promise.all([
    // os recorrentes entram mesmo antigos: a reunião semanal começou há meses e continua valendo
    supabase
      .from("eventos")
      .select("id, titulo, tipo, data_inicio, data_fim")
      .or(`data_inicio.gte.${desde},recorrencia.not.is.null`)
      .lte("data_inicio", agoraISO())
      .order("data_inicio", { ascending: false }),
    supabase.from("perfis").select("id, nome_completo, frente, created_at").eq("aprovado", true).order("nome_completo"),
    supabase.from("eventos_chamada").select("usuario_id, horas"),
    supabase.from("horas_lancadas").select("usuario_id, horas"),
    // para corrigir engano: os registros mais novos, com quem e o quê
    supabase
      .from("eventos_chamada")
      .select("id, dia, horas, atividade, pessoa:perfis!eventos_chamada_usuario_id_fkey(nome_completo)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("horas_lancadas")
      .select("id, data, horas, descricao, pessoa:perfis!horas_lancadas_usuario_id_fkey(nome_completo)")
      .order("created_at", { ascending: false })
      .limit(30),
    // frequência: quem esteve em cada dia de evento com chamada, e quem avisou que não ia
    supabase
      .from("eventos_chamada")
      .select("evento_id, dia, usuario_id, atividade, evento:eventos(frente_vinculada)")
      .gte("dia", desde.slice(0, 10)),
    supabase.from("eventos_presencas").select("evento_id, dia, usuario_id").eq("resposta", "nao").gte("dia", desde.slice(0, 10)),
  ])
  type Recente = { id: string; tabela: "eventos_chamada" | "horas_lancadas"; dia: string; horas: number; texto: string; nome: string }
  const recentes: Recente[] = [
    ...((recentesChamadaR.data ?? []) as unknown as { id: string; dia: string; horas: number; atividade: string; pessoa: { nome_completo: string | null } | null }[]).map(
      (r) => ({ id: r.id, tabela: "eventos_chamada" as const, dia: r.dia, horas: Number(r.horas), texto: r.atividade, nome: r.pessoa?.nome_completo ?? "ex-membro" }),
    ),
    ...((recentesLancR.data ?? []) as unknown as { id: string; data: string; horas: number; descricao: string; pessoa: { nome_completo: string | null } | null }[]).map(
      (r) => ({ id: r.id, tabela: "horas_lancadas" as const, dia: r.data, horas: Number(r.horas), texto: r.descricao, nome: r.pessoa?.nome_completo ?? "ex-membro" }),
    ),
  ].sort((a, b) => b.dia.localeCompare(a.dia))

  const erro = eventosR.error ?? chamadasR.error ?? lancadasR.error ?? recentesChamadaR.error ?? sessoesR.error ?? avisosR.error
  const hoje = hojeISO()
  const eventos: EventoChamada[] = (eventosR.data ?? []).map((e) => ({
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    // evento único sugere o próprio dia; recorrente sugere hoje
    dia: e.data_inicio >= desde ? diaGear(e.data_inicio) : hoje,
    horas: duracaoSugerida(e.data_inicio, e.data_fim),
  }))
  const pessoas = pessoasR.data ?? []
  // a 033 proíbe dar horas a si mesmo; quem faz a chamada não aparece nos formulários
  const outros = pessoas.filter((p) => p.id !== user.id)

  // evento apagado (034) perde a frente: a sessão vira geral, chaveada pelo nome congelado
  const sessoes = new Map<string, Sessao>()
  for (const c of (sessoesR.data ?? []) as unknown as { evento_id: string | null; dia: string; usuario_id: string; atividade: string; evento: { frente_vinculada: string | null } | null }[]) {
    const chave = `${c.evento_id ?? c.atividade}|${c.dia}`
    const s = sessoes.get(chave) ?? { chave, dia: c.dia, frente: c.evento?.frente_vinculada ?? null, presentes: new Set<string>() }
    s.presentes.add(c.usuario_id)
    sessoes.set(chave, s)
  }
  const avisos = new Set((avisosR.data ?? []).map((a) => `${a.evento_id}|${a.dia}|${a.usuario_id}`))
  const frequencias = pessoas
    .map((p) => ({ p, f: frequencia({ id: p.id, frente: p.frente, desde: diaGear(p.created_at) }, [...sessoes.values()], avisos) }))
    .filter(({ f }) => f.esperadas > 0)
    .sort((a, b) => Number(b.f.alerta) - Number(a.f.alerta) || b.f.faltas / b.f.esperadas - a.f.faltas / a.f.esperadas)

  const totais = new Map<string, number>()
  for (const r of [...(chamadasR.data ?? []), ...(lancadasR.data ?? [])]) {
    totais.set(r.usuario_id, (totais.get(r.usuario_id) ?? 0) + Number(r.horas))
  }

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Horas e presença">
        Faça a chamada das reuniões e eventos e lance horas fora deles. Cada membro vê as próprias horas e gera a
        declaração em Minha frente › Horas.
      </PageHeader>

      {erro ? (
        <ErroDados titulo="HORAS INDISPONÍVEIS" erro={erro} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code> ou a{" "}
          <code>supabase/034_horas_sobrevivem_ao_evento.sql</code>.
        </ErroDados>
      ) : (
        <>
          <Secao titulo="Chamada">
            <ChamadaForm eventos={eventos} pessoas={outros} />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Você não aparece na lista: as suas horas são registradas por outra pessoa com cargo.
            </p>
          </Secao>

          <Recolhivel rotulo="Lançar horas avulsas" className="mt-10">
            <LancamentoForm pessoas={outros} />
          </Recolhivel>

          <Secao titulo="Registros recentes">
            {recentes.length === 0 ? (
              <p className="font-sans text-sm font-light text-muted-foreground">Nada registrado ainda.</p>
            ) : (
              <ul className="border border-linha">
                {recentes.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-linha px-5 py-3 last:border-b-0">
                    <span className="font-mono text-[11px] text-muted-foreground">{dataDoDia(r.dia)}</span>
                    <span className="flex-1 font-sans text-sm">
                      {r.nome}
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{r.texto}</span>
                    </span>
                    <span className="font-mono text-[11px] tabular-nums">{formatarHoras(r.horas)}</span>
                    <BotaoApagar tabela={r.tabela} id={r.id} descricao={`${formatarHoras(r.horas)} de ${r.nome} em ${dataDoDia(r.dia)}`} />
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Frequência">
            <p className="mb-4 max-w-[70ch] font-sans text-sm font-light text-muted-foreground">
              Últimos 120 dias, só nos dias em que houve chamada: sessões gerais e as da frente de cada um, desde a
              entrada. &ldquo;Não vou&rdquo; no calendário conta como aviso e não entra na sequência. Alerta com{" "}
              {ALERTA_SEGUIDAS} faltas seguidas sem aviso ou {ALERTA_PERCENTUAL * 100}% de faltas (doc. 35): converse
              antes de qualquer medida (doc. 27 art. 3). Quem fez a chamada só aparece presente se outra pessoa o
              registrou.
            </p>
            {frequencias.length === 0 ? (
              <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma chamada nos últimos 120 dias.</p>
            ) : (
              <ul className="border border-linha">
                {frequencias.map(({ p, f }) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-linha px-5 py-3 last:border-b-0">
                    <span className="flex-1 font-sans text-sm">
                      {p.nome_completo}
                      {f.alerta && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--gear-amber)]">alerta</span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {f.esperadas - f.faltas}/{f.esperadas} presenças
                      {f.faltas > 0 && ` · ${f.faltas} falta${f.faltas > 1 ? "s" : ""}`}
                      {f.avisadas > 0 && ` (${f.avisadas} com aviso)`}
                      {f.seguidas > 0 && ` · ${f.seguidas} seguida${f.seguidas > 1 ? "s" : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Total por membro">
            <ul className="border border-linha">
              {[...pessoas]
                .sort((a, b) => (totais.get(b.id) ?? 0) - (totais.get(a.id) ?? 0))
                .map((p) => (
                  <li key={p.id} className="flex justify-between border-b border-linha px-5 py-3 last:border-b-0">
                    <span className="font-sans text-sm">{p.nome_completo}</span>
                    <span className="font-mono text-[11px] tabular-nums">{formatarHoras(totais.get(p.id) ?? 0)}</span>
                  </li>
                ))}
            </ul>
          </Secao>
        </>
      )}
    </section>
  )
}
