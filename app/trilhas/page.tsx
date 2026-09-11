import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Trilhas } from "@/components/trilhas"

export const metadata: Metadata = {
  title: "Trilhas | GEAR",
  description:
    "As três trilhas do GEAR — Competição, Pesquisa e Projetos: o que cada uma constrói, quem lidera e o que entrega.",
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
