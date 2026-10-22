import type { ReactNode } from "react"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { PageHeader } from "@/components/membros/page-header"

export default async function AdministracaoLayout({ children }: { children: ReactNode }) {
  /*
   * Sessão, perfil preenchido e aprovação, nessa ordem, depois o cargo.
   * Memoizado por request: as páginas filhas releem daqui, sem nova ida ao
   * banco.
   */
  const { perfil } = await exigirMembroAprovado()

  // Sem cargo: mostra o aviso no lugar do conteúdo, sem deslogar nem
  // redirecionar. A RLS no banco é a barreira de verdade; isto é a da tela.
  if (!temCargo(perfil?.cargo)) {
    return (
      <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
            <PageHeader titulo="Acesso restrito">
              Esta área é restrita a membros com cargo na entidade. Sua conta continua ativa. Se você
              deveria ter acesso, peça para a diretoria preencher seu cargo no perfil.
            </PageHeader>
      </section>
    )
  }

  return (
    <>{children}</>
  )
}
