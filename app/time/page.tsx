import type { Metadata } from "next"

import { OG_IMAGE } from "@/lib/site"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Time } from "@/components/time"

export const metadata: Metadata = {
  title: "Time | GEAR",
  description:
    "Os 11 membros fundadores do GEAR, distribuídos nas frentes de Competição, Pesquisa e Projetos, e a orientação institucional na UFSCar Sorocaba.",
  // openGraph de page substitui o do layout inteiro (não mescla), então
  // title/description ficam por página e a imagem é repetida de propósito
  openGraph: {
    title: "Time | GEAR",
    description:
      "Os 11 membros fundadores do GEAR, distribuídos nas frentes de Competição, Pesquisa e Projetos, e a orientação institucional na UFSCar Sorocaba.",
    url: "/time",
    images: [OG_IMAGE],
  },
}

export default function TimePage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Time />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
