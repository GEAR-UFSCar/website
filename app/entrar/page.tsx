import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Entrar } from "@/components/entrar"

export const metadata: Metadata = {
  title: "Entrar | GEAR",
  description: "Acesso à área de membros do GEAR — UFSCar Sorocaba.",
  robots: { index: false, follow: true },
}

export default function EntrarPage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Entrar />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
