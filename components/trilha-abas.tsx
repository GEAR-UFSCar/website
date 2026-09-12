import Link from "next/link"

import { TRILHAS_ROTAS, type TrilhaNome } from "@/lib/administracao"

/**
 * Navegação entre as três trilhas. A aba ativa vem por prop em vez de
 * usePathname: a página já sabe qual trilha está mostrando, e assim isto
 * continua sendo Server Component — sem JS no cliente só para pintar uma aba.
 */
export function TrilhaAbas({ atual }: { atual: TrilhaNome }) {
  return (
    <nav aria-label="Trilhas" className="mt-10 flex flex-wrap border border-white/15">
      {TRILHAS_ROTAS.map((trilha) => {
        const ativa = trilha.nome === atual

        return (
          <Link
            key={trilha.slug}
            href={`/membros/trilhas/${trilha.slug}`}
            aria-current={ativa ? "page" : undefined}
            data-cursor-hover
            className={`flex-1 px-4 py-3 text-center font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
              ativa
                ? "bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {trilha.nome}
          </Link>
        )
      })}
    </nav>
  )
}
