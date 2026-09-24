import type { Metadata } from "next"

import { OG_IMAGE } from "@/lib/site"

import { Sobre } from "@/components/sobre"
import { VitrineMetricas } from "@/components/vitrine-metricas"

export const metadata: Metadata = {
  title: "Sobre | GEAR",
  description:
    "Grupo de Extensão em Automação e Robótica da UFSCar Sorocaba — missão, jornada de formação e vínculo institucional.",
  // openGraph de page substitui o do layout inteiro (não mescla), então
  // title/description ficam por página e a imagem é repetida de propósito
  openGraph: {
    title: "Sobre | GEAR",
    description:
      "Grupo de Extensão em Automação e Robótica da UFSCar Sorocaba — missão, jornada de formação e vínculo institucional.",
    url: "/sobre",
    images: [OG_IMAGE],
  },
}

/*
 * Revalidação de hora em hora: a página lê os números do semestre do banco,
 * mas eles mudam quando alguém fecha um indicador — não a cada visita. Sem
 * isto, /sobre deixaria de ser estática e passaria a render por requisição
 * para mostrar um número que muda uma vez por semana.
 */
export const revalidate = 3600

export default function SobrePage() {
  return (
    <>
      <Sobre />
      <VitrineMetricas />
    </>
  )
}
