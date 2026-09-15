"use client"

import type { ReactNode } from "react"
import Image, { type StaticImageData } from "next/image"

/*
 * Fileiras de rolagem horizontal.
 *
 * Estava dentro de tech-marquee.tsx (Arsenal Técnico, na home) e saiu para cá
 * quando /parceiros passou a usar a mesma faixa. A mecânica do loop — a
 * duplicação, o contêiner que corta e a classe de animação — mora em `Faixa`,
 * e cada variante só decide o que desenhar dentro.
 *
 * A animação é CSS (`animate-marquee-*`, 50s linear, em globals.css) e para
 * sozinha em `prefers-reduced-motion`, pela regra que já existe lá.
 *
 * POR QUE A DUPLICAÇÃO É PAR
 * O keyframe anda de 0 a -50% da largura. Para o salto do fim para o começo
 * ser invisível, a metade de trás precisa ser idêntica à da frente — o que só
 * acontece com um número PAR de cópias.
 */

const REPETICOES = 4

const repetir = <T,>(items: T[]) => Array.from({ length: REPETICOES }, () => items).flat()

function Faixa({ direction, children }: { direction: "left" | "right"; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden py-4">
      <div
        className={`flex items-center gap-8 ${
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        }`}
        style={{ width: "fit-content" }}
      >
        {children}
      </div>
    </div>
  )
}

/** Faixa de texto contornado que preenche no hover — o Arsenal Técnico. */
export function MarqueeRow({
  items,
  direction = "left",
}: {
  items: string[]
  direction?: "left" | "right"
}) {
  return (
    <Faixa direction={direction}>
      {repetir(items).map((item, index) => (
        <span
          key={index}
          className="group font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight whitespace-nowrap cursor-default"
          style={{
            WebkitTextStroke: "1px rgba(255,255,255,0.3)",
            color: "transparent",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "white"
            e.currentTarget.style.webkitTextStroke = "none"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "transparent"
            e.currentTarget.style.webkitTextStroke = "1px rgba(255,255,255,0.3)"
          }}
        >
          {item}
          <span className="mx-8 text-white/20">•</span>
        </span>
      ))}
    </Faixa>
  )
}

export type ParceiroLogo = {
  nome: string
  /** Import estático: o build falha se o arquivo sumir, em vez de quebrar na tela. */
  logo: StaticImageData
  url: string
}

/**
 * Faixa de logos de parceiros.
 *
 * A placa clara atrás do logo não é decoração: o PNG do NTA é azul sólido com
 * fundo transparente e some contra o ink do site. Recolorir logo de terceiro
 * para caber na paleta da GEAR seria mexer na identidade visual de outra
 * instituição — o que não nos cabe. A placa usa `--gear-fog`, que é da nossa
 * paleta: o suporte é nosso, a marca continua deles.
 */
export function MarqueeLogos({
  items,
  direction = "left",
}: {
  items: ParceiroLogo[]
  direction?: "left" | "right"
}) {
  return (
    <Faixa direction={direction}>
      {repetir(items).map((parceiro, index) => (
        <a
          key={`${parceiro.nome}-${index}`}
          href={parceiro.url}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor-hover
          /*
           * aria-hidden e tabIndex -1 nas cópias: são o mesmo link quatro
           * vezes: quem navega por teclado ou leitor de tela recebe uma
           * ocorrência, não quatro paradas idênticas.
           */
          aria-hidden={index >= items.length ? true : undefined}
          tabIndex={index >= items.length ? -1 : undefined}
          className="group block shrink-0 rounded bg-[var(--gear-fog)] p-3 opacity-90 transition duration-300 hover:scale-[1.03] hover:opacity-100"
        >
          <Image
            src={parceiro.logo}
            alt={`${parceiro.nome} — abre o site do parceiro`}
            /* h-* com w-auto define as duas dimensões em CSS, que é como o
               next/image aceita redimensionamento sem avisar de proporção. */
            className="h-12 w-auto md:h-16"
          />
        </a>
      ))}
    </Faixa>
  )
}
