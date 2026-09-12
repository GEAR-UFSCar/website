/**
 * Esqueleto das páginas da área de membros. Todas seguem a mesma anatomia —
 * kicker mono, título grande em duas linhas, um parágrafo e uma lista — então
 * o esqueleto reproduz essa silhueta em vez de mostrar um spinner genérico:
 * a página não "salta" quando o conteúdo real chega no lugar dos blocos.
 *
 * O pulsar vem do `animate-pulse` do Tailwind, que a regra de
 * prefers-reduced-motion em globals.css já neutraliza para quem pediu menos
 * movimento — aí fica um esqueleto estático, que continua comunicando espera.
 */
function Barra({ className }: { className: string }) {
  return <div className={`rounded-sm bg-[var(--gear-navy)] ${className}`} />
}

export function Carregando({ linhas = 4 }: { linhas?: number }) {
  return (
    <section
      // aria-busy + status: o leitor de tela anuncia a espera em vez de ler
      // uma sucessão de divs vazias
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="relative mx-auto max-w-5xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32"
    >
      <span className="sr-only">Carregando…</span>

      <div className="animate-pulse">
        {/* kicker */}
        <Barra className="h-3 w-44" />

        {/* título em duas linhas, como nas páginas reais */}
        <div className="mt-6 space-y-3">
          <Barra className="h-10 w-2/3 md:h-14" />
          <Barra className="h-10 w-1/2 md:h-14" />
        </div>

        {/* parágrafo de abertura */}
        <div className="mt-12 space-y-3">
          <Barra className="h-4 w-full max-w-2xl" />
          <Barra className="h-4 w-5/6 max-w-2xl" />
        </div>

        {/* contador mono */}
        <Barra className="mt-10 h-3 w-32" />

        {/* lista */}
        <div className="mt-12 space-y-px">
          {Array.from({ length: linhas }, (_, i) => (
            <div key={i} className="border-t border-white/10 py-6">
              <Barra className="h-5 w-1/2" />
              <Barra className="mt-3 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
