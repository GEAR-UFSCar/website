import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Carregando } from "@/components/carregando"

/*
 * Um loading.tsx só, no topo do segmento /membros: o Next embrulha em Suspense
 * este segmento E todos os aninhados, então as 12 rotas de membro — incluindo
 * as de /administracao e as três de trilha — herdam esta tela sem precisar de
 * um arquivo cada.
 *
 * Navbar e Footer entram aqui para o esqueleto ocupar o mesmo lugar na página
 * que o conteúdo vai ocupar; sem eles, o conteúdo pularia para baixo ao chegar.
 * CustomCursor fica de fora de propósito: ele se monta no primeiro movimento
 * do mouse e remontá-lo a cada navegação faria o ponto piscar.
 */
export default function MembrosLoading() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        <Carregando />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
