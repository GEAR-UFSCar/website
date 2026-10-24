"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export type AtalhosHrefs = {
  hoje: string
  anterior: string
  proximo: string
  semana: string
  dia: string
  mes: string
  agenda: string
  /** Null quando a pessoa não pode criar evento. */
  novo: string | null
  /** Null quando não há painel aberto. */
  fechar: string | null
}

/**
 * Teclado do calendário. Não desenha nada: escuta e navega.
 *
 * Os destinos chegam prontos do servidor (são os mesmos links dos botões),
 * então o atalho e o clique nunca discordam sobre o que "próximo" significa.
 * Ignora a digitação em campo — escrever "mês" na busca não pode mudar a visão
 * — e qualquer combinação com Ctrl/Cmd/Alt, que é do Ctrl K e do navegador.
 */
export function CalendarioAtalhos({ hrefs }: { hrefs: AtalhosHrefs }) {
  const router = useRouter()

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return

      if (e.key === "/") {
        const busca = document.getElementById("busca-calendario")
        if (busca) {
          e.preventDefault()
          busca.focus()
        }
        return
      }

      const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const destinos: Record<string, string | null> = {
        t: hrefs.hoje,
        ArrowLeft: hrefs.anterior,
        ArrowRight: hrefs.proximo,
        s: hrefs.semana,
        d: hrefs.dia,
        m: hrefs.mes,
        a: hrefs.agenda,
        n: hrefs.novo,
        Escape: hrefs.fechar,
      }
      const destino = destinos[tecla]
      if (destino) {
        e.preventDefault()
        router.push(destino, { scroll: false })
      }
    }

    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [hrefs, router])

  return null
}
