"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { botaoSecundario } from "@/lib/ui"

/**
 * Retirar ou devolver um item. Passa pelas funções da 032, não por UPDATE:
 * o membro sem cargo não tem policy de escrita em `patrimonio`, e a função é
 * quem confere "está disponível?" e "está com você?" dentro da mesma transação.
 *
 * Some quando não há ação possível (item em manutenção, emprestado a outra
 * pessoa e quem vê não tem cargo): a tela não oferece o que o banco recusa.
 */
export function EmprestimoBotao({
  id,
  status,
  comigo,
  gerencia,
}: {
  id: string
  status: string
  comigo: boolean
  gerencia: boolean
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [atualizando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [prazo, setPrazo] = useState("")

  const acao =
    status === "Disponível" ? "retirar_item" : status === "Emprestado" && (comigo || gerencia) ? "devolver_item" : null
  if (!acao) return null

  const executar = async () => {
    setErro(null)
    setOcupado(true)
    // prazo é opcional e só existe na retirada (033); sem ele o item não entra como atrasado
    const { error } = await createClient().rpc(
      acao,
      acao === "retirar_item" ? { p_id: id, p_prazo: prazo || null } : { p_id: id },
    )
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    iniciar(() => router.refresh())
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {acao === "retirar_item" && (
        <div>
          <label htmlFor={`prazo-${id}`} className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Devolvo até (opcional)
          </label>
          <input
            id={`prazo-${id}`}
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="mt-1 min-h-11 border border-linha-forte bg-transparent px-3 font-mono text-[11px]"
          />
        </div>
      )}
      <button
        type="button"
        onClick={executar}
        disabled={ocupado || atualizando}
        data-cursor-hover
        className={`${botaoSecundario} min-h-11 !px-5 !py-2 text-[11px] disabled:opacity-50`}
      >
        {ocupado || atualizando ? "Salvando…" : acao === "retirar_item" ? "Retirar" : comigo ? "Devolver" : "Marcar devolvido"}
      </button>
      {erro && (
        <p role="alert" className="basis-full font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
