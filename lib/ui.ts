/**
 * Classes repetidas pela interface inteira. Ficavam copiadas em cada página —
 * o botão âmbar aparecia em 8 arquivos, o "voltar" em 10 — e qualquer ajuste
 * de identidade exigia varrer tudo.
 *
 * As constantes trazem só aparência. Espaçamento e largura (mt-*, w-full,
 * inline-block, text-center) ficam no ponto de uso, que é quem sabe do layout.
 */

/** Ação principal: contorno âmbar que preenche no hover. */
export const botaoPrimario =
  "border border-[var(--gear-amber)] bg-transparent px-8 py-4 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"

/** Ação secundária: contorno discreto que clareia no hover. */
export const botaoSecundario =
  "border border-white/20 bg-transparent px-8 py-4 font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"

/** Complemento do botão primário em <button> que pode ficar desabilitado. */
export const botaoDesabilitavel =
  "disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--gear-amber)]"

/*
 * As três classes de campo escondem o anel padrão do navegador (outline-none)
 * e repõem o foco com ring âmbar e offset sobre o ink — o anel padrão fica
 * colado na borda e some contra o fundo escuro. Sem a reposição, quem navega
 * por teclado ficava sem saber em que campo estava: a única pista era a borda
 * de 1px mudando de cor.
 */

/** Campo de formulário em página cheia (login, completar perfil). */
export const campoGrande =
  "w-full bg-[var(--gear-ink)] border border-white/15 px-4 py-3 font-sans text-base font-light text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors duration-300 focus:border-[var(--gear-amber)] focus-visible:ring-2 focus-visible:ring-[var(--gear-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gear-ink)] disabled:opacity-50"

/** Campo de formulário em tabela/painel, onde o espaço é curto. */
export const campoBase =
  "w-full bg-[var(--gear-ink)] border border-white/15 px-3 py-2.5 font-sans text-sm font-light text-foreground outline-none transition-colors duration-300 focus:border-[var(--gear-amber)] focus-visible:ring-2 focus-visible:ring-[var(--gear-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gear-ink)] disabled:opacity-50"

/** Rótulo mono maiúsculo acima de um campo. */
export const rotuloBase =
  "block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2"

/*
 * Select inline que grava sozinho, usado dentro das tabelas do painel.
 * min-h-11 = 44px, o mínimo recomendado para toque: antes eram ~27px
 * (px-2 py-1.5), pequeno demais para o dedo justamente onde o espaço é
 * apertado. A largura continua vindo da coluna da tabela.
 */
export const selectInline =
  "w-full min-h-11 bg-transparent border border-white/15 px-3 py-2.5 font-mono text-[11px] text-foreground outline-none transition-colors duration-300 focus:border-[var(--gear-amber)] focus-visible:ring-2 focus-visible:ring-[var(--gear-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gear-ink)] disabled:opacity-50"
