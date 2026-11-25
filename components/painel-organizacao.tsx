import Link from "next/link"

import { Pilula } from "@/components/membros/pilula"
import { alertasDe, pontosNoCiclo, type Alerta } from "@/lib/alertas"
import { eDiretoria, eFinanceiro, eRevisor } from "@/lib/administracao"
import { dataDoDia, hojeISO } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import type { Perfil } from "@/lib/supabase/sessao"
import { TOM_DO_ESTADO, atrasada, type EstadoTarefa } from "@/lib/tarefas"

const caixa = "bg-[var(--gear-navy)] p-5"
const rotulo = "font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--gear-amber)]"

type MinhaTarefa = { id: string; titulo: string; estado: EstadoTarefa; prazo: string | null; tipo: string | null; bloqueada: boolean }

/**
 * O topo do painel (044): minha principal e minha reserva, Academia no ciclo
 * atual e os alertas que me envolvem. Cada consulta que falhar (migração que
 * falta) some o bloco dela em vez de derrubar a página.
 */
export async function PainelOrganizacao({ usuarioId, perfil }: { usuarioId: string; perfil: Perfil | null }) {
  const supabase = await createClient()
  const hoje = hojeISO()
  const [tarefasR, cicloR, aprovadasR, abertasR, alertasR] = await Promise.all([
    supabase.from("sprint_tarefas").select("id, titulo, estado, prazo, tipo, bloqueada").eq("responsavel_id", usuarioId).not("tipo", "is", null).neq("estado", "Concluída"),
    supabase.from("ciclos").select("id, nome, inicio, fim, meta_pontos").lte("inicio", hoje).gte("fim", hoje).order("inicio", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("progresso").select("concluido_em, modulo:modulos (pontos)").eq("usuario_id", usuarioId).eq("estado", "Aprovada"),
    supabase.from("progresso").select("estado").eq("usuario_id", usuarioId).in("estado", ["Enviada", "Em revisão", "Ajustes"]),
    supabase.from("alertas").select("*"),
  ])
  if (tarefasR.error && alertasR.error) return null

  const tarefas = (tarefasR.data ?? []) as MinhaTarefa[]
  const principal = tarefas.find((t) => t.tipo === "principal")
  const reserva = tarefas.find((t) => t.tipo === "reserva")
  const ciclo = cicloR.data
  const aprovadas = ((aprovadasR.data ?? []) as unknown as { concluido_em: string | null; modulo: { pontos: number } | null }[]).map((a) => ({
    concluido_em: a.concluido_em,
    pontos: a.modulo?.pontos ?? 0,
  }))
  const noCiclo = pontosNoCiclo(aprovadas, ciclo ?? null)
  const abertas = abertasR.data ?? []
  const alertas = alertasDe((alertasR.data ?? []) as Alerta[], { usuarioId, revisor: eRevisor(perfil), financeiro: eFinanceiro(perfil?.cargo), diretoria: eDiretoria(perfil?.cargo) })

  const cartaoTarefa = (nome: string, t?: MinhaTarefa) => (
    <div className={caixa}>
      <p className={rotulo}>{nome}</p>
      {t ? (
        <Link href="/membros/tarefas" className="mt-2 block hover:text-[var(--gear-amber)]">
          <span className="font-sans text-base">{t.titulo}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <Pilula tom={TOM_DO_ESTADO[t.estado]}>{t.estado}</Pilula>
            {t.bloqueada && <Pilula tom="alerta">Bloqueada</Pilula>}
            {t.prazo && (
              <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${atrasada(t, hoje) ? "text-[var(--gear-amber)]" : "text-muted-foreground"}`}>
                {atrasada(t, hoje) ? "atrasada · " : "prazo "}{dataDoDia(t.prazo)}
              </span>
            )}
          </span>
        </Link>
      ) : (
        <Link href="/membros/pautas" className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gear-amber)] hover:underline">
          Nenhuma. Assumir uma pauta →
        </Link>
      )}
    </div>
  )

  return (
    <div className="mt-8 space-y-px">
      <div className="grid grid-cols-1 gap-px border border-linha bg-linha md:grid-cols-3">
        {cartaoTarefa("Minha tarefa principal", principal)}
        {cartaoTarefa("Minha tarefa de reserva", reserva)}
        <div className={caixa}>
          <p className={rotulo}>Academia {ciclo ? `· ${ciclo.nome}` : ""}</p>
          {ciclo ? (
            <>
              <p className="mt-2 font-mono text-2xl tabular-nums">
                {noCiclo}
                <span className="text-sm text-muted-foreground"> / {ciclo.meta_pontos} pts</span>
              </p>
              <div className="mt-2 h-1.5 bg-white/10" aria-hidden="true">
                <div className="h-full bg-[var(--gear-amber)]" style={{ width: `${ciclo.meta_pontos ? Math.min(100, (noCiclo / ciclo.meta_pontos) * 100) : 0}%` }} />
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                até {dataDoDia(ciclo.fim)} · só conta aprovada
              </p>
            </>
          ) : (
            <p className="mt-2 font-sans text-sm font-light text-muted-foreground">Nenhum ciclo em andamento.</p>
          )}
          {abertas.length > 0 && (
            <Link href="/membros/aprendizagem" className="mt-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--gear-amber)] hover:underline">
              {abertas.length} comprovação(ões) em revisão ou ajustes →
            </Link>
          )}
        </div>
      </div>

      {alertas.length > 0 && (
        <ul aria-label="Alertas que envolvem você" className="border border-[var(--gear-amber)]">
          {alertas.map((a, i) => (
            <li key={`${a.tipo}-${i}`} className="border-b border-linha last:border-b-0">
              <Link href={a.href} className="flex flex-wrap items-baseline gap-x-3 px-5 py-3 hover:bg-[var(--gear-navy)]">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)]">{a.titulo}</span>
                {a.detalhe && <span className="flex-1 font-sans text-sm font-light">{a.detalhe}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
