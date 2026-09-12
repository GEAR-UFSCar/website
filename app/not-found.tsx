import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SmoothScroll } from "@/components/smooth-scroll"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Rota não encontrada | GEAR",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-[var(--gear-amber)] mb-4">ERRO 404</p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            ROTA
            <br />
            <span className="italic">não encontrada</span>
          </h1>

          <p className="mt-8 max-w-2xl font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Nem toda trajetória dá certo de primeira. Esta página não existe — ou existiu e mudou de
            lugar. O resto do site continua de pé.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-5">
            <Link
              href="/"
              data-cursor-hover
              className={`text-center ${botaoPrimario}`}
            >
              Voltar ao início
            </Link>
            <Link
              href="/trilhas"
              data-cursor-hover
              className={`text-center ${botaoSecundario}`}
            >
              Ver as trilhas
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
