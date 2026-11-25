import type { Metadata } from "next"

import { ArtigoEditor } from "@/components/artigo-editor"
import { ErroDados } from "@/components/erro-dados"
import { Markdown } from "@/components/markdown"
import { PageHeader } from "@/components/membros/page-header"
import { temCargo } from "@/lib/administracao"
import { dataLonga } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Como funciona a GEAR | GEAR",
  robots: { index: false, follow: false },
}

/** Página 00: regras, fluxo de entrada e tabela de decisões. Quem tem cargo edita. */
export default async function ComoFuncionaPage() {
  const { perfil } = await exigirMembroAprovado()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("artigos")
    .select("id, titulo, conteudo, updated_at")
    .eq("slug", "como-funciona")
    .maybeSingle()

  return (
    <section className={paginaMembros}>
      <PageHeader titulo={data?.titulo ?? "Como funciona a GEAR"}>
        {data ? `Atualizada em ${dataLonga(data.updated_at)}.` : "As regras do grupo."}
      </PageHeader>
      {error || !data ? (
        <ErroDados titulo="PÁGINA INDISPONÍVEL" erro={error ?? { message: "artigo como-funciona não encontrado" }} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/042_organizacao_fase1.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <>
          <Markdown texto={data.conteudo} />
          {temCargo(perfil?.cargo) && <ArtigoEditor id={data.id} conteudo={data.conteudo} />}
        </>
      )}
    </section>
  )
}
