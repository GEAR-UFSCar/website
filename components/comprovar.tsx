"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { acaoAmbar, acaoDiscreta } from "@/components/tarefa-item"
import { podeEnviarComprovacao, type Comprovacao, type Modulo } from "@/lib/academia"
import { mensagemSegura } from "@/lib/erros"
import { createClient } from "@/lib/supabase/client"
import { campoBase } from "@/lib/ui"

/** Envio (e reenvio) da evidência de uma competência (043). */
export function Comprovar({ competencia, atual }: { competencia: Modulo; atual?: Comprovacao }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [link, setLink] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async () => {
    setErro(null)
    setOcupado(true)
    const { error } = await createClient().rpc("enviar_comprovacao", { competencia: competencia.id, evidencia: link })
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    setAberto(false)
    setLink("")
    router.refresh()
  }

  return (
    <div className="mt-3">
      {atual?.comentario && atual.estado === "Ajustes" && (
        <p className="mb-2 border-l-2 border-[var(--gear-amber)] pl-2 font-sans text-xs font-light">Revisor: {atual.comentario}</p>
      )}
      {atual?.evidencia_url && (
        <a href={atual.evidencia_url} target="_blank" rel="noopener noreferrer" className="mb-2 block break-all font-mono text-[11px] text-muted-foreground underline underline-offset-4">
          Sua evidência ↗
        </a>
      )}
      {podeEnviarComprovacao(atual?.estado) && !aberto && (
        <button type="button" onClick={() => setAberto(true)} className={acaoAmbar}>
          {atual?.estado ? "Reenviar comprovação" : "Enviar comprovação"}
        </button>
      )}
      {aberto && (
        <form onSubmit={(e) => { e.preventDefault(); void enviar() }} className="grid gap-2">
          <label htmlFor={`ev-${competencia.id}`} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Link da evidência (repositório, vídeo ou relatório)
          </label>
          <input id={`ev-${competencia.id}`} type="url" required maxLength={2000} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} className={campoBase} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || !link.trim()} className={acaoAmbar}>Enviar</button>
            <button type="button" onClick={() => setAberto(false)} className={acaoDiscreta}>Cancelar</button>
          </div>
        </form>
      )}
      {erro && <p role="alert" className="mt-2 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
