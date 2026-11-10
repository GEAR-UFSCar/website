"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { campoBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

/** Teto do CHECK de `proximo_passo` (020). */
const MAX = 200

/**
 * O próximo passo do sprint, editável por quem participa dele (038): o
 * responsável e os membros da trilha, além de quem edita o sprint.
 *
 * Grava ao sair do campo, como o progresso: é uma frase curta, e um botão de
 * salvar para uma linha só seria mais um clique entre a pessoa e o registro.
 */
export function SprintProximoPasso({ id, valor }: { id: string; valor: string | null }) {
  const router = useRouter()
  const original = valor?.trim() ?? ""
  const [rascunho, setRascunho] = useState(original)
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const gravar = async () => {
    setErro(null)
    const texto = rascunho.trim()
    if (texto === original) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from("sprints")
      .update({ proximo_passo: texto === "" ? null : texto })
      .eq("id", id)
      .select("id")

    if (error) {
      setErro(mensagemSegura(error))
      setRascunho(original)
      return
    }
    // update sem erro e sem linha afetada = a política de acesso recusou
    if (!data || data.length === 0) {
      setErro("Nada mudou: você precisa ser da trilha ou o responsável pelo sprint.")
      setRascunho(original)
      return
    }

    iniciar(() => router.refresh())
  }

  return (
    <div>
      <label htmlFor={`proximo-${id}`} className="sr-only">
        Próximo passo do sprint
      </label>
      <input
        id={`proximo-${id}`}
        maxLength={MAX}
        value={rascunho}
        placeholder="O que vem agora, em uma frase…"
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={gravar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        disabled={salvando}
        className={`${campoBase} placeholder:text-muted-foreground/50`}
      />
      {erro && (
        <p role="alert" className="mt-1 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
