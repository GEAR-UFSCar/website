import type { Metadata } from "next"
import Link from "next/link"

import { BlocoPendencias } from "@/components/membros/hoje"
import { PageHeader } from "@/components/membros/page-header"
import { Secao } from "@/components/membros/secao"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Gestão | GEAR",
  robots: { index: false, follow: false },
}

const CADASTROS = [
  { href: "/membros/administracao/atas", nome: "Atas", texto: "Registro de reuniões: presentes, pauta, decisões e pendências." },
  { href: "/membros/administracao/cargos", nome: "Cargos e aprovação", texto: "Atribuir e trocar cargos e aprovar membros. Restrito a Presidente e Vice-Presidente." },
  { href: "/membros/administracao/patrimonio", nome: "Patrimônio", texto: "Inventário de robôs, componentes, ferramentas e equipamentos." },
]

export default async function GestaoPage() {
  const supabase = await createClient()
  const [aprovacoes, bloqueados] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false).not("nome_completo", "is", null),
    supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "Bloqueado"),
  ])

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
      <PageHeader titulo="Gestão">
        Patrimônio, atas e cargos da entidade. Cargo e aprovação de membro são só de Presidente e Vice-Presidente.
      </PageHeader>

      <BlocoPendencias
        aprovacoes={aprovacoes.error ? null : (aprovacoes.count ?? 0)}
        bloqueados={bloqueados.error ? null : (bloqueados.count ?? 0)}
      />

      <Secao titulo="Cadastros">
        <ul className="grid gap-px border border-linha bg-linha md:grid-cols-3">
          {CADASTROS.map((c) => (
            <li key={c.href} className="bg-[var(--gear-ink)]">
              <Link href={c.href} className="block h-full p-5 hover:bg-[var(--gear-navy)]">
                <span className="block font-sans text-lg">{c.nome}</span>
                <span className="mt-2 block font-sans text-sm font-light leading-relaxed text-muted-foreground">{c.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Secao>
    </section>
  )
}
