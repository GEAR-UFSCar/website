import type { ReactNode } from "react"

const TONS = {
  neutro: "border-white/20 text-muted-foreground",
  ativo: "border-[var(--gear-amber)] text-[var(--gear-amber)]",
  alerta: "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]",
} as const

/** Etiqueta de estado. Âmbar cheio (alerta) só para o que exige ação. */
export function Pilula({ children, tom = "neutro" }: { children: ReactNode; tom?: keyof typeof TONS }) {
  return (
    <span className={`inline-block border px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase ${TONS[tom]}`}>
      {children}
    </span>
  )
}
