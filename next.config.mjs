/** @type {import('next').NextConfig} */

/*
 * Cabeçalhos de segurança. O site não tinha nenhum — `curl -sI` não devolvia
 * CSP, HSTS nem X-Frame-Options. Numa aplicação com área restrita isso permite
 * embutir /membros num iframe de terceiro e capturar cliques nos controles de
 * cargo e aprovação.
 *
 * A CSP precisa de 'unsafe-inline' em style-src: o Next injeta estilos inline
 * para as fontes e o framer-motion escreve style no elemento a cada frame.
 * 'unsafe-eval' fica fora em produção; o Turbopack só precisa dele em dev.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
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

const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },

  async headers() {
    return [
      {
        source: "/:caminho*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // redundante com frame-ancestors, mas cobre navegador antigo
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // sem isto, URLs de /membros vazam no Referer para domínios externos
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
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
      { source: "/trilhas", destination: "/frentes", permanent: true },
      { source: "/membros/trilhas/:caminho*", destination: "/membros/frentes/:caminho*", permanent: true },
    ]
  },
}

export default nextConfig
