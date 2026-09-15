"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

/*
 * As 12 rotas de membro são Server Components — fazem `await` no Supabase —
 * e motion.* só existe no cliente. Em vez de convertê-las (o que jogaria a
 * busca de dados para o navegador), este invólucro fica no cliente e recebe
 * como `children` a árvore já renderizada no servidor. O conteúdo continua
 * vindo pronto do servidor; só a animação roda aqui.
 *
 * TIMING — o mesmo de components/sobre.tsx e processo-seletivo.tsx:
 * duration 0.8, initial y: 20, whileInView, viewport once. Nenhuma terceira
 * variação de tempo entra no projeto.
 *
 * STAGGER — 0.05 por item, metade do público (0.1). Lista de dados não pede
 * o mesmo peso dramático de uma seção editorial: com 0.1, uma tabela de 15
 * linhas levaria 1,5s só para terminar de aparecer.
 */

const DURACAO = 0.8
const STAGGER = 0.05
/** Teto do atraso acumulado: lista longa não pode virar espera. */
const ATRASO_MAXIMO = 0.4

const TAGS = {
  div: motion.div,
  p: motion.p,
  li: motion.li,
  tr: motion.tr,
  article: motion.article,
  section: motion.section,
} as const

type Props = {
  children: ReactNode
  className?: string
  /** Posição na lista; gera o stagger. Omitir em bloco único. */
  index?: number
  /** Atraso fixo, para escalonar blocos irmãos de uma página. */
  delay?: number
  /** Elemento renderizado — `tr` e `li` importam para o HTML continuar válido. */
  as?: keyof typeof TAGS
}

export function Surge({ children, className, index, delay = 0, as = "div" }: Props) {
  const Tag = TAGS[as]
  const atraso = delay + (index === undefined ? 0 : Math.min(index * STAGGER, ATRASO_MAXIMO))

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: DURACAO, delay: atraso }}
    >
      {children}
    </Tag>
  )
}
