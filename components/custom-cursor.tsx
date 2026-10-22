"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { isPointInHero } from "@/lib/hero-bounds"
import { useIsTouchDevice } from "@/lib/use-is-touch-device"

const MOLA = { stiffness: 500, damping: 28, mass: 0.5 }

export function CustomCursor() {
  // A posição vive em motion values: não passa pelo React, então mover o mouse não re-renderiza nada.
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, MOLA)
  const sy = useSpring(y, MOLA)
  const pontoX = useTransform(sx, (v) => v - 6)
  const pontoY = useTransform(sy, (v) => v - 6)
  const anelX = useTransform(sx, (v) => v - 24)
  const anelY = useTransform(sy, (v) => v - 24)

  const [ativo, setAtivo] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [insideHero, setInsideHero] = useState(false)
  /*
   * No toque não há cursor para substituir: `mousemove` só dispara no tap,
   * e o resultado seria um ponto branco parado onde o dedo encostou por
   * último. O hook fica antes de qualquer saída para a ordem dos hooks não
   * mudar entre renders.
   */
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    if (isTouch) return

    const handleMouseMove = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setAtivo(true)
      setInsideHero(isPointInHero(e.clientX, e.clientY))

      const target = e.target as HTMLElement
      setIsHovering(!!target.closest("a, button, [data-cursor-hover]"))
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isTouch, x, y])

  if (isTouch || !ativo) return null

  const opacity = insideHero ? 0 : 1

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference"
        style={{ x: pontoX, y: pontoY }}
        initial={false}
        animate={{ scale: isHovering ? 0 : 5, opacity }}
        transition={{ type: "spring", ...MOLA }}
      />
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 border border-white rounded-full pointer-events-none z-[10000] mix-blend-difference"
        style={{ x: anelX, y: anelY }}
        initial={false}
        animate={{ scale: isHovering ? 1 : 0, opacity }}
        transition={{ type: "spring", ...MOLA }}
      />
    </>
  )
}
