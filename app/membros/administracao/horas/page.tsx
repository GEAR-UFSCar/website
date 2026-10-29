import type { Metadata } from "next"

import { ChamadaForm, LancamentoForm, type EventoChamada } from "@/components/horas-gestao"
import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { agoraISO, dataDoDia, diaGear, diasAtrasISO, hojeISO } from "@/lib/datas"
import { duracaoSugerida, formatarHoras } from "@/lib/horas"
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

  const [eventosR, pessoasR, chamadasR, lancadasR, recentesChamadaR, recentesLancR] = await Promise.all([
    // os recorrentes entram mesmo antigos: a reunião semanal começou há meses e continua valendo
    supabase
      .from("eventos")
      .select("id, titulo, tipo, data_inicio, data_fim")
      .or(`data_inicio.gte.${desde},recorrencia.not.is.null`)
      .lte("data_inicio", agoraISO())
      .order("data_inicio", { ascending: false }),
    supabase.from("perfis").select("id, nome_completo").eq("aprovado", true).order("nome_completo"),
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

  const erro = eventosR.error ?? chamadasR.error ?? lancadasR.error ?? recentesChamadaR.error
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
