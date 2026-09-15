"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { motion, useMotionValue, useSpring } from "framer-motion"

type Entrada = {
  /** Tag temática da decisão, mostrada à esquerda em caixa alta. */
  tema: string
  titulo: string
  texto: string
  /** Momentos de honestidade pública — ganham borda âmbar e o selo TRANSPARÊNCIA. */
  destaque?: boolean
  /** Pares mostrados no painel flutuante; só o que a própria narrativa sustenta. */
  resumo?: { label: string; valor: string }[]
  /**
   * Fundo do painel flutuante. Opcional de propósito: sem foto — ou com
   * caminho que não resolve — o painel cai no navy sólido que já era o fundo
   * dele, sem buraco e sem quebrar o build.
   */
  foto?: string
}

const entradas: Entrada[] = [
  {
    tema: "Estrutura",
    foto: "/fotos/universidade-aberta/foto-05.jpg",
    titulo: "Por que três frentes, e não uma entidade genérica de robótica",
    texto:
      "Competição, Pesquisa e Projetos têm ritmos completamente diferentes — uma corre contra prazo de campeonato, outra não tem prazo externo nenhum, a terceira vive em sprints internos. Juntar tudo numa coisa só faria uma dessas partes sufocar as outras.",
    resumo: [
      { label: "Competição", valor: "PRAZO EXTERNO FIXO" },
      { label: "Pesquisa", valor: "SEM PRAZO EXTERNO" },
      { label: "Projetos", valor: "SPRINTS INTERNOS" },
    ],
  },
  {
    tema: "Formação",
    foto: "/fotos/universidade-aberta/foto-01.jpg",
    titulo: "Por que ninguém escolhe a frente no primeiro dia",
    texto:
      "Todo mundo passa pela Academia GEAR antes — Bootcamp, formação técnica, Projeto de Validação. A escolha da frente vem depois de aprender, não de uma decisão às cegas na hora da inscrição.",
    resumo: [{ label: "Jornada", valor: "BOOTCAMP → ACADEMIA → VALIDAÇÃO → FRENTE" }],
  },
  {
    tema: "Governança",
    foto: "/fotos/universidade-aberta/foto-02.jpg",
    titulo: "Por que cargo não é hierarquia aqui",
    texto:
      "Cargos existem pra organizar responsabilidade e garantir continuidade entre gestões — não pra criar distância. Qualquer membro pode falar direto com a Presidência, independente de cargo ou tempo de casa.",
    resumo: [
      { label: "Mandato", valor: "1 ANO" },
      { label: "Acesso à Presidência", valor: "QUALQUER MEMBRO" },
    ],
  },
  {
    tema: "Processo Seletivo",
    foto: "/fotos/universidade-aberta/foto-06.jpg",
    titulo: "Por que não exigimos experiência prévia",
    texto:
      "A Academia GEAR nivela todo mundo. Se exigíssemos conhecimento prévio, estaríamos filtrando por quem já teve acesso antes, não por quem tem potencial agora.",
    resumo: [
      { label: "Pré-requisito técnico", valor: "NENHUM" },
      { label: "Vagas por ciclo", valor: "ATÉ 20" },
    ],
  },
  {
    tema: "Transparência",
    foto: "/fotos/ai-rover.jpg",
    titulo: "Por que a gente fala sobre o que não sabe",
    texto:
      "Preferimos admitir uma limitação em público do que deixar alguém descobrir sozinho depois. Isso vale pra um robô, pra um cronograma, ou pra qualquer parte da entidade.",
    destaque: true,
    resumo: [
      { label: "Princípio", valor: "HONESTIDADE PÚBLICA" },
      { label: "Se aplica a", valor: "ROBÔS, PRAZOS, A ENTIDADE" },
    ],
  },
]

export function Works() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  /*
   * Guarda a última entrada apontada. Sem isto, ao sair o painel esvaziava e
   * a altura ia a zero — e como o deslocamento vertical é em PORCENTAGEM da
   * própria altura, a caixa saltava para outra posição enquanto sumia.
   * Mantendo o conteúdo montado, a altura fica estável durante o fade.
   */
  const [ultimaEntrada, setUltimaEntrada] = useState<Entrada | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  /** Falso até a primeira leitura de posição do ponteiro. */
  const posicionado = useRef(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    /*
     * As molas nascem em (0,0) — o canto superior esquerdo do container. Na
     * primeira leitura elas precisam SALTAR para o ponteiro; deixá-las animar
     * a partir do zero é o que fazia o painel atravessar a tela na diagonal
     * ao aparecer. Do segundo movimento em diante, molejo normal.
     */
    if (!posicionado.current) {
      springX.jump(x)
      springY.jump(y)
      posicionado.current = true
    }

    mouseX.set(x)
    mouseY.set(y)
  }

  // durante o fade de saída ainda mostra a última entrada, para não colapsar
  const emFoco = hoveredIndex !== null ? entradas[hoveredIndex] : ultimaEntrada

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
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">03 — DECISÕES QUE NOS DEFINEM</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">Como Construímos a GEAR</h2>
      </motion.div>

      {/* Entradas */}
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
            onMouseEnter={() => {
              setHoveredIndex(index)
              setUltimaEntrada(entrada)
            }}
            onMouseLeave={() => setHoveredIndex(null)}
            data-cursor-hover
          >
            {entrada.destaque && (
              <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] mb-4">TRANSPARÊNCIA</p>
            )}

            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 md:gap-10">
              {/* Tema */}
              <span className="font-mono text-xs text-muted-foreground tracking-widest order-1 md:order-none shrink-0">
                {entrada.tema.toUpperCase()}
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

        {/* Resumo flutuante */}
        <motion.div
          className="absolute pointer-events-none z-50 hidden md:block w-80 overflow-hidden border border-[var(--gear-amber)] bg-[var(--gear-navy)]"
          style={{
            x: springX,
            y: springY,
            translateX: "-50%",
            /*
             * -108% era 8% da altura do painel como respiro acima do cursor.
             * Com a foto, isso dava ~32px; sem ela o painel encolheu e o
             * respiro caiu para ~11px, encostando no ponteiro. O gap agora é
             * fixo em 16px e não depende mais da altura do conteúdo.
             */
            translateY: "calc(-100% - 16px)",
          }}
          animate={{
            opacity: hoveredIndex !== null ? 1 : 0,
            scale: hoveredIndex !== null ? 1 : 0.95,
          }}
          transition={{ duration: 0.2 }}
        >
          {emFoco && (
            <div className="relative">
              {/*
                Camada de fundo. `fill` posiciona a imagem em inset-0 do
                wrapper, cuja altura vem da faixa de texto abaixo — por isso o
                wrapper é `relative` e a faixa fica em fluxo normal. Ordem no
                DOM resolve a pilha: imagem primeiro, faixa depois, sem z-index.

                `alt=""` porque a foto é textura, não informação: o painel já
                diz tudo em texto, e um alt descritivo aqui faria o leitor de
                tela anunciar uma imagem decorativa a cada hover.
              */}
              {emFoco.foto && (
                <Image
                  src={emFoco.foto}
                  alt=""
                  fill
                  /* O painel tem largura fixa de w-80; sem `sizes` o Next
                     serviria a foto no tamanho da viewport. */
                  sizes="320px"
                  className="object-cover"
                />
              )}

              {/* 85% de navy: o texto continua legível e a foto continua lá. */}
              <div className="relative bg-[var(--gear-navy)]/85 p-4">
              <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">EM RESUMO</p>
              <p className="font-mono text-[11px] tracking-wider text-foreground mt-2 pb-2 border-b border-white/10">
                {emFoco.tema}
              </p>
              <dl className="mt-2 space-y-1.5">
                {emFoco.resumo?.map((linha) => (
                  <div key={linha.label}>
                    <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                      {linha.label}
                    </dt>
                    <dd className="font-mono text-[11px] text-foreground mt-0.5">{linha.valor}</dd>
                  </div>
                ))}
              </dl>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Border */}
      <div className="border-t border-white/10" />
    </section>
  )
}
