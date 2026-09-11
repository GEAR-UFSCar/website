"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

type Entrada = {
  data: string
  projeto: string
  titulo: string
  texto: string
  /** Momentos de honestidade técnica — ganham borda âmbar e o selo TRANSPARÊNCIA. */
  destaque?: boolean
  /** Specs mostradas na ficha flutuante; só valores que a própria narrativa sustenta. */
  ficha?: { label: string; valor: string }[]
}

const entradas: Entrada[] = [
  {
    data: "2026",
    projeto: "AI Rover",
    titulo: "Três cérebros, uma missão",
    texto:
      "Dividimos o rover em três partes: o ESP32-S3-CAM cuida dos olhos e do rádio, o Arduino UNO dos reflexos, o notebook do raciocínio via YOLO. Se o notebook trava, o Arduino para sozinho — nenhuma parte depende cegamente da outra.",
    ficha: [
      { label: "Olhos e rádio", valor: "ESP32-S3-CAM" },
      { label: "Reflexos", valor: "ARDUINO UNO" },
      { label: "Raciocínio", valor: "NOTEBOOK · YOLO" },
    ],
  },
  {
    data: "2026",
    projeto: "Navegador Mecanum",
    titulo: "Cinco sensores, uma média ponderada",
    texto:
      "No lugar de tratar cada sensor de linha isoladamente, demos um peso pra cada posição. O resultado é uma estimativa numérica da posição da linha, não só 'tem linha / não tem linha' — e isso mudou tudo na suavidade do movimento.",
    ficha: [
      { label: "Mapa de pesos", valor: "-200 -100 0 +100 +200" },
      { label: "Leitura", valor: "MÉDIA PONDERADA" },
    ],
  },
  {
    data: "2026",
    projeto: "Navegador Mecanum",
    titulo: "Por que trocamos regras binárias por PID",
    texto:
      "'Vira esquerda, vira direita' gerava oscilação constante. Trocamos por um controlador PID: erro pequeno vira correção pequena, erro grande vira correção maior. O robô parou de 'brigar' com a própria trajetória.",
    ficha: [
      { label: "Kp", valor: "0,30" },
      { label: "Kd", valor: "0,075" },
    ],
  },
  {
    data: "2026",
    projeto: "Navegador Mecanum",
    titulo: "Machine Learning ficou de fora — de propósito",
    texto:
      "Dava pra usar ML no controle de linha. Não usamos porque o problema já tinha solução determinística boa. Complexidade sem necessidade real não é sofisticação, é desperdício.",
    ficha: [
      { label: "Abordagem", valor: "DETERMINÍSTICA" },
      { label: "ML", valor: "NÃO APLICADO" },
    ],
  },
  {
    data: "2026",
    projeto: "AI Rover",
    titulo: "A limitação que não escondemos",
    texto:
      "O AI Rover não tem encoders nas rodas. Sabemos a força que mandamos pro motor, não quanto ele andou de fato — e isso significa que mapa e rota ainda não são confiáveis. Preferimos falar isso agora do que descobrir sozinho depois.",
    destaque: true,
    ficha: [
      { label: "Encoders", valor: "AUSENTES" },
      { label: "Odometria", valor: "MALHA ABERTA" },
      { label: "Mapa e rota", valor: "NÃO CONFIÁVEIS" },
    ],
  },
]

export function Works() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }
  }

  const emFoco = hoveredIndex !== null ? entradas[hoveredIndex] : null

  return (
    <section className="relative py-32 px-8 md:px-12 md:py-24">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-24"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">04 — DECISÕES DE ENGENHARIA</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">Diário de Bordo</h2>
      </motion.div>

      {/* Entradas do diário */}
      <div ref={containerRef} onMouseMove={handleMouseMove} className="relative">
        {entradas.map((entrada, index) => (
          <motion.div
            key={entrada.titulo}
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
              <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] mb-4">TRANSPARÊNCIA</p>
            )}

            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 md:gap-10">
              {/* Data e projeto */}
              <span className="font-mono text-xs text-muted-foreground tracking-widest order-1 md:order-none shrink-0">
                {entrada.data} · {entrada.projeto}
              </span>

              <div className="flex-1 order-2 md:order-none">
                {/* Título */}
                <motion.h3
                  className="font-sans text-2xl md:text-4xl lg:text-5xl font-light tracking-tight text-balance"
                  animate={{
                    x: hoveredIndex === index ? 20 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {entrada.titulo}
                </motion.h3>

                {/* Narrativa */}
                <p className="mt-5 max-w-[62ch] font-sans text-base md:text-lg leading-relaxed text-muted-foreground">
                  {entrada.texto}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Ficha técnica flutuante */}
        <motion.div
          className="absolute pointer-events-none z-50 hidden md:block w-72 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4"
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
          {emFoco && (
            <>
              <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">FICHA TÉCNICA</p>
              <p className="font-mono text-[11px] tracking-wider text-foreground mt-2 pb-3 border-b border-white/10">
                {emFoco.projeto}
              </p>
              <dl className="mt-3 space-y-2.5">
                {emFoco.ficha?.map((linha) => (
                  <div key={linha.label}>
                    <dt className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                      {linha.label}
                    </dt>
                    <dd className="font-mono text-[11px] text-foreground mt-0.5">{linha.valor}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </motion.div>
      </div>

      {/* Bottom Border */}
      <div className="border-t border-white/10" />
    </section>
  )
}
