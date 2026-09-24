"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowUpRight, createLucideIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { EMAIL_CONTATO } from "@/lib/site"

const EMAIL = EMAIL_CONTATO

/*
 * Ícone, não o nome escrito: três palavras lado a lado competiam com os links
 * de navegação do mesmo rodapé, que também são mono em caixa alta. O nome
 * continua existindo em `nome` — vira o aria-label, porque um <a> só com SVG
 * não tem nome acessível nenhum.
 */
/*
 * O lucide descontinuou os ícones de marca (questão de marca registrada) e vai
 * removê-los. Os traços abaixo são os mesmos da versão instalada, recriados
 * pela API pública — o visual não muda e a atualização da lib não quebra.
 */
const Instagram = createLucideIcon("Instagram", [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "a" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "b" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "c" }],
])
const Linkedin = createLucideIcon("Linkedin", [
  ["path", { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z", key: "a" }],
  ["rect", { width: "4", height: "12", x: "2", y: "9", key: "b" }],
  ["circle", { cx: "4", cy: "4", r: "2", key: "c" }],
])
const Github = createLucideIcon("Github", [
  [
    "path",
    {
      d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
      key: "a",
    },
  ],
  ["path", { d: "M9 18c-4.51 2-5-2-7-2", key: "b" }],
])

const sociais: Array<{ nome: string; href: string; Icone: LucideIcon }> = [
  { nome: "Instagram", href: "https://www.instagram.com/gear.ufscar/", Icone: Instagram },
  { nome: "LinkedIn", href: "https://www.linkedin.com/company/gearufscar/", Icone: Linkedin },
  { nome: "GitHub", href: "https://github.com/GEAR-UFSCar", Icone: Github },
]

/*
 * O relógio re-renderiza o rodapé inteiro uma vez por segundo. Cada transition
 * inline era um objeto novo por segundo, por elemento animado — fixos aqui.
 */
const SUAVE = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } as const
const RAPIDA = { duration: 0.3 } as const

export function Footer() {
  const [hora, setHora] = useState("")
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    // Fuso fixo: o rótulo diz Sorocaba, e getHours() daria a hora de quem visita.
    const formato = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
    const atualizarHora = () => setHora(formato.format(new Date()))

    atualizarHora()
    const intervalo = setInterval(atualizarHora, 1000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <footer className="relative">
      {/* CTA principal */}
      <motion.a
        href={`mailto:${EMAIL}`}
        data-cursor-hover
        className="relative block overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Cortina âmbar */}
        <motion.div
          className="absolute inset-0 bg-[var(--gear-amber)]"
          initial={{ y: "100%" }}
          animate={{ y: isHovered ? "0%" : "100%" }}
          transition={SUAVE}
        />

        {/* Conteúdo */}
        <div className="relative py-16 md:py-24 px-8 md:px-12 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <motion.h2
              className="font-sans text-4xl md:text-6xl lg:text-8xl font-light tracking-tight text-center md:text-left"
              animate={{
                color: isHovered ? "#081726" : "#EDF1F4",
              }}
              transition={RAPIDA}
            >
              Vamos <span className="italic">construir</span> juntos
            </motion.h2>

            <motion.div
              animate={{
                rotate: isHovered ? 45 : 0,
                color: isHovered ? "#081726" : "#EDF1F4",
              }}
              transition={RAPIDA}
            >
              <ArrowUpRight className="w-12 h-12 md:w-16 md:h-16" />
            </motion.div>
          </div>

          <motion.p
            animate={{ color: isHovered ? "#081726" : "#AEBAC4" }}
            transition={RAPIDA}
            className="relative mt-6 font-mono text-xs tracking-widest text-center md:text-left"
          >
            {EMAIL}
          </motion.p>
        </div>
      </motion.a>

      {/* Rodapé */}
      <div className="px-8 md:px-12 py-8 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Horário local */}
          <div className="font-mono text-xs tracking-widest text-muted-foreground">
            <span className="mr-2">HORÁRIO SOROCABA</span>
            <span className="text-foreground tabular-nums">{hora}</span>
          </div>

          {/* Sociais */}
          <div className="flex gap-6">
            {sociais.map((social) => (
              <a
                key={social.nome}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor-hover
                aria-label={`${social.nome} da GEAR — abre em nova aba`}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                <social.Icone className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </a>
            ))}
          </div>

          {/* Assinatura + privacidade (exigência de LGPD: aviso acessível de
              qualquer página) */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/ingressar"
              data-cursor-hover
              className="font-mono text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              INGRESSAR
            </Link>
            <Link
              href="/entrar"
              data-cursor-hover
              className="font-mono text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              ÁREA DE MEMBROS
            </Link>
            <Link
              href="/privacidade"
              data-cursor-hover
              className="font-mono text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              PRIVACIDADE
            </Link>
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              GEAR · UFSCAR SOROCABA · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
