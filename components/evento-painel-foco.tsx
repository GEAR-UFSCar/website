"use client"

import { useEffect } from "react"

/**
 * Leva o foco do teclado para a gaveta do evento assim que ela abre. Sem isto,
 * quem navega por teclado ou leitor de tela clica num evento e continua
 * "parado" na grade, com a gaveta aberta e fora do alcance do Tab.
 */
export function FocoNoPainel() {
  useEffect(() => {
    document.querySelector<HTMLElement>("[data-painel]")?.focus()
  }, [])
  return null
}
