"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

/*
 * Moldura das telas de acesso: entrar, recuperar senha, definir nova senha e
 * completar perfil.
 *
 * As quatro repetiam a mesma section, o mesmo motion.div, o mesmo max-w-md e
 * o mesmo par etiqueta/título — com pequenas divergências de espaçamento que
 * ninguém escolheu, só herdou de quem copiou de quem. Agora a moldura é uma
 * só e cada tela traz o que tem de próprio: o formulário.
 *
 * TIMING: o mesmo de Surge e das seções editoriais — 0.8s, y:20. Aqui a
 * animação é `animate` e não `whileInView`: a tela de acesso já nasce visível,
 * não há rolagem a esperar.
 */

type Props = {
  /** Linha mono acima do título. Diz onde a pessoa está. */
  etiqueta: string
  /** Primeira linha do título, em caixa alta. */
  titulo: string
  /** Segunda linha, em itálico — o par editorial do resto do site. */
  destaque: string
  /** Texto de apoio abaixo do título. */
  children?: ReactNode
  /** O formulário, ou o que a tela tiver de interativo. */
  corpo: ReactNode
  /** Links de saída no rodapé do quadro. */
  rodape?: ReactNode
}

export function AcessoQuadro({ etiqueta, titulo, destaque, children, corpo, rodape }: Props) {
  return (
    <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mx-auto max-w-md"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">{etiqueta}</p>
        <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
          {titulo}
          <br />
          <span className="italic">{destaque}</span>
        </h1>

        {children && (
          <div className="mt-8 space-y-4 font-sans text-base font-light leading-relaxed text-muted-foreground">
            {children}
          </div>
        )}

        <div className="mt-10">{corpo}</div>

        {rodape && (
          <div className="mt-10 border-t border-white/10 pt-6 flex flex-wrap gap-x-6 gap-y-3">
            {rodape}
          </div>
        )}
      </motion.div>
    </section>
  )
}

/** Link de rodapé das telas de acesso, no tom mono do projeto. */
export const linkAcesso =
  "font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
