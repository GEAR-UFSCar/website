import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormularioRegistro } from "@/components/formulario-registro"
import { PageHeader } from "@/components/membros/page-header"
import { modeloPorId } from "@/lib/formularios"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Novo registro | GEAR",
  robots: { index: false, follow: false },
}

export default async function NovoRegistroPage({ searchParams }: { searchParams: Promise<{ modelo?: string }> }) {
  await exigirMembroAprovado()
  const { modelo: id } = await searchParams
  const modelo = id ? modeloPorId(id) : undefined
  if (!modelo) notFound()

  const supabase = await createClient()
  const { data: pessoas } = await supabase.from("perfis").select("id, nome_completo").eq("aprovado", true).order("nome_completo")

  return (
    <section className={paginaMembros}>
      <Link href="/membros/formularios" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        ← Formulários
      </Link>
      <PageHeader titulo={modelo.nome}>{modelo.descricao}</PageHeader>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {modelo.fonte}
        {modelo.visibilidade === "restrito" && " · restrito: só você e quem tem cargo leem"}
      </p>
      <div className="mt-10 max-w-3xl">
        <FormularioRegistro modeloId={modelo.id} pessoas={pessoas ?? []} />
      </div>
    </section>
  )
}
