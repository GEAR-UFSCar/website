"use client"

import { motion } from "framer-motion"

import { MarqueeRow } from "@/components/marquee-row"

const techItems = [
  "ROS 2",
  "PYTHON",
  "PYTORCH",
  "YOLO",
  "ARDUINO",
  "WEBOTS",
  "SLAM",
  "C++",
]

/*
 * Segunda faixa. Antes eram oito adjetivos — AUTONOMIA, PRECISÃO, DISCIPLINA
 * — que qualquer entidade de robótica assinaria, e que não diziam nada sobre
 * esta. Trocados pelo que a GEAR de fato tem: os robôs, a liga, a linha de
 * pesquisa e o vínculo. Tudo verificável em /projetos, /frentes e /sobre.
 */
const contexto = [
  "AI ROVER",
  "NAVEGADOR MECANUM",
  "ROBOCUP RESCUE",
  "SAFE RL",
  "PROEX-UFSCAR",
  "EXTENSÃO",
]

export function TechMarquee() {
  return (
    <section className="relative py-24 overflow-hidden md:py-32">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="px-8 md:px-12 mb-16"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">06 — ARSENAL TÉCNICO</p>
      </motion.div>

      {/* Marquee Rows */}
      <div className="space-y-4">
        <MarqueeRow items={techItems} direction="left" />
        <MarqueeRow items={contexto} direction="right" />
      </div>
    </section>
  )
}
