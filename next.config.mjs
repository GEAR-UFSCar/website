/** @type {import('next').NextConfig} */

import { politicaCsp } from "./lib/csp.mjs"

/*
 * Cabeçalhos de segurança. O site não tinha nenhum — `curl -sI` não devolvia
 * CSP, HSTS nem X-Frame-Options. Numa aplicação com área restrita isso permite
 * embutir /membros num iframe de terceiro e capturar cliques nos controles de
 * cargo e aprovação.
 *
 * A CSP mora em lib/csp.mjs. Aqui sai a do site PÚBLICO; /membros fica de
 * fora deste bloco porque recebe, do proxy, a versão com nonce — mandar as
 * duas faria o navegador aplicar a interseção, e o motivo de cada uma
 * existir ficaria escondido.
 */
const cabecalhosComuns = [
  // redundante com frame-ancestors, mas cobre navegador antigo
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // sem isto, URLs de /membros vazam no Referer para domínios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  /*
   * Isolamento de origem. COOP same-origin corta a ligação entre a aba do site
   * e qualquer janela aberta por/para outra origem (window.opener), o que
   * fecha a família de ataques por janela cruzada. O site não usa popup de
   * login de terceiro (é e-mail e senha), então nada depende disso.
   * CORP same-site impede que OUTRO site embuta imagens, fontes ou scripts
   * daqui. Rastreadores de link (WhatsApp, Slack, buscadores) buscam a
   * og:image do lado do servidor, e CORP só vale para navegador.
   *
   * Efeito conhecido: a barra de comentários da Vercel nos deploys de preview
   * abre uma janela de login e pode perder a ligação com a aba. É só em
   * preview; em produção ela não existe.
   */
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
]

const nextConfig = {
  // O Next responde "X-Powered-By: Next.js" por padrão. Não é falha, mas
  // entrega o framework de graça a quem varre sites.
  poweredByHeader: false,

  turbopack: {
    root: import.meta.dirname,
  },

  async headers() {
    return [
      { source: "/:caminho*", headers: cabecalhosComuns },
      {
        // tudo menos /membros e o que vem abaixo dele (ver lib/csp.mjs)
        source: "/((?!membros(?:/|$)).*)",
        headers: [{ key: "Content-Security-Policy", value: politicaCsp() }],
      },
    ]
  },

  /*
   * /trilhas foi renomeada para /frentes. O endereço antigo já saiu daqui em
   * sitemap, og:url e links compartilhados, então some com redirect permanente
   * em vez de virar 404 — o 308 também repassa o peso de SEO para o novo.
   */
  async redirects() {
    return [
      // /trilhas -> /frentes foi a renomeação; /frentes virou seção de /sobre
      { source: "/trilhas", destination: "/sobre#frentes", permanent: true },
      { source: "/frentes", destination: "/sobre#frentes", permanent: true },
      { source: "/membros/trilhas/:caminho*", destination: "/membros/sprints/:caminho*", permanent: true },
      { source: "/membros/frentes/:caminho*", destination: "/membros/sprints/:caminho*", permanent: true },
    ]
  },
}

export default nextConfig
