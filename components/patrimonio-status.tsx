"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { STATUS } from "@/lib/administracao"
import { selectInline } from "@/lib/ui"

/** Select inline que grava assim que o valor muda. */
export function PatrimonioStatus({ id, valor }: { id: string; valor: string }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const mudar = async (novo: string) => {
    setErro(null)
    const supabase = createClient()
    const { error } = await supabase.from("patrimonio").update({ status: novo }).eq("id", id)
    if (error) {
      setErro(error.message)
      return
    }
    iniciar(() => router.refresh())
  }

  return (
    <div>
      <select
        value={valor}
        disabled={salvando}
        onChange={(e) => mudar(e.target.value)}
        aria-label="Status do item"
        className={selectInline}
      >
        {STATUS.map((s) => (
          <option key={s} value={s} className="bg-[var(--gear-ink)]">
            {s}
          </option>
        ))}
      </select>
      {erro && <p className="mt-1 font-mono text-[10px] md:text-[9px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
