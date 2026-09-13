import type { Metadata } from "next"

import { OG_IMAGE } from "@/lib/site"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Frentes } from "@/components/frentes"

export const metadata: Metadata = {
  title: "Frentes | GEAR",
  description:
    "As três frentes do GEAR — Competição, Pesquisa e Projetos: o que cada uma constrói, quem diretora e o que entrega.",
  // openGraph de page substitui o do layout inteiro (não mescla), então
  // title/description ficam por página e a imagem é repetida de propósito
  openGraph: {
    title: "Frentes | GEAR",
    description:
      "As três frentes do GEAR — Competição, Pesquisa e Projetos: o que cada uma constrói, quem diretora e o que entrega.",
    url: "/frentes",
    images: [OG_IMAGE],
  },
}

export default function FrentesPage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Frentes />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
