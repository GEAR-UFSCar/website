import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Sobre } from "@/components/sobre"

export const metadata: Metadata = {
  title: "Sobre | GEAR",
  description:
    "Grupo de Extensão em Automação e Robótica da UFSCar Sorocaba — missão, jornada de formação e vínculo institucional.",
}

export default function SobrePage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Sobre />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
