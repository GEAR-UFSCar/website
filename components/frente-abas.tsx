import Link from "next/link"

import { FRENTES_ROTAS, type FrenteNome } from "@/lib/administracao"

/**
 * Navegação entre as três frentes. A aba ativa vem por prop em vez de
 * usePathname: a página já sabe qual frente está mostrando, e assim isto
 * continua sendo Server Component — sem JS no cliente só para pintar uma aba.
 */
export function FrenteAbas({ atual }: { atual: FrenteNome }) {
  return (
    <nav aria-label="Frentes" className="mt-10 flex flex-wrap border border-white/15">
      {FRENTES_ROTAS.map((frente) => {
        const ativa = frente.nome === atual

        return (
          <Link
            key={frente.slug}
            href={`/membros/sprints/${frente.slug}`}
            aria-current={ativa ? "page" : undefined}
            data-cursor-hover
            className={`flex-1 px-4 py-3 text-center font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
              ativa
                ? "bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {frente.nome}
          </Link>
        )
      })}
    </nav>
  )
}
