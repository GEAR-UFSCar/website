"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"

/*
 * Cada frase aqui tem prova a um clique. As cinco anteriores eram afirmações
 * sobre a GEAR que nada no site sustentava — e uma delas ("pesquisa que vira
 * artigo de verdade") seria desmentida hoje, já que não há publicação. Num
 * site cuja marca editorial é assumir limitação, promessa sem lastro custa
 * mais caro do que não dizer nada.
 *
 * Regra para editar: só entra frase que alguém consiga verificar em /projetos,
 * /frentes, /time ou /sobre. Se depender de algo que ainda não aconteceu,
 * fica de fora até acontecer.
 */
const statements = [
  "Dois robôs em bancada: AI Rover e Navegador Mecanum.",
  "ROS 2, Webots e SLAM: a stack que roda nos robôs hoje.",
  "Extensão registrada na ProEx-UFSCar, com orientação docente.",
  "Toda decisão técnica publicada com a justificativa — e com o que não funcionou.",
  "Onze pessoas, três frentes, uma formação comum antes de escolher.",
]

export function About() {
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-100%"])
  const smoothX = useSpring(x, { stiffness: 100, damping: 30 })

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden md:py-0">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="px-8 md:px-12 mb-0 py-20"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">04 — ONDE A GEAR ESTÁ</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">O que existe hoje</h2>
        {/* /sobre não recebia nenhum link no corpo do site — só o menu levava lá */}
        <p className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
          O registro na ProEx, a formação completa e as três frentes estão em{" "}
          <Link href="/sobre" data-cursor-hover className="text-[var(--gear-amber)] hover:underline">
            Sobre
          </Link>
          .
        </p>
      </motion.div>

      {/* Horizontal Scroll Container */}
      <div className="relative flex items-center overflow-hidden py-0 gap-0 h-16">
        <motion.div style={{ x: smoothX }} className="flex gap-16 md:gap-24 px-8 md:px-12 whitespace-nowrap">
          {statements.map((statement, index) => (
            <motion.p
              key={index}
              className="text-4xl md:text-6xl lg:text-7xl font-sans font-light tracking-tight text-white/90"
              style={{
                WebkitTextStroke: index % 2 === 0 ? "none" : "1px rgba(255,255,255,0.3)",
                color: index % 2 === 0 ? "inherit" : "transparent",
              }}
            >
              {statement}
            </motion.p>
          ))}
        </motion.div>
      </div>

      {/* Decorative Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mt-16 mx-8 md:mx-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-left"
      />
    </section>
  )
}
