"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

/**
 * Aprova ou revoga um membro. Só renderizado para a diretoria — e o trigger
 * guardar_cargo() (014) é quem barra de fato, inclusive a tentativa de alguém
 * mexer na própria aprovação.
 */
export function AprovacaoToggle({
  perfilId,
  aprovado,
  ehVoce,
}: {
  perfilId: string
  aprovado: boolean
  /** Ninguém altera a própria aprovação; o banco recusa e o botão nem aparece. */
  ehVoce: boolean
}) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  if (ehVoce) {
    return (
      <span className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
        {aprovado ? "Aprovado" : "Pendente"} · você
      </span>
    )
  }

  const alternar = async () => {
    setErro(null)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("perfis")
      .update({ aprovado: !aprovado })
      .eq("id", perfilId)
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
      <button
        type="button"
        onClick={alternar}
        disabled={salvando}
        aria-pressed={aprovado}
        data-cursor-hover
        className={`inline-flex min-h-11 items-center border px-4 py-2.5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 ${
          aprovado
            ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
            : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        {aprovado ? "Aprovado" : "Aprovar"}
      </button>

      {erro && (
        <p
          role="alert"
          className="mt-1 max-w-[18rem] font-mono text-[10px] md:text-[9px] leading-snug text-[var(--gear-amber)]"
        >
          {erro}
        </p>
      )}
    </div>
  )
}
