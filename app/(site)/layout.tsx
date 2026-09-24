import type { ReactNode } from "react"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"

/*
 * Moldura das páginas públicas. Antes cada page.tsx montava a própria —
 * dez cópias idênticas. /parceiros/proposta fica fora do grupo de propósito:
 * é a versão para imprimir, sem navegação nem rodapé.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        {children}
        <Footer />
      </main>
    </SmoothScroll>
  )
}
