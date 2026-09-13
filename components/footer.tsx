"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { EMAIL_CONTATO } from "@/lib/site"

const EMAIL = EMAIL_CONTATO

const sociais = [
  { nome: "Instagram", href: "https://www.instagram.com/gear.ufscar/" },
  { nome: "LinkedIn", href: "https://www.linkedin.com/company/gearufscar/" },
]

export function Footer() {
  const [hora, setHora] = useState("")
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const atualizarHora = () => {
      const agora = new Date()
      const horas = agora.getHours().toString().padStart(2, "0")
      const minutos = agora.getMinutes().toString().padStart(2, "0")
      const segundos = agora.getSeconds().toString().padStart(2, "0")
      setHora(`${horas}:${minutos}:${segundos}`)
    }

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
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />

        {/* Conteúdo */}
        <div className="relative py-16 md:py-24 px-8 md:px-12 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <motion.h2
              className="font-sans text-4xl md:text-6xl lg:text-8xl font-light tracking-tight text-center md:text-left"
              animate={{
                color: isHovered ? "#081726" : "#EDF1F4",
              }}
              transition={{ duration: 0.3 }}
            >
              Vamos <span className="italic">construir</span> juntos
            </motion.h2>

            <motion.div
              animate={{
                rotate: isHovered ? 45 : 0,
                color: isHovered ? "#081726" : "#EDF1F4",
              }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpRight className="w-12 h-12 md:w-16 md:h-16" />
            </motion.div>
          </div>

          <motion.p
            animate={{ color: isHovered ? "#081726" : "#AEBAC4" }}
            transition={{ duration: 0.3 }}
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
          <div className="flex gap-8">
            {sociais.map((social) => (
              <a
                key={social.nome}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor-hover
                className="font-mono text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                {social.nome}
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
