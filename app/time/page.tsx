import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Time } from "@/components/time"

export const metadata: Metadata = {
  title: "Time | GEAR",
  description:
    "Os 11 membros fundadores do GEAR — diretoria e as trilhas de Competição, Pesquisa e Projetos — e a orientação institucional na UFSCar Sorocaba.",
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
