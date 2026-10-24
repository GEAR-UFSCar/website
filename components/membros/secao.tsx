import type { ReactNode } from "react"

/** Bloco com título h2. Substitui eyebrow + h2 itálico. */
export function Secao({
  titulo,
  id,
  acoes,
  children,
  className = "mt-10",
}: {
  titulo: string
  id?: string
  acoes?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={className}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-linha pt-5">
        <h2 className="font-sans text-xl font-normal tracking-tight md:text-2xl">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  )
}
