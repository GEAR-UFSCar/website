import type { ReactNode } from "react"
import Link from "next/link"

import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export default async function AdministracaoLayout({ children }: { children: ReactNode }) {
  /*
   * Sessão, perfil preenchido e aprovação, nessa ordem — depois o cargo.
   * Memoizado por request: as páginas filhas releem daqui, sem nova ida ao
   * banco.
   */
  const { perfil } = await exigirMembroAprovado()

  // Sem cargo: mostra o aviso no lugar do conteúdo, sem deslogar nem
  // redirecionar. A RLS no banco é a barreira de verdade; isto é a da tela.
  if (!temCargo(perfil?.cargo)) {
    return (
      <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
            <Surge>
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
              className={`mt-12 inline-block ${botaoSecundario}`}
            >
              Voltar para membros
            </Link>
            </Surge>
      </section>
    )
  }

  return (
    <>{children}</>
  )
}
