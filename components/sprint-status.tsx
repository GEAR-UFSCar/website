"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { STATUS_SPRINT } from "@/lib/administracao"
import { selectInline } from "@/lib/ui"

/** Select inline que grava assim que o valor muda. Só para quem tem cargo. */
export function SprintStatus({ id, valor, usuarioId }: { id: string; valor: string; usuarioId: string }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const mudar = async (novo: string) => {
    setErro(null)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("sprints")
      // updated_at é do trigger; a autoria tem de vir daqui
      .update({ status: novo, atualizado_por: usuarioId })
      .eq("id", id)
      .select("id")

    if (error) {
      setErro(error.message)
      return
    }
    // update sem erro e sem linha afetada = a política de acesso recusou
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
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
        aria-label="Status do sprint"
        className={selectInline}
      >
        {STATUS_SPRINT.map((s) => (
          <option key={s} value={s} className="bg-[var(--gear-ink)]">
            {s}
          </option>
        ))}
      </select>
      {erro && (
        <p role="alert" className="mt-1 font-mono text-[10px] md:text-[9px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
