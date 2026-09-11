import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Parceiros } from "@/components/parceiros"

export const metadata: Metadata = {
  title: "Parceiros | GEAR",
  description:
    "Apoie o GEAR — visibilidade técnica, acesso a talento da UFSCar Sorocaba e as necessidades abertas da trilha de Competição.",
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
