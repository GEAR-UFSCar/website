import type { Metadata } from "next"

import { OG_IMAGE } from "@/lib/site"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Parceiros } from "@/components/parceiros"

export const metadata: Metadata = {
  title: "Parceiros | GEAR",
  description:
    "Apoie o GEAR — visibilidade técnica, acesso a talento da UFSCar Sorocaba e associação a uma atividade de extensão registrada na ProEx-UFSCar.",
  // openGraph de page substitui o do layout inteiro (não mescla), então
  // title/description ficam por página e a imagem é repetida de propósito
  openGraph: {
    title: "Parceiros | GEAR",
    description:
      "Apoie o GEAR — visibilidade técnica, acesso a talento da UFSCar Sorocaba e associação a uma atividade de extensão registrada na ProEx-UFSCar.",
    url: "/parceiros",
    images: [OG_IMAGE],
  },
}

export default function ParceirosPage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Parceiros />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
