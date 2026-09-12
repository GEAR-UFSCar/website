import type { Metadata } from "next"

import { OG_IMAGE } from "@/lib/site"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Trilhas } from "@/components/trilhas"

export const metadata: Metadata = {
  title: "Trilhas | GEAR",
  description:
    "As três trilhas do GEAR — Competição, Pesquisa e Projetos: o que cada uma constrói, quem lidera e o que entrega.",
  // openGraph de page substitui o do layout inteiro (não mescla), então
  // title/description ficam por página e a imagem é repetida de propósito
  openGraph: {
    title: "Trilhas | GEAR",
    description:
      "As três trilhas do GEAR — Competição, Pesquisa e Projetos: o que cada uma constrói, quem lidera e o que entrega.",
    url: "/trilhas",
    images: [OG_IMAGE],
  },
}

export default function TrilhasPage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Trilhas />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
