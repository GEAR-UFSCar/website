/**
 * URL pública do site, usada por metadata, OpenGraph, robots e sitemap.
 *
 * Ordem: variável explícita > domínio de produção da Vercel > localhost.
 * Enquanto NEXT_PUBLIC_SITE_URL não estiver definida em produção, os links
 * absolutos (og:url, og:image, sitemap) apontarão para localhost — defina-a
 * no painel da Vercel antes do deploy.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")

/** Imagem padrão de compartilhamento: a foto posada da equipe. */
export const OG_IMAGE = {
  url: "/fotos/universidade-aberta/foto-06.jpg",
  width: 1600,
  height: 900, // dimensões medidas no arquivo
  alt: "Equipe da GEAR reunida durante a Universidade Aberta UFSCar 2026",
}

/**
 * Versão do Regimento Interno (com o Código de Conduta) aceita no cadastro.
 * Gravada em termos_aceitos.versao_documento — ver supabase/012_termos_aceitos.sql.
 * Subir este número faz o próximo cadastro registrar um aceite novo; quem já
 * aceitou a versão anterior continua com o registro dela, não com esta.
 */
export const VERSAO_TERMOS = "1.0"
