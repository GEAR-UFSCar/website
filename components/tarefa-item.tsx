import { useState } from "react"

import { Pilula } from "@/components/membros/pilula"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { dataDoDia, diaGear, hojeISO } from "@/lib/datas"
import { campoBase } from "@/lib/ui"
import { TOM_DO_ESTADO, acoesDaTarefa, atrasada, type QuemVe, type Tarefa } from "@/lib/tarefas"

export const acaoTarefa =
  "inline-flex min-h-11 items-center border px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 md:min-h-0"
export const acaoAmbar = `${acaoTarefa} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`
export const acaoDiscreta = `${acaoTarefa} border-linha-forte text-muted-foreground hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]`

type Aberto = "enviar" | "ajustes" | "bloquear" | "assumir" | null

/**
 * Uma tarefa com os botões que o banco aceita para quem está vendo (042/044).
 * Só é importado por Client Components, por isso não leva "use client":
 * assumir (principal ou reserva, sem aprovação), marcar/tirar bloqueio com
 * motivo, trocar principal/reserva, enviar para revisão com evidência, e o
 * revisor (que não é o responsável) aprova ou pede ajustes.
 */
export function TarefaItem({
  tarefa: t,
  quem,
  mostrarProjeto = false,
  aoMudar,
}: {
  tarefa: Tarefa
  quem: QuemVe
  mostrarProjeto?: boolean
  aoMudar: () => void
}) {
  const [aberto, setAberto] = useState<Aberto>(null)
  const [texto, setTexto] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const acoes = acoesDaTarefa(t, quem)

  const executar = async (fn: () => PromiseLike<{ error: { code?: string; message: string } | null }>) => {
    setErro(null)
    setOcupado(true)
    const { error } = await fn()
    setOcupado(false)
    if (error) {
      setErro(mensagemSegura(error))
      // tarefa tomada por outra pessoa no meio do caminho: relê para mostrar quem é
      if (error.code === "GE018") aoMudar()
      return
    }
    setAberto(null)
    setTexto("")
    aoMudar()
  }

  const db = createClient()
  const rpc = (fn: string, args: Record<string, unknown>) => executar(() => db.rpc(fn, { tarefa: t.id, ...args }))
  const apagar = () => {
    if (window.confirm(`Apagar a tarefa "${t.titulo}"?`)) void executar(() => db.from("sprint_tarefas").delete().eq("id", t.id))
  }
  const enviarFormulario = () => {
    if (aberto === "enviar") return rpc("enviar_tarefa_para_revisao", { evidencia: texto })
    if (aberto === "ajustes") return rpc("revisar_tarefa", { aprovar: false, comentario: texto })
    if (aberto === "bloquear") return rpc("marcar_bloqueio", { motivo: texto })
  }

  const dono = t.responsavel?.nome_completo?.trim()
  const concluida = t.estado === "Concluída"
  const vencida = atrasada(t, hojeISO())
  const diasBloqueada = t.bloqueada_em ? Math.floor((Date.parse(`${hojeISO()}T12:00:00Z`) - Date.parse(`${diaGear(t.bloqueada_em)}T12:00:00Z`)) / 864e5) : 0

  return (
    <li className={`border bg-[var(--gear-ink)] p-3 ${t.bloqueada ? "border-[var(--gear-amber)]" : "border-linha"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={`flex-1 font-sans text-sm ${concluida ? "text-muted-foreground line-through" : ""}`}>{t.titulo}</p>
        <div className="flex flex-wrap gap-1">
          {t.tipo && !concluida && <Pilula>{t.tipo}</Pilula>}
          {t.bloqueada && <Pilula tom="alerta">Bloqueada</Pilula>}
          <Pilula tom={TOM_DO_ESTADO[t.estado]}>{t.estado}</Pilula>
        </div>
      </div>

      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {dono ?? "sem responsável · pauta aberta"}
        {t.prazo && (
          <span className={vencida ? "text-[var(--gear-amber)]" : ""}>
            {" · "}
            {vencida ? "atrasada · " : ""}
            {dataDoDia(t.prazo)}
          </span>
        )}
        {mostrarProjeto && <span> · {t.sprint?.titulo ?? "sem projeto"}</span>}
        {(t.nivel || t.area) && <span> · {[t.nivel, t.area].filter(Boolean).join(" · ")}</span>}
        {t.rodadas_ajustes > 0 && <span> · {t.rodadas_ajustes} rodada(s) de ajustes</span>}
      </p>

      {t.bloqueada && (
        <p className="mt-2 border-l-2 border-[var(--gear-amber)] pl-2 font-sans text-xs font-light">
          Bloqueada{diasBloqueada > 0 ? ` há ${diasBloqueada} dia(s)` : " hoje"}: {t.motivo_bloqueio}
          {diasBloqueada > 2 && " · passe para a sua tarefa de reserva enquanto isso."}
        </p>
      )}
      {t.pronto_quando && (
        <p className="mt-2 font-sans text-xs font-light text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em]">Pronto quando · </span>
          {t.pronto_quando}
        </p>
      )}
      {t.roteiro && (
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-[var(--gear-amber)]">Primeiros passos</summary>
          <p className="mt-1 whitespace-pre-line font-sans text-xs font-light">{t.roteiro}</p>
        </details>
      )}
      {t.evidencia_url && (
        <a href={t.evidencia_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
          Evidência ↗
        </a>
      )}
      {t.comentario_revisao && (
        <p className="mt-2 border-l-2 border-[var(--gear-amber)] pl-2 font-sans text-xs font-light">
          {t.revisor?.nome_completo?.split(" ")[0] ?? "Revisor"}: {t.comentario_revisao}
        </p>
      )}

      {!aberto && (
        <div className="mt-3 flex flex-wrap gap-2">
          {acoes.assumir && (
            <button type="button" disabled={ocupado} onClick={() => setAberto("assumir")} className={acaoAmbar}>Assumir</button>
          )}
          {acoes.enviar && (
            <button type="button" disabled={ocupado} onClick={() => setAberto("enviar")} className={acaoAmbar}>Enviar para revisão</button>
          )}
          {acoes.revisar && (
            <>
              <button type="button" disabled={ocupado} onClick={() => void rpc("revisar_tarefa", { aprovar: true, comentario: null })} className={acaoAmbar}>Aprovar</button>
              <button type="button" disabled={ocupado} onClick={() => setAberto("ajustes")} className={acaoDiscreta}>Pedir ajustes</button>
            </>
          )}
          {acoes.bloquear && (
            <button type="button" disabled={ocupado} onClick={() => setAberto("bloquear")} className={acaoDiscreta}>Marcar bloqueio</button>
          )}
          {acoes.desbloquear && (
            <button type="button" disabled={ocupado} onClick={() => void rpc("tirar_bloqueio", {})} className={acaoDiscreta}>Tirar bloqueio</button>
          )}
          {acoes.tipo && t.tipo !== "principal" && (
            <button type="button" disabled={ocupado} onClick={() => void rpc("definir_tipo_tarefa", { tipo: "principal" })} className={acaoDiscreta}>Tornar principal</button>
          )}
          {acoes.tipo && t.tipo !== "reserva" && (
            <button type="button" disabled={ocupado} onClick={() => void rpc("definir_tipo_tarefa", { tipo: "reserva" })} className={acaoDiscreta}>Tornar reserva</button>
          )}
          {acoes.editar && (
            <button type="button" disabled={ocupado} onClick={apagar} aria-label={`Apagar tarefa "${t.titulo}"`} className={acaoDiscreta}>Apagar</button>
          )}
        </div>
      )}

      {aberto === "assumir" && (
        <div role="group" aria-label="Assumir como" className="mt-3 grid gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Esta vai ser sua tarefa…</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={ocupado} onClick={() => void rpc("assumir_tarefa", { tipo: "principal" })} className={acaoAmbar}>Principal</button>
            <button type="button" disabled={ocupado} onClick={() => void rpc("assumir_tarefa", { tipo: "reserva" })} className={acaoAmbar}>De reserva</button>
            <button type="button" onClick={() => setAberto(null)} className={acaoDiscreta}>Cancelar</button>
          </div>
        </div>
      )}

      {(aberto === "enviar" || aberto === "ajustes" || aberto === "bloquear") && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void enviarFormulario()
          }}
          className="mt-3 grid gap-2"
        >
          <label htmlFor={`txt-${t.id}`} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {aberto === "enviar" ? "Link da evidência (repositório, vídeo ou relatório)" : aberto === "ajustes" ? "O que precisa ajustar" : "O que está bloqueando"}
          </label>
          {aberto === "enviar" ? (
            <input id={`txt-${t.id}`} type="url" required maxLength={2000} placeholder="https://" value={texto} onChange={(e) => setTexto(e.target.value)} className={campoBase} />
          ) : (
            <textarea id={`txt-${t.id}`} required maxLength={aberto === "bloquear" ? 500 : 2000} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} className={campoBase} />
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || !texto.trim()} className={acaoAmbar}>
              {aberto === "enviar" ? "Enviar" : aberto === "ajustes" ? "Pedir ajustes" : "Marcar bloqueio"}
            </button>
            <button type="button" onClick={() => setAberto(null)} className={acaoDiscreta}>Cancelar</button>
          </div>
        </form>
      )}

      {erro && <p role="alert" className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">{erro}</p>}
    </li>
  )
}
