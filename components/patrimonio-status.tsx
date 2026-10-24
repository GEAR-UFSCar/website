"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { STATUS } from "@/lib/inventario"
import { selectInline } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

/**
 * Select inline que grava assim que o valor muda.
 *
 * `codigo` entra só no rótulo acessível: com dezenas de linhas, "Status do
 * item" repetido não diz a quem usa leitor de tela qual item está mudando.
 */
export function PatrimonioStatus({ id, valor, codigo }: { id: string; valor: string; codigo?: string }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const mudar = async (novo: string) => {
    setErro(null)
    const supabase = createClient()
    // .select() confere se alguma linha mudou: a RLS recusa um UPDATE sem erro
    // nenhum, e sem esta checagem a tela recarregava com o valor antigo, calada.
    const { data, error } = await supabase
      .from("patrimonio")
      .update({ status: novo })
      .eq("id", id)
      .select("id")
    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada: a política de acesso recusou a mudança.")
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
        aria-label={codigo ? `Status de ${codigo}` : "Status do item"}
        className={selectInline}
      >
        {STATUS.map((s) => (
          <option key={s} value={s} className="bg-[var(--gear-ink)]">
            {s}
          </option>
        ))}
      </select>
      {erro && <p role="alert" className="mt-1 font-mono text-[10px] md:text-[9px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
