import type { Metadata } from "next"

import { OG_IMAGE, TOTAL_MEMBROS } from "@/lib/site"

import { Time } from "@/components/time"

export const metadata: Metadata = {
  title: "Time | GEAR",
  description:
    `Os ${TOTAL_MEMBROS} membros do GEAR, com a equipe fundadora distribuída nas frentes de Competição, Pesquisa e Projetos, e a orientação institucional na UFSCar Sorocaba.`,
  // openGraph de page substitui o do layout inteiro (não mescla), então
  // title/description ficam por página e a imagem é repetida de propósito
  openGraph: {
    title: "Time | GEAR",
    description:
      `Os ${TOTAL_MEMBROS} membros do GEAR, com a equipe fundadora distribuída nas frentes de Competição, Pesquisa e Projetos, e a orientação institucional na UFSCar Sorocaba.`,
    url: "/time",
    images: [OG_IMAGE],
  },
}

export default function TimePage() {
  return <Time />
}
