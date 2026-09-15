"use client"

import { useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import Image from "next/image"

type Entrada = {
  tema: string
  titulo: string
  texto: string
  foto?: string
  resumo?: { label: string; valor: string }[]
  destaque?: boolean
}

const entradas: Entrada[] = [
  {
    tema: "Estrutura",
    titulo: "Por que três trilhas, e não uma entidade genérica de robótica",
    texto:
      "Competição, Pesquisa e Projetos têm ritmos completamente diferentes — uma corre contra prazo de campeonato, outra não tem prazo externo nenhum, a terceira vive em sprints internos. Juntar tudo numa coisa só faria uma dessas partes sufocar as outras.",
    foto: "/fotos/universidade-aberta/foto-05.jpg",
    resumo: [
      { label: "Competição", valor: "PRAZO EXTERNO FIXO" },
      { label: "Pesquisa", valor: "SEM PRAZO EXTERNO" },
      { label: "Projetos", valor: "SPRINTS INTERNOS" },
    ],
  },
  {
    tema: "Institucional",
    titulo: "Por que registramos a GEAR como atividade de extensão, não só um grupo informal",
    texto:
      "Um grupo de WhatsApp não sobrevive à saída de quem o criou. Um registro formal na ProEx-UFSCar, com professor orientador, sobrevive — e ainda garante que a participação conte como horas de extensão curricular pra quem faz parte.",
    foto: "/fotos/universidade-aberta/foto-01.jpg",
    resumo: [
      { label: "Registro", valor: "PROEX-UFSCAR" },
      { label: "Orientação", valor: "PROF. IAGO PACHECO GOMES" },
    ],
  },
  {
    tema: "Processo",
    titulo: "Por que escrevemos os manuais antes de programar qualquer linha de código do site",
    texto:
      "Regimento Interno, Manuais Técnicos, Normas de Segurança — tudo isso existiu em papel antes da Academia GEAR ter uma página pra chamar de sua. Preferimos que a entidade funcionasse de verdade primeiro, e o site alcançasse depois.",
    foto: "/fotos/universidade-aberta/foto-02.jpg",
    resumo: [{ label: "Ordem", valor: "MANUAIS ANTES DO CÓDIGO" }],
  },
  {
    tema: "Governança",
    titulo: "Por que pensamos em quem vem depois de nós desde o primeiro dia",
    texto:
      "Todo mandato tem prazo de 1 ano, e toda troca de gestão exige repasse de acessos, contatos-chave e pendências documentado em ata. Formatura é certa — uma entidade que depende de uma pessoa só morre quando essa pessoa se forma.",
    foto: "/fotos/universidade-aberta/foto-06.jpg",
    resumo: [
      { label: "Mandato", valor: "1 ANO" },
      { label: "Transição", valor: "DOCUMENTADA EM ATA" },
    ],
  },
  {
    tema: "Transparência",
    titulo: "Por que a gente fala sobre o que não sabe",
    texto:
      "Preferimos admitir uma limitação em público do que deixar alguém descobrir sozinho depois. Isso vale pra um robô, pra um cronograma, ou pra qualquer parte da entidade.",
    foto: "/fotos/ai-rover.jpg",
    resumo: [
      { label: "Princípio", valor: "HONESTIDADE PÚBLICA" },
      { label: "Se aplica a", valor: "ROBÔS, PRAZOS, A ENTIDADE" },
    ],
    destaque: true,
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
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">04 — DECISÕES QUE NOS DEFINEM</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">Como Construímos a GEAR</h2>
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
              <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] mb-4">TRANSPARÊNCIA</p>
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
      </motion.div>
    </section>
  )
}
