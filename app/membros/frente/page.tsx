import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/membros/page-header"
import { FRENTES_ROTAS, rotaDaFrente } from "@/lib/administracao"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"

export const metadata: Metadata = {
  title: "Minha frente | GEAR",
  robots: { index: false, follow: false },
}

/**
 * Atalho para os sprints da frente de quem está logado. Sem frente definida
 * (diretoria, por exemplo), lista as três para escolher.
 */
export default async function MinhaFrentePage() {
  const { perfil } = await exigirMembroAprovado()
  const frente = perfil?.frente?.trim()

  if (frente && FRENTES_ROTAS.some((f) => f.nome === frente)) {
    redirect(rotaDaFrente(frente))
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
      <PageHeader titulo="Minha frente">
        Você ainda não tem uma frente definida. Escolha qual acompanhar.
      </PageHeader>
      <ul className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
        {FRENTES_ROTAS.map((f) => (
          <li key={f.slug} className="bg-[var(--gear-ink)]">
            <Link
              href={`/membros/sprints/${f.slug}`}
              className="block p-6 font-sans text-xl hover:bg-[var(--gear-navy)] hover:text-[var(--gear-amber)]"
            >
              {f.nome}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
