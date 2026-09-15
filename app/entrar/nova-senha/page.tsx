import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { NovaSenha } from "@/components/nova-senha"
import { getUsuario } from "@/lib/supabase/sessao"
import { botaoSecundario } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Nova senha | GEAR",
  robots: { index: false, follow: false },
}

export default async function NovaSenhaPage() {
  /*
   * Quem chega aqui já passou por /auth/confirmar, que trocou o código do
   * e-mail por uma sessão. Sem sessão, a pessoa abriu a URL na mão ou o link
   * expirou — e a saída é pedir outro, não um formulário que não teria em quem
   * gravar. Sem redirect: dizer o que aconteceu vale mais que sumir da tela.
   */
  const user = await getUsuario()

  if (!user) {
    return (
      <SmoothScroll>
        <CustomCursor />
        <Navbar />
        <main>
          <section className="relative mx-auto max-w-md px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ACESSO</p>
            <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
              LINK
              <br />
              <span className="italic">sem validade</span>
            </h1>

            <Aviso titulo="NADA A TROCAR AQUI" tom="neutro" className="mt-10">
              Esta tela só funciona quando aberta pelo link de recuperação, que vale por uma hora e
              uma vez só. Peça um novo e use o link mais recente que chegar.
            </Aviso>

            <Link
              href="/entrar/recuperar"
              data-cursor-hover
              className={`mt-10 inline-block ${botaoSecundario}`}
            >
              Pedir novo link
            </Link>
          </section>
          <Footer />
        </main>
      </SmoothScroll>
    )
  }

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <NovaSenha email={user.email ?? "sua conta"} />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
