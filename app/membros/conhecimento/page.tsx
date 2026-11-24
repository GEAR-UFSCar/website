import type { Metadata } from "next"

import { BaseConhecimento, type ArtigoResumo } from "@/components/base-conhecimento"
import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "07 · Base de conhecimento | GEAR",
  robots: { index: false, follow: false },
}

export default async function ConhecimentoPage() {
  await exigirMembroAprovado()
  const supabase = await createClient()
  // ponytail: traz o conteúdo inteiro para buscar no navegador; com centenas de artigos, trocar por .ilike no servidor
  const { data, error } = await supabase
    .from("artigos")
    .select("id, titulo, area, conteudo, updated_at, nasceu_de_pergunta")
    .is("slug", null)
    .order("titulo")

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="07 · Base de conhecimento">
        Como fazer as coisas na GEAR, escrito por quem já fez. Regra do grupo: quem perguntou algo escreve a resposta
        aqui, para ninguém precisar perguntar de novo. Todo membro escreve e corrige.
      </PageHeader>
      {error ? (
        <ErroDados titulo="BASE INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/042_organizacao_fase1.sql</code> (e a 044, para os modelos).
        </ErroDados>
      ) : (
        <BaseConhecimento artigos={(data ?? []) as ArtigoResumo[]} />
      )}
    </section>
  )
}
