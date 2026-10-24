import type { ReactNode } from "react"
import { ChevronDown, Plus } from "lucide-react"

/*
 * Bloco que abre e fecha: o formulário de criação fica a um clique, mas não
 * toma a primeira tela de quem veio ver a própria lista.
 *
 * É <details>/<summary> de propósito, e não um estado de React:
 *   · funciona sem JavaScript e já é operável por Enter e Espaço;
 *   · leitores de tela anunciam "recolhido/expandido" sozinhos;
 *   · o servidor decide `aberto` (ex.: lista vazia → formulário já aberto),
 *     então não há piscada de hidratação.
 *
 * O formulário dentro continua montado quando fechado, o que preserva o que a
 * pessoa digitou se ela fechar sem querer.
 */
export function Recolhivel({
  rotulo,
  aberto = false,
  children,
  className = "",
}: {
  rotulo: string
  aberto?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <details open={aberto} className={`group ${className}`}>
      <summary
        className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 border border-linha-forte px-4 font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--gear-amber)] transition-colors duration-200 hover:border-[var(--gear-amber)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gear-amber)] [&::-webkit-details-marker]:hidden"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {rotulo}
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-6">{children}</div>
    </details>
  )
}
