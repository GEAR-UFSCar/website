"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { campoBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

/**
 * Campo de progresso que grava ao sair do campo. Só para quem pode editar o
 * sprint — espelha pode_editar_sprint() (021).
 *
 * Grava no `blur` e não a cada tecla: digitar "100" passa por "1" e por "10",
 * e gravar os três produziria duas escritas erradas e um `router.refresh()`
 * por dígito. Irmão de components/sprint-status.tsx, que grava no change
 * porque select não tem estado intermediário.
 */
export function SprintProgresso({ id, valor }: { id: string; valor: number }) {
  const router = useRouter()
  const [rascunho, setRascunho] = useState(String(valor))
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const gravar = async () => {
    setErro(null)

    /*
     * Campo esvaziado volta ao valor do banco em vez de virar 0: apagar para
     * redigitar é acidente comum, e zerar o progresso de alguém por causa
     * disso é perda de dado silenciosa.
     */
    if (rascunho.trim() === "") {
      setRascunho(String(valor))
      return
    }

    // O CHECK de 021 já recusa fora de 0–100; prender aqui evita a ida à rede
    // só para receber 23514 de volta.
    const numero = Math.min(100, Math.max(0, Math.round(Number(rascunho))))
    if (!Number.isFinite(numero)) {
      setRascunho(String(valor))
      return
    }

    setRascunho(String(numero))
    if (numero === valor) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from("sprints")
      .update({ progresso: numero })
      .eq("id", id)
      .select("id")

    if (error) {
      setErro(mensagemSegura(error))
      setRascunho(String(valor))
      return
    }
    // update sem erro e sem linha afetada = a política de acesso recusou
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      setRascunho(String(valor))
      return
    }

    iniciar(() => router.refresh())
  }

  return (
    <div>
      <label htmlFor={`progresso-${id}`} className="sr-only">
        Progresso do sprint, de 0 a 100 por cento
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`progresso-${id}`}
          type="number"
          min={0}
          max={100}
          step={5}
          inputMode="numeric"
          value={rascunho}
          disabled={salvando}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={gravar}
          className={`${campoBase} min-h-11 w-24 text-center`}
        />
        <span className="font-mono text-[11px] text-muted-foreground">%</span>
      </div>
      {erro && (
        <p role="alert" className="mt-1 font-mono text-[10px] md:text-[9px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
