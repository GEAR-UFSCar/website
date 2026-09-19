import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BadgeAmbiente } from "@/components/badge-ambiente"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { MembrosShell } from "@/components/membros-shell"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"

/** Sai pelo servidor: limpa o cookie de sessão de verdade, não só no browser. */
async function sair() {
  "use server"

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

/**
 * Casca comum de /membros. Antes, cada uma das onze páginas montava a própria
 * moldura — SmoothScroll, CustomCursor, Navbar, main, Footer — e a navegação
 * entre elas era o menu do site público, que não sabe nada da área interna.
 *
 * DUAS MOLDURAS, E A ESCOLHA NÃO É PELA ROTA
 * Quem ainda não preencheu o perfil ou não foi aprovado recebe a moldura
 * pública: as abas levariam a páginas que a RLS devolve vazias, e oferecer
 * nove destinos fechados a quem está esperando aprovação é pior que não
 * oferecer nenhum. A condição é o ESTADO DA CONTA, não o pathname — é a mesma
 * régua dos portões de /membros/page.tsx, então as duas nunca divergem.
 *
 * `getPerfil()` é memoizado por request (lib/supabase/sessao.ts): este layout
 * e a página filha leem o mesmo resultado, sem segunda ida ao banco.
 */
export default async function MembrosLayout({ children }: { children: ReactNode }) {
  const user = await exigirUsuario()
  const { perfil, erro } = await getPerfil()

  /*
   * `erro` preenchido = tabela ausente ou consulta recusada. Cai na moldura
   * pública de propósito: a página filha tem o próprio aviso explicando o que
   * rodar, e a casca cheia fingiria normalidade em cima de um banco quebrado.
   */
  const dentro = !erro && Boolean(perfil?.nome_completo?.trim()) && perfil?.aprovado === true

  if (!dentro) {
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

  return (
    <SmoothScroll>
      <CustomCursor />
      <MembrosShell
        nome={perfil?.nome_completo?.trim() || user.email || "Membro"}
        cargo={perfil?.cargo ?? null}
        comCargo={temCargo(perfil?.cargo)}
        sair={sair}
      />
      <main>
        {/*
          Só na moldura completa. Quem está em completar-perfil ou aguardando
          aprovação cai na moldura pública acima e NÃO vê o selo: para essa
          pessoa o ambiente interno ainda não está ativo, e anunciar que está
          seria a casca contradizendo a RLS.
        */}
        <BadgeAmbiente />
        {children}
        <Footer />
      </main>
    </SmoothScroll>
  )
}
