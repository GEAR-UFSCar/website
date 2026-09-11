import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { createClient } from "@/lib/supabase/server"
import { temCargo } from "@/lib/administracao"

export default async function AdministracaoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/entrar")

  const { data: perfil } = await supabase
    .from("perfis")
    .select("cargo")
    .eq("id", user.id)
    .maybeSingle<{ cargo: string | null }>()

  // Sem cargo: mostra o aviso no lugar do conteúdo, sem deslogar nem
  // redirecionar. A RLS no banco é a barreira de verdade; isto é a da tela.
  if (!temCargo(perfil?.cargo)) {
    return (
      <SmoothScroll>
        <CustomCursor />
        <Navbar />
        <main>
          <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
            <p className="font-mono text-xs tracking-[0.3em] text-[var(--gear-amber)] mb-4">
              ACESSO RESTRITO
            </p>
            <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
              Área da
              <br />
              <span className="italic">administração</span>
            </h1>
            <p className="mt-8 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
              Esta área é restrita a membros com cargo na entidade. Sua conta continua ativa — se você
              deveria ter acesso, peça para a diretoria preencher seu cargo no perfil.
            </p>
            <Link
              href="/membros"
              data-cursor-hover
              className="mt-12 inline-block border border-white/20 bg-transparent px-8 py-4 font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"
            >
              Voltar para membros
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
      <main>{children}</main>
      <Footer />
    </SmoothScroll>
  )
}
