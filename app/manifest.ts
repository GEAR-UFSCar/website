import type { MetadataRoute } from "next"

/**
 * Permite "Adicionar à tela inicial": quem usa a área de membros pelo celular
 * abre direto em /membros, sem barra do navegador. Ícones em public/icone-*.png
 * (engrenagem âmbar sobre o ink, com margem para a máscara redonda do Android).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GEAR · UFSCar Sorocaba",
    short_name: "GEAR",
    description: "Área de membros do GEAR, Grupo de Extensão em Automação e Robótica da UFSCar Sorocaba.",
    lang: "pt-BR",
    start_url: "/membros",
    scope: "/",
    display: "standalone",
    background_color: "#081726",
    theme_color: "#081726",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
