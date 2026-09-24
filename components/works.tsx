"use client"

import { useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import Image from "next/image"

type Entrada = {
  tema: string
  titulo: string
  texto: string
  foto?: string
  destaque?: boolean
}

const entradas: Entrada[] = [
  {
    tema: "Quem somos",
    titulo: "Uma entidade de robótica, três frentes",
    texto:
      "A GEAR é a entidade estudantil de robótica da UFSCar Sorocaba, registrada como atividade de extensão na ProEx-UFSCar, com orientação do Prof. Iago Pacheco Gomes. Reunimos estudantes de qualquer curso que querem aprender robótica com a mão na massa — sem pré-requisito técnico pra entrar.",
    foto: "/fotos/universidade-aberta/foto-01.jpg",
  },
  {
    tema: "Competição",
    titulo: "Rumo à pista",
    texto:
      "Um squad dedicado a disputar competições nacionais e internacionais, trabalhando em SLAM, exploração autônoma e visão computacional. Quais competições entram em cada ciclo depende de confirmação.",
    foto: "/fotos/universidade-aberta/foto-05.jpg",
  },
  {
    tema: "Pesquisa",
    titulo: "Pesquisa que termina em publicação",
    texto:
      "Pesquisa conduzida com orientação acadêmica formal e escrita para publicar em eventos nacionais. O tema de cada ciclo sai da conversa com o professor orientador.",
    foto: "/fotos/universidade-aberta/foto-02.jpg",
  },
  {
    tema: "Projetos",
    titulo: "O AI Rover já anda de verdade",
    texto:
      "Desenvolvimento contínuo em squads menores. O primeiro caso real é o AI Rover, um robô com visão computacional (YOLO) que busca objetos de forma autônoma.",
    foto: "/fotos/ai-rover.jpg",
    destaque: true,
  },
  {
    tema: "Formação",
    titulo: "Ninguém entra direto numa trilha",
    texto:
      "Todo mundo passa pela Academia GEAR antes — Bootcamp, formação técnica em ROS 2 e Python, um Projeto de Validação, e só depois a escolha de Competição, Pesquisa ou Projetos.",
    foto: "/fotos/universidade-aberta/foto-06.jpg",
  },
]

export function Works() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 })

  function handleMouseMove(e: React.MouseEvent) {
    mouseX.set(e.clientX)
    mouseY.set(e.clientY)
  }

  const emFoco = hoveredIndex !== null ? entradas[hoveredIndex] : null

  return (
    <section className="relative py-32 px-8 md:px-12 md:py-24" onMouseMove={handleMouseMove}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-24"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">03 — A ENTIDADE</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">O que é a GEAR</h2>
      </motion.div>

      <div className="relative">
        {entradas.map((entrada, index) => (
          <motion.div
            key={`${entrada.tema}-${entrada.titulo}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className={`relative border-t border-white/10 py-8 md:py-12 ${
              entrada.destaque ? "border-l-2 border-l-[var(--gear-amber)] pl-6 md:pl-8" : ""
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            data-cursor-hover
          >
            {entrada.destaque && (
              <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] mb-4 uppercase">
                {entrada.tema}
              </p>
            )}

            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 md:gap-10">
              <span className="font-mono text-xs text-muted-foreground tracking-widest order-1 md:order-none shrink-0 uppercase">
                {entrada.tema}
              </span>

              <div className="flex-1 order-2 md:order-none">
                <motion.h3
                  className="font-sans text-2xl md:text-4xl lg:text-5xl font-light tracking-tight text-balance"
                  animate={{ x: hoveredIndex === index ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {entrada.titulo}
                </motion.h3>

                <p className="mt-5 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                  {entrada.texto}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="fixed left-0 top-0 pointer-events-none z-50 w-72 border border-[var(--gear-amber)] overflow-hidden"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-120%",
        }}
        animate={{
          opacity: hoveredIndex !== null ? 1 : 0,
          scale: hoveredIndex !== null ? 1 : 0.95,
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative w-full h-40 bg-[var(--gear-ink)]">
          {emFoco?.foto && (
            <Image
              src={emFoco.foto}
              alt=""
              fill
              className="object-cover"
              sizes="288px"
            />
          )}
        </div>
        <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] uppercase px-3 py-2 bg-[var(--gear-ink)]">
          {emFoco?.tema}
        </p>
      </motion.div>
    </section>
  )
}
