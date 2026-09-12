"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

/** Alterna o destaque de um aviso. Só renderizado para quem tem cargo. */
export function MuralFixar({ id, fixado }: { id: string; fixado: boolean }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const alternar = async () => {
    setErro(null)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("avisos")
      .update({ fixado: !fixado })
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
    <div className="shrink-0">
      <button
        type="button"
        onClick={alternar}
        disabled={salvando}
        aria-pressed={fixado}
        data-cursor-hover
        className={`border px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 ${
          fixado
            ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
            : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        {fixado ? "Desafixar" : "Fixar"}
      </button>

      {erro && (
        <p role="alert" className="mt-1 max-w-[18rem] font-mono text-[9px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
