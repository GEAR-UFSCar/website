/*
 * "Pular para o conteúdo": primeiro item da ordem de Tab em toda página.
 *
 * Invisível até receber foco. Sem ele, quem navega só pelo teclado ou por
 * leitor de tela atravessa o menu inteiro a cada página antes de chegar ao
 * texto (WCAG 2.4.1, Ignorar blocos). O destino é o <main id="conteudo">;
 * o tabIndex={-1} nele faz o foco ir de verdade para lá, e não só a rolagem.
 */
export function PularParaConteudo() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:bg-[var(--gear-amber)] focus:px-4 focus:py-3 focus:font-mono focus:text-[11px] focus:tracking-[0.15em] focus:uppercase focus:text-[var(--gear-ink)]"
    >
      Pular para o conteúdo
    </a>
  )
}
