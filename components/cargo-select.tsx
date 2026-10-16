"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { CARGOS } from "@/lib/administracao"
import { selectInline } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

const botaoBase =
  "inline-flex min-h-9 items-center border px-3 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"

const rotulo = (cargo: string | null) => cargo || "sem cargo"

/**
 * Troca o cargo de um membro. Escolher na lista NÃO grava mais na hora:
 * aparece "De X para Y? Confirmar / Cancelar". Antes o onChange salvava
 * direto, e uma rolagem do mouse em cima do select (ou um toque errado no
 * celular) tirava o cargo de alguém — inclusive o de Presidente.
 */
export function CargoSelect({ perfilId, valor }: { perfilId: string; valor: string | null }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  /** Cargo escolhido e ainda não confirmado. `undefined` = nada pendente. */
  const [pendente, setPendente] = useState<string | null | undefined>(undefined)

  const confirmar = async () => {
    if (pendente === undefined) return
    setErro(null)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("perfis")
      .update({ cargo: pendente })
      .eq("id", perfilId)
      .select("id")

    setPendente(undefined)

    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return
    }

    iniciar(() => router.refresh())
  }

  const escolhido = pendente === undefined ? valor : pendente

  return (
    <div>
      <select
        value={escolhido ?? ""}
        disabled={salvando}
        onChange={(e) => {
          const novo = e.target.value === "" ? null : e.target.value
          setErro(null)
          setPendente(novo === valor ? undefined : novo)
        }}
        aria-label="Cargo do membro"
        className={selectInline}
      >
        <option value="" className="bg-[var(--gear-ink)]">— sem cargo —</option>
        {CARGOS.map((c) => (
          <option key={c} value={c} className="bg-[var(--gear-ink)]">{c}</option>
        ))}
      </select>

      {pendente !== undefined && (
        <div role="group" aria-label="Confirmar troca de cargo" className="mt-2 flex max-w-[20rem] flex-col gap-2">
          <p className="font-mono text-[10px] md:text-[9px] leading-snug tracking-[0.1em] text-foreground">
            De <strong>{rotulo(valor)}</strong> para <strong>{rotulo(pendente)}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={salvando}
              data-cursor-hover
              className={`${botaoBase} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setPendente(undefined)}
              disabled={salvando}
              data-cursor-hover
              className={`${botaoBase} border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erro && <p role="alert" className="mt-1 max-w-[18rem] font-mono text-[10px] md:text-[9px] leading-snug text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
