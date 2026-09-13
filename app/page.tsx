import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { Works } from "@/components/works"
import { UniversidadeAberta } from "@/components/universidade-aberta"
import { TechMarquee } from "@/components/tech-marquee"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { SectionBlend } from "@/components/section-blend"

export default function Home() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <Hero />
        <SectionBlend />
        {/*
         * Works antes de About de propósito. "Como Construímos a GEAR" traz
         * decisão com justificativa; o bloco seguinte traz o estado atual da
         * entidade. Na ordem anterior, a leitura interpretativa vinha antes da
         * evidência que a sustenta.
         */}
        <Works />
        <About />
        <UniversidadeAberta />
        <TechMarquee />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
