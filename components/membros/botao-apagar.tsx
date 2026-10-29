"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"

const acao =
  "inline-flex min-h-11 items-center border px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 md:min-h-0"

/**
 * Apagar uma linha com dois cliques, para registros sem formulário de edição
 * (chamada, horas, caixa, pedido). O mesmo desenho de registro-editavel.tsx;
 * quem decide se pode é a RLS, e a tela diz quando ela recusou.
 */
export function BotaoApagar({
  tabela,
  id,
  rotulo = "Apagar",
  descricao,
}: {
  tabela: "eventos_chamada" | "horas_lancadas" | "caixa_lancamentos" | "pedidos_compra"
  id: string
  rotulo?: string
  /** Para o leitor de tela saber O QUE vai ser apagado. */
  descricao: string
}) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [atualizando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const travado = ocupado || atualizando

  const apagar = async () => {
    setErro(null)
    setOcupado(true)
    const { data, error } = await createClient().from(tabela).delete().eq("id", id).select("id")
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nada foi apagado, a política de acesso recusou.")
    setConfirmando(false)
    iniciar(() => router.refresh())
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {confirmando ? (
        <>
          <button type="button" onClick={apagar} disabled={travado} aria-label={`Confirmar: ${rotulo.toLowerCase()} ${descricao}`}
            className={`${acao} border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]`}>
            {rotulo} mesmo
          </button>
          <button type="button" onClick={() => setConfirmando(false)} disabled={travado}
            className={`${acao} border-linha-forte text-muted-foreground hover:text-foreground`}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirmando(true)} disabled={travado} aria-label={`${rotulo} ${descricao}`}
          className={`${acao} border-linha-forte text-muted-foreground hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]`}>
          {rotulo}
        </button>
      )}
      {erro && <span role="alert" className="font-mono text-[10px] text-[var(--gear-amber)]">{erro}</span>}
    </span>
  )
}
