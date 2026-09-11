"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { CARGOS } from "@/lib/administracao"

export function CargoSelect({ perfilId, valor }: { perfilId: string; valor: string | null }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const mudar = async (novo: string) => {
    setErro(null)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("perfis")
      .update({ cargo: novo === "" ? null : novo })
      .eq("id", perfilId)
      .select("id")

    if (error) {
      setErro(error.message)
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return
    }

    iniciar(() => router.refresh())
  }

  return (
    <div>
      <select
        value={valor ?? ""}
        disabled={salvando}
        onChange={(e) => mudar(e.target.value)}
        aria-label="Cargo do membro"
        className="w-full bg-transparent border border-white/15 px-2 py-1.5 font-mono text-[11px] text-foreground outline-none transition-colors duration-300 focus:border-[var(--gear-amber)] disabled:opacity-50"
      >
        <option value="" className="bg-[var(--gear-ink)]">— sem cargo —</option>
        {CARGOS.map((c) => (
          <option key={c} value={c} className="bg-[var(--gear-ink)]">{c}</option>
        ))}
      </select>
      {erro && <p role="alert" className="mt-1 font-mono text-[9px] leading-snug text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
