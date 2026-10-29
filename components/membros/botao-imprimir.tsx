"use client"

/** Abre o diálogo de impressão do navegador, que também salva em PDF. */
export function BotaoImprimir({ rotulo = "Imprimir / PDF" }: { rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-cursor-hover
      className="nao-imprimir min-h-11 border border-[var(--gear-amber)] px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"
    >
      {rotulo}
    </button>
  )
}
