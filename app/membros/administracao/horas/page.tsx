import type { Metadata } from "next"

import { ChamadaForm, LancamentoForm, type EventoChamada } from "@/components/horas-gestao"
import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { agoraISO, diaGear, diasAtrasISO, hojeISO } from "@/lib/datas"
import { duracaoSugerida, formatarHoras } from "@/lib/horas"
import { createClient } from "@/lib/supabase/server"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Horas e presença | GEAR",
  robots: { index: false, follow: false },
}

export default async function HorasGestaoPage() {
  const supabase = await createClient()
  const desde = diasAtrasISO(120)

  const [eventosR, pessoasR, chamadasR, lancadasR] = await Promise.all([
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
  ])

  const erro = eventosR.error ?? chamadasR.error ?? lancadasR.error
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
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code>.
        </ErroDados>
      ) : (
        <>
          <Secao titulo="Chamada">
            <ChamadaForm eventos={eventos} pessoas={pessoas} />
          </Secao>

          <Recolhivel rotulo="Lançar horas avulsas" className="mt-10">
            <LancamentoForm pessoas={pessoas} />
          </Recolhivel>

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
