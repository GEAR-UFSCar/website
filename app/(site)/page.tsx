import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { Works } from "@/components/works"
import { UniversidadeAberta } from "@/components/universidade-aberta"
import { TechMarquee } from "@/components/tech-marquee"
import { SectionBlend } from "@/components/section-blend"

export default function Home() {
  return (
    <>
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
    </>
  )
}
