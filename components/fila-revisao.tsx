"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Pilula } from "@/components/membros/pilula"
import { acaoAmbar, acaoDiscreta } from "@/components/tarefa-item"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase } from "@/lib/ui"
import { atrasadoNaFila, horasNaFila, podeRevisar, type ItemFila } from "@/lib/revisao"

type Props = {
  itens: ItemFila[]
  nomes: Record<string, string>
  usuarioId: string
  revisor: boolean
  /** Instante do servidor, para tela e hidratação concordarem nas horas. */
  agora: number
}

const RPC = {
  tarefa: { pegar: "pegar_tarefa_para_revisar", revisar: "revisar_tarefa", chave: "tarefa" },
  comprovacao: { pegar: "pegar_comprovacao", revisar: "revisar_comprovacao", chave: "comprovacao" },
} as const

/** Tarefas e comprovações em revisão, a mais antiga primeiro (043). */
export function FilaRevisao({ itens, nomes, usuarioId, revisor, agora }: Props) {
  if (itens.length === 0) {
    return <p className="mt-10 font-sans text-sm font-light text-muted-foreground">Fila vazia. Ninguém está esperando revisão.</p>
  }
  return (
    <ol className="mt-8 space-y-3">
      {itens.map((i) => (
        <Item key={`${i.tipo}-${i.id}`} item={i} nomes={nomes} usuarioId={usuarioId} revisor={revisor} agora={agora} />
      ))}
    </ol>
  )
}

function Item({ item: i, nomes, usuarioId, revisor, agora }: { item: ItemFila } & Omit<Props, "itens">) {
  const router = useRouter()
  const [ajustes, setAjustes] = useState(false)
  const [nota, setNota] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const rpc = RPC[i.tipo]
  const atrasado = atrasadoNaFila(i, agora)
  const pode = podeRevisar(i, usuarioId, revisor, agora)
  const meu = i.revisor_id === usuarioId

  const chamar = async (fn: string, extra: Record<string, unknown> = {}) => {
    setErro(null)
    setOcupado(true)
    const { error } = await createClient().rpc(fn, { [rpc.chave]: i.id, ...extra })
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    setAjustes(false)
    router.refresh()
  }

  return (
    <li className={`border p-4 ${atrasado ? "border-[var(--gear-amber)] bg-[var(--gear-navy)]" : "border-linha bg-[var(--gear-navy)]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Pilula>{i.tipo === "tarefa" ? "Tarefa" : "Academia"}</Pilula>
        {atrasado && <Pilula tom="alerta">{horasNaFila(i.enviada_em, agora)} h na fila</Pilula>}
        {!atrasado && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">há {horasNaFila(i.enviada_em, agora)} h</span>}
      </div>
      <h2 className="mt-2 font-sans text-base">{i.titulo}</h2>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        de {(i.autor_id && nomes[i.autor_id]) ?? "?"}
        {i.pontos != null && ` · ${i.pontos} pts`}
        {i.rodadas_ajustes > 0 && ` · ${i.rodadas_ajustes} rodada(s) de ajustes`}
        {i.revisor_id && ` · com ${meu ? "você" : (nomes[i.revisor_id] ?? "outra pessoa")}`}
      </p>
      {i.contexto && (
        <p className="mt-2 font-sans text-xs font-light text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em]">{i.tipo === "tarefa" ? "Projeto · " : "Aceite quando · "}</span>
          {i.contexto}
        </p>
      )}
      {i.evidencia_url && (
        <a href={i.evidencia_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
          Evidência ↗
        </a>
      )}

      {pode && !ajustes && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!meu && <button type="button" disabled={ocupado} onClick={() => void chamar(rpc.pegar)} className={acaoDiscreta}>Pegar</button>}
          <button type="button" disabled={ocupado} onClick={() => void chamar(rpc.revisar, { aprovar: true, comentario: null })} className={acaoAmbar}>Aprovar</button>
          <button type="button" disabled={ocupado} onClick={() => setAjustes(true)} className={acaoDiscreta}>Pedir ajustes</button>
        </div>
      )}
      {ajustes && (
        <form onSubmit={(e) => { e.preventDefault(); void chamar(rpc.revisar, { aprovar: false, comentario: nota }) }} className="mt-3 grid gap-2">
          <label htmlFor={`nota-${i.id}`} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">O que precisa ajustar</label>
          <textarea id={`nota-${i.id}`} required rows={3} maxLength={2000} value={nota} onChange={(e) => setNota(e.target.value)} className={campoBase} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || !nota.trim()} className={acaoAmbar}>Pedir ajustes</button>
            <button type="button" onClick={() => setAjustes(false)} className={acaoDiscreta}>Cancelar</button>
          </div>
        </form>
      )}
      {!pode && revisor && i.autor_id === usuarioId && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">É seu: outra pessoa revisa.</p>
      )}
      {erro && <p role="alert" className="mt-2 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </li>
  )
}
