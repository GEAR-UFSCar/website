/*
 * Content-Security-Policy do site, num lugar só.
 *
 * Arquivo .mjs (e não .ts) porque são DOIS consumidores: next.config.mjs, que
 * o Node carrega sem passar pelo TypeScript, e o proxy (lib/supabase/
 * sessao-proxy.ts). Antes a política vivia inteira dentro do next.config, e
 * uma segunda cópia no proxy seria duas listas livres para divergir.
 *
 * ── DUAS POLÍTICAS, E A ESCOLHA É PELA ROTA ────────────────────────────────
 *
 * Área de membros (/membros/*): script-src com NONCE + 'strict-dynamic', sem
 * 'unsafe-inline'. É onde a página mostra texto que outras pessoas escreveram
 * — avisos do mural, atas, metas públicas, diário de sprint — e portanto onde
 * um XSS teria o que roubar: a sessão de quem tem cargo. Com nonce, um
 * <script> injetado não roda, porque não tem o nonce daquela resposta.
 *
 * Site público: continua com 'unsafe-inline'. Nonce exige renderização
 * dinâmica (a documentação do Next é explícita: um nonce novo por resposta
 * não cabe numa página gerada no build), e isso tiraria o cache de CDN de
 * /, /sobre, /projetos… — páginas que não mostram nada escrito por usuário.
 * O ganho de segurança ali seria pequeno; o custo, toda visita indo ao
 * servidor. A área de membros já é dinâmica (lê cookie), então lá o nonce
 * sai de graça.
 *
 * style-src segue com 'unsafe-inline' nas duas: o Next injeta estilos inline
 * para as fontes e o framer-motion escreve `style` no elemento a cada frame.
 * Estilo injetado não executa código; o risco que importa é o de script.
 */

const dev = process.env.NODE_ENV === "development"

/**
 * @param {{ nonce?: string }} [opcoes] com `nonce`, a política estrita da área
 *   de membros; sem, a do site público.
 * @returns {string}
 */
export function politicaCsp(opcoes = {}) {
  const { nonce } = opcoes

  const scriptSrc = nonce
    ? // 'strict-dynamic': scripts carregados POR um script com nonce (os chunks
      // do Next, o Vercel Analytics) herdam a confiança, sem listar domínio.
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self' 'unsafe-inline'"

  return [
    "default-src 'self'",
    // 'unsafe-eval' só em dev: o React usa eval para reconstruir pilhas de erro.
    scriptSrc + (dev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // blob: e data: são usados pelo canvas WebGL da engrenagem
    "img-src 'self' data: blob: https://*.supabase.co",
    // o cliente Supabase fala com a API e com o Storage do projeto
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ")
}

/** Prefixo das rotas que recebem a política com nonce. */
export const ROTAS_COM_NONCE = "/membros"
