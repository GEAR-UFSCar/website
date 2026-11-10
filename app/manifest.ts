import type { MetadataRoute } from "next"

/**
 * Deixa a área de membros ser instalada na tela inicial do celular. Abre
 * direto em Hoje; sem sessão, o portão de /membros leva ao login.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GEAR — área de membros",
    short_name: "GEAR",
    description: "Sprints, agenda, documentos e formação do GEAR, UFSCar Sorocaba.",
    start_url: "/membros",
    scope: "/",
    display: "standalone",
    background_color: "#081726",
    theme_color: "#081726",
    lang: "pt-BR",
    icons: [{ src: "/gear-icon-g.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }
}
