"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { isPointInHero } from "@/lib/hero-bounds"

export function HeroCursor() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setVisible(isPointInHero(e.clientX, e.clientY))
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  if (!position) return null

  return (
    <motion.div
      className="fixed top-0 left-0 w-12 h-12 rounded-full pointer-events-none z-[10000]"
      style={{
        backgroundColor: "transparent",
        border: "1px solid var(--gear-fog)",
      }}
      initial={false}
      animate={{
        x: position.x - 24,
        y: position.y - 24,
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
    />
  )
}
