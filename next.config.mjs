/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
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
