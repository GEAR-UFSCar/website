"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { SentientGear } from "./sentient-gear"
import { HeroCursor } from "@/components/hero-cursor"

const MotionLink = motion.create(Link)

export function Hero() {
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  return (
    /*
     * A classe "hero" é o alvo de lib/hero-bounds.ts (isPointInHero). Não é
     * estilo: é o marcador que diz ao cursor global onde ele deve sumir e ao
     * cursor do Hero onde ele deve aparecer. Remover quebra os dois.
     */
    <section
      ref={containerRef}
      className="hero relative min-h-[100dvh] w-full overflow-hidden bg-[#050505]"
    >
      {/*
       * O h1 da home. As duas frases grandes abaixo são h2 de propósito, são
       * chamadas visuais, não o título do site, e mudá-las para h1 poria
       * "ROBÓTICA autônoma" como cabeçalho principal. sr-only mantém o layout
       * assimétrico intacto e dá ao leitor de tela o nome real da entidade.
       */}
      <h1 className="sr-only">
        GEAR: Grupo de Extensão em Automação e Robótica, UFSCar Sorocaba
      </h1>

      {/*
       * 3D Sphere Background
       *
       * isolate (isolation: isolate) força o canvas a ser composto num buffer
       * próprio ANTES de o cursor mesclar com ele. Sem isso, o
       * mix-blend-difference do CustomCursor mescla direto contra a textura
       * WebGL com alpha premultiplicado, e o resultado é o padrão de linhas
       * coloridas dentro do círculo, artefato de composição, não de CSS:
       * nenhum ancestral aqui cria stacking context (conferido um a um,
       * incluindo o container do R3F em node_modules).
       */}
      <div className="absolute inset-0 isolate">
        <SentientGear />
      </div>

      {/*
       * Cursor local, dentro da seção: enquanto o ponteiro está aqui, o cursor
       * global some e este desenha, sem mix-blend-mode em estado nenhum.
       */}
      <HeroCursor />

      {/* Typography Overlay */}
      <motion.div style={{ opacity, scale }} className="relative z-10 min-h-[100dvh] flex flex-col justify-between px-8 pt-24 pb-8 md:p-12 md:px-12 md:py-20 pointer-events-none">
        {/* Top Left */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">ROBÓTICA E INTELIGÊNCIA ARTIFICIAL</p>
          <h2 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            ROBÓTICA
            <br />
            <span className="italic">autônoma</span>
          </h2>
        </motion.div>

        {/* Center Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        >
          <MotionLink
            href="/sobre#frentes"
            data-cursor-hover
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative inline-block whitespace-nowrap px-6 md:px-8 py-4 border border-linha-forte rounded-full font-mono text-xs md:text-sm tracking-widest uppercase bg-transparent backdrop-blur-sm hover:bg-white hover:text-black transition-colors duration-500 pointer-events-auto"
          >
            Conheça as Frentes
          </MotionLink>
        </motion.div>

        {/* Bottom Right */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="self-end text-right"
        >
          {/* prometia "projetos" e não levava a /projetos */}
          <MotionLink href="/projetos" data-cursor-hover className="group pointer-events-auto inline-block">
            <h2 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
              PROJETOS
              <br />
              <span className="italic">em campo</span>
            </h2>
          </MotionLink>
        </motion.div>
      </motion.div>
    </section>
  )
}
