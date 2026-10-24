"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import s from "./calendario-clean.module.css"

/**
 * Apagar em dois passos, sem `window.confirm`: o primeiro clique troca o botão
 * por "Apagar mesmo?" + "Cancelar". Evento recorrente leva a série inteira —
 * o texto diz isso antes do segundo clique, não depois.
 */
export function EventoApagar({ id, repete, destino }: { id: string; repete: boolean; destino: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function apagar() {
    setApagando(true)
    setErro(null)
    const supabase = createClient()
    // `.select()` devolve as linhas apagadas: a RLS que nega um DELETE não dá erro, só apaga zero linhas.
    const { data, error } = await supabase.from("eventos").delete().eq("id", id).select("id")
    if (error) {
      setErro(mensagemSegura(error))
      setApagando(false)
      return
    }
    if (!data || data.length === 0) {
      setErro("Não foi possível apagar este evento. Só quem tem cargo pode apagar eventos.")
      setApagando(false)
      return
    }
    router.push(destino)
    router.refresh()
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className={s.acaoPerigo} data-cursor-hover>
        <Trash2 size={15} aria-hidden="true" /> {repete ? "Apagar a série" : "Apagar evento"}
      </button>
    )
  }

  return (
    <div className={s.confirmacao} role="alertdialog" aria-label="Confirmar exclusão">
      <p>
        {repete
          ? "Isto apaga o evento e TODAS as repetições dele. Não dá para desfazer."
          : "Isto apaga o evento para todo mundo. Não dá para desfazer."}
      </p>
      <div className={s.confirmacaoBotoes}>
        <button type="button" onClick={apagar} disabled={apagando} className={s.acaoPerigo} data-cursor-hover>
          {apagando ? "Apagando…" : "Apagar mesmo"}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} disabled={apagando} className={s.acao} data-cursor-hover>
          Cancelar
        </button>
      </div>
      {erro && (
        <p role="alert" className={s.erroInline}>
          {erro}
        </p>
      )}
    </div>
  )
}
