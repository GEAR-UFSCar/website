import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { MotionConfig } from "framer-motion"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { PularParaConteudo } from "@/components/pular-para-conteudo"
import { MembrosShell } from "@/components/membros-shell"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { eFinanceiro, temCargo } from "@/lib/administracao"
import { buscarNovidades, desdeDe } from "@/lib/novidades"

/** Sai pelo servidor: limpa o cookie de sessão de verdade, não só no browser. */
async function sair() {
  "use server"

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

/**
 * Casca comum de /membros. A moldura completa tem a barra de grupos, sem cursor
 * customizado, sem rolagem suave e sem rodapé público: é uma ferramenta de
 * trabalho, não uma vitrine.
 *
 * DUAS MOLDURAS, E A ESCOLHA NÃO É PELA ROTA
 * Quem ainda não preencheu o perfil ou não foi aprovado recebe a moldura
 * pública: as abas levariam a páginas que a RLS devolve vazias, e oferecer
 * nove destinos fechados a quem está esperando aprovação é pior que não
 * oferecer nenhum. A condição é o ESTADO DA CONTA, não o pathname, é a mesma
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

  /*
   * Mesma régua do bloco de pendências do Hoje: conta cadastros com nome
   * preenchido e ainda não aprovados. Erro vira zero, porque o contador é
   * aviso, não dado: falhar aqui não pode derrubar a casca.
   */
  let pendentes = 0
  if (temCargo(perfil?.cargo)) {
    const supabase = await createClient()
    const { count } = await supabase
      .from("perfis")
      .select("id", { count: "exact", head: true })
      .eq("aprovado", false)
      .not("nome_completo", "is", null)
    pendentes = count ?? 0
  }

  /*
   * Contador do sino. Como o de pendentes, erro vira zero: a coluna
   * novidades_vistas_em só existe depois da 033, e a casca não pode cair por ela.
   */
  const supabase = await createClient()
  const { data: visto } = await supabase.from("perfis").select("novidades_vistas_em").eq("id", user.id).maybeSingle()
  const novidades = (
    await buscarNovidades(supabase, {
      usuarioId: user.id,
      desde: desdeDe(visto?.novidades_vistas_em ?? null),
      comCargo: temCargo(perfil?.cargo),
      financeiro: eFinanceiro(perfil?.cargo),
    })
  ).length

  return (
    <MotionConfig reducedMotion="always">
      <PularParaConteudo />
      <MembrosShell
        nome={perfil?.nome_completo?.trim() || user.email || "Membro"}
        cargo={perfil?.cargo ?? null}
        comCargo={temCargo(perfil?.cargo)}
        pendentes={pendentes}
        novidades={novidades}
        sair={sair}
      />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </MotionConfig>
  )
}
