import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { ProcessoSeletivo } from "@/components/processo-seletivo"

export const metadata: Metadata = {
  title: "Processo Seletivo | GEAR",
  description:
    "Edital do processo seletivo do GEAR — até 20 vagas, abertas a qualquer curso de graduação da UFSCar Sorocaba, sem pré-requisito técnico.",
}

export default function ProcessoSeletivoPage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <ProcessoSeletivo />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
