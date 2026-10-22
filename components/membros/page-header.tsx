import type { ReactNode } from "react"

/**
 * Cabeçalho de página da área de membros: o h1 e, se houver, uma frase de
 * apoio. É o único h1 de cada tela; a barra superior não repete o título.
 */
export function PageHeader({
  titulo,
  children,
  acoes,
}: {
  titulo: string
  children?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        <h1 className="font-sans text-3xl font-normal tracking-tight text-balance md:text-4xl">{titulo}</h1>
        {children && (
          <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
            {children}
          </p>
        )}
      </div>
      {acoes && <div className="flex flex-wrap gap-3">{acoes}</div>}
    </header>
  )
}
