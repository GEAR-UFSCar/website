"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { isPointInHero } from "@/lib/hero-bounds"
import { useIsTouchDevice } from "@/lib/use-is-touch-device"

export function CustomCursor() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
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
      setPosition({ x: e.clientX, y: e.clientY })
      setInsideHero(isPointInHero(e.clientX, e.clientY))

      const target = e.target as HTMLElement
      const hoverable = target.closest("a, button, [data-cursor-hover]")
      setIsHovering(!!hoverable)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isTouch])

  if (isTouch || !position) return null

  const visible = !insideHero

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference"
        initial={false}
        animate={{
          x: position.x - 6,
          y: position.y - 6,
          scale: isHovering ? 0 : 5,
          opacity: visible ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 border border-white rounded-full pointer-events-none z-[10000] mix-blend-difference"
        initial={false}
        animate={{
          x: position.x - 24,
          y: position.y - 24,
          scale: isHovering ? 1 : 0,
          opacity: visible ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      />
    </>
  )
}
