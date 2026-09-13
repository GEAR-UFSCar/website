import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

const ROTAS = [
  "/",
  "/sobre",
  "/projetos",
  "/frentes",
  "/processo-seletivo",
  "/time",
  "/parceiros",
  "/privacidade",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const atualizado = new Date()

  return ROTAS.map((rota) => ({
    url: `${SITE_URL}${rota}`,
    lastModified: atualizado,
    changeFrequency: "monthly",
    priority: rota === "/" ? 1 : 0.8,
  }))
}
