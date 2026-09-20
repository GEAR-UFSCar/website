import type { CookieOptions } from "@supabase/ssr"

/*
 * "Lembrar de mim": quanto tempo os cookies de sessão sobrevivem.
 *
 * ── Por que não é `cookieOptions.maxAge` ───────────────────────────────────
 * O caminho óbvio seria passar `cookieOptions: { maxAge }` ao criar o cliente.
 * Não funciona no @supabase/ssr 0.12.7 instalado aqui: em TODA escrita de
 * cookie a lib monta as opções assim
 *
 *     { ...DEFAULT_COOKIE_OPTIONS, ...options?.cookieOptions,
 *       maxAge: DEFAULT_COOKIE_OPTIONS.maxAge }
 *
 * (dist/main/cookies.js, linhas 230 e 470 — navegador e servidor). O maxAge
 * que passamos entra pelo spread e é sobrescrito logo em seguida pelo padrão
 * de 400 dias. Não há opção pública que mude isso.
 *
 * ── O que fazemos em vez disso ─────────────────────────────────────────────
 * A lib deixa configurar os MÉTODOS de cookie (`cookies.getAll`/`setAll`), e
 * é nesse ponto que a validade final é decidida: pegamos as opções que ela
 * entrega e corrigimos o maxAge antes de gravar. Isso vale para os três
 * lugares que escrevem cookie de auth — cliente do navegador, proxy e cliente
 * de servidor — e continua valendo nos refreshes de token, que é o detalhe
 * que a reescrita via document.cookie logo após o login não cobriria: o
 * primeiro refresh (~1h) regravaria tudo com os 400 dias de volta.
 *
 * A escolha da pessoa viaja num cookie-marcador próprio, lido no momento da
 * escrita. Assim o singleton do createBrowserClient não precisa ser recriado
 * e o servidor enxerga a mesma preferência sem estado compartilhado.
 */

/** Cookie-marcador com a escolha do checkbox. Não é segredo, não é sessão. */
export const COOKIE_LEMBRAR = "gear-lembrar"

/** 30 dias. Renovado a cada refresh, então é janela deslizante de inatividade. */
export const MAX_AGE_LEMBRAR = 30 * 24 * 60 * 60

/** Ausente vale como "não lembrar" — o padrão seguro é a sessão curta. */
export function querLembrar(valor: string | undefined | null): boolean {
  return valor === "1"
}

/**
 * Corrige a validade de um cookie de auth que o @supabase/ssr quer gravar.
 *
 * Lembrar ligado  → cookie persistente de 30 dias.
 * Lembrar desligado → cookie de sessão (sem Max-Age nem Expires): o navegador
 * o descarta ao fechar.
 */
export function validadeDaSessao(options: CookieOptions, lembrar: boolean): CookieOptions {
  // maxAge 0 é remoção (logout, limpeza de chunk antigo). Mexer aqui
  // transformaria um "apague este cookie" em "guarde por 30 dias".
  if (options.maxAge === 0) return options

  return {
    ...options,
    maxAge: lembrar ? MAX_AGE_LEMBRAR : undefined,
    expires: undefined,
  }
}
