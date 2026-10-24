"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"

import { partesGear } from "@/lib/calendario"
import s from "./calendario-clean.module.css"

const assinar = (aviso: () => void) => {
  const relogio = setInterval(aviso, 30_000)
  return () => clearInterval(relogio)
}
// Minutos desde a meia-noite em Brasília — um número, então o React só re-renderiza quando o minuto muda.
const agoraEmMinutos = () => partesGear(new Date().toISOString()).minutos
// No servidor não há "agora" que valha: a linha só aparece depois da hidratação.
const semAgora = () => null

/**
 * A linha vermelha-âmbar do "agora" na coluna de hoje.
 *
 * Fica no cliente porque o servidor renderiza uma vez e a página pode ficar
 * aberta o dia inteiro; useSyncExternalStore evita o descompasso de hidratação
 * (o servidor não sabe a hora que o navegador vai ver).
 */
export function AgoraLinha({ de, pxPorHora, horas }: { de: number; pxPorHora: number; horas: number }) {
  const minutos = useSyncExternalStore(assinar, agoraEmMinutos, semAgora)
  if (minutos == null) return null
  const topo = ((minutos - de * 60) * pxPorHora) / 60
  if (topo < 0 || topo > horas * pxPorHora) return null
  return (
    <div className={s.agora} style={{ top: topo }} aria-hidden="true">
      <span className={s.agoraPonto} />
    </div>
  )
}

/**
 * Leva a grade até a primeira coisa do dia — ou até o horário atual quando a
 * semana inclui hoje — para que quem abre a semana não comece olhando às 7h
 * de uma coluna vazia. Só rola uma vez por montagem e só dentro do contêiner.
 */
export function RolarParaAgora({ alvoMin, de, pxPorHora }: { alvoMin: number; de: number; pxPorHora: number }) {
  const feito = useRef(false)
  useEffect(() => {
    if (feito.current) return
    feito.current = true
    const corpo = document.querySelector<HTMLElement>("[data-grade-corpo]")
    if (!corpo) return
    const topo = Math.max(0, ((alvoMin - de * 60) * pxPorHora) / 60 - 80)
    corpo.scrollTo({ top: topo })
  }, [alvoMin, de, pxPorHora])
  return null
}
