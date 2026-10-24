import type { ReactNode } from "react"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { PularParaConteudo } from "@/components/pular-para-conteudo"

/*
 * Moldura das páginas públicas. Antes cada page.tsx montava a própria —
 * dez cópias idênticas. /parceiros/proposta fica fora do grupo de propósito:
 * é a versão para imprimir, sem navegação nem rodapé.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <PularParaConteudo />
      <CustomCursor />
      <Navbar />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
        <Footer />
      </main>
    </SmoothScroll>
  )
}
