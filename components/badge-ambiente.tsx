/**
 * Selo de contexto do ambiente interno, no alto de toda página de /membros.
 *
 * POR QUE NO LAYOUT, E NÃO NA BARRA
 * A barra é navegação: ela diz onde a pessoa está. Este selo diz em que
 * ambiente ela está — a distinção importa porque as onze páginas de /membros
 * são visualmente parecidas com as públicas, e é aqui que se mostra que o que
 * está na tela não é o site. Vindo do layout, nenhuma página precisa lembrar
 * de repeti-lo, e nenhuma pode esquecer.
 *
 * A LARGURA ACOMPANHA O CONTEÚDO
 * `max-w-6xl px-8 md:px-12` é o contêiner da maioria das páginas daqui, então
 * o selo cai alinhado à direita do texto, não da janela. Três páginas usam
 * `max-w-5xl` (metas, mural, aprendizagem) e nelas o selo fica um pouco além
 * da borda do conteúdo em telas muito largas — preço aceitável por não ter de
 * editar onze páginas nem inventar um mecanismo para o layout adivinhar a
 * largura da filha.
 *
 * Server Component: é texto estático. O ponto piscando é CSS, não estado.
 */
export function BadgeAmbiente() {
  return (
    // `nao-imprimir`: a aba ProEx de /membros/metricas é feita para virar
    // anexo em papel, e "ambiente interno" não é informação do documento.
    <div className="nao-imprimir mx-auto flex max-w-6xl justify-end px-8 pt-8 md:px-12 md:pt-10">
      <p
        className="inline-flex items-center gap-2 border border-[var(--gear-amber)]/40 bg-[var(--gear-amber)]/5 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)]"
        // O selo é informativo e repetido em toda página; anunciá-lo a cada
        // navegação seria ruído para quem usa leitor de tela.
        aria-hidden="true"
      >
        {/*
          O ponto é decoração — o texto "Ativo" já carrega o estado. Fica num
          <span> próprio para poder pulsar sem arrastar o texto com ele.
        */}
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gear-amber)] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--gear-amber)]" />
        </span>
        Ambiente interno · Ativo
      </p>
    </div>
  )
}
