"use client"

import { ReactLenis } from "lenis/react"
import { MotionConfig, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

/*
 * Quem pediu menos movimento no sistema recebe a rolagem nativa: sem
 * smoothWheel o Lenis não interpola a roda. Trocar as opções recria a
 * instância sem remontar a página — tirar o ReactLenis da árvore remontaria.
 *
 * MotionConfig reducedMotion="user": a regra de prefers-reduced-motion em
 * globals.css só alcança CSS. Isto estende às animações do framer-motion
 * (entradas, springs, parallax) em todas as páginas que usam esta casca.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const menosMovimento = useReducedMotion() ?? false

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: !menosMovimento }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ReactLenis>
  )
}
