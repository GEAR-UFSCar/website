import Link from "next/link"
import type { ReactNode } from "react"

/** Estado vazio: diz o que falta e, quando há, aonde ir para preencher. */
export function EstadoVazio({ children, href, acao }: { children: ReactNode; href?: string; acao?: string }) {
  return (
    <div className="border border-dashed border-white/15 p-6">
      <p className="max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">{children}</p>
      {href && acao && (
        <Link
          href={href}
          className="mt-4 inline-flex min-h-11 items-center font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--gear-amber)] hover:underline"
        >
          {acao} →
        </Link>
      )}
    </div>
  )
}
