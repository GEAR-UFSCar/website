"use client"

import { useEffect, useState } from "react"

/*
 * Ponteiro grosso — dedo, não mouse.
 *
 * Retorna `false` no primeiro render de propósito: no servidor não existe
 * `window`, e devolver `true` faria o HTML do servidor divergir do primeiro
 * render do cliente. O valor real chega no efeito, depois da hidratação.
 *
 * Por que `(pointer: coarse)` e não largura de tela: largura responde "o
 * aparelho é pequeno?", e a pergunta aqui é outra — "existe um ponteiro que
 * o usuário move pela tela?". Um tablet grande tem tela larga e nenhum
 * cursor para desenhar; um notebook com tela sensível ao toque tem os dois,
 * e `coarse` corresponde ao ponteiro primário, que nele continua sendo o
 * trackpad.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const consulta = window.matchMedia("(pointer: coarse)")
    const aplicar = () => setIsTouch(consulta.matches)
    aplicar()
    consulta.addEventListener("change", aplicar)
    return () => consulta.removeEventListener("change", aplicar)
  }, [])

  return isTouch
}
