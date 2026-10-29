"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase } from "@/lib/ui"

const botao = "min-h-11 border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 disabled:opacity-50"

/** Aprovar (ou dar ciência) e devolver com nota. O banco recusa se for o próprio autor (035). */
export function RegistroDecisao({ id, rotulo }: { id: string; rotulo: string }) {
  const router = useRouter()
  const [nota, setNota] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const decidir = async (status: "aprovado" | "devolvido") => {
    if (status === "devolvido" && !nota.trim()) return setErro("Diga o que corrigir antes de devolver.")
    setErro(null)
    setOcupado(true)
    const { data, error } = await createClient()
      .from("registros")
      .update({ status, decisao_nota: nota.trim() || null })
      .eq("id", id)
      .select("id")
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nada mudou, a política de acesso recusou.")
    router.refresh()
  }

  return (
    <div className="nao-imprimir border border-[var(--gear-amber)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gear-amber)]">Aguardando {rotulo}</p>
      <label htmlFor={`nota-${id}`} className="sr-only">Nota da decisão</label>
      <textarea id={`nota-${id}`} rows={2} maxLength={2000} placeholder="Nota (obrigatória para devolver)" value={nota} onChange={(e) => setNota(e.target.value)} className={`${campoBase} mt-3 resize-y`} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={ocupado} onClick={() => decidir("aprovado")} className={`${botao} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>
          Aprovar
        </button>
        <button type="button" disabled={ocupado} onClick={() => decidir("devolvido")} className={`${botao} border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground`}>
          Devolver para correção
        </button>
      </div>
      {erro && <p role="alert" className="mt-2 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
