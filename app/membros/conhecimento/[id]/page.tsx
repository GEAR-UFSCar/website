import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ArtigoEditor } from "@/components/artigo-editor"
import { Markdown } from "@/components/markdown"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { PageHeader } from "@/components/membros/page-header"
import { temCargo } from "@/lib/administracao"
import { dataLonga } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Base de conhecimento | GEAR",
  robots: { index: false, follow: false },
}

export default async function ArtigoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()
  const { data: a } = await supabase
    .from("artigos")
    .select("id, titulo, area, conteudo, updated_at, nasceu_de_pergunta, autor_id, slug, autor:perfis!artigos_autor_id_fkey (nome_completo), editor:perfis!artigos_atualizado_por_fkey (nome_completo)")
    .eq("id", id)
    .maybeSingle()
  if (!a || a.slug) notFound()
  const autor = (a.autor as unknown as { nome_completo: string | null } | null)?.nome_completo
  const editor = (a.editor as unknown as { nome_completo: string | null } | null)?.nome_completo

  return (
    <section className={paginaMembros}>
      <Link href="/membros/conhecimento" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        ← Base de conhecimento
      </Link>
      <PageHeader titulo={a.titulo}>
        {[a.area, a.nasceu_de_pergunta && "nasceu de uma pergunta", autor && `por ${autor}`, `atualizado em ${dataLonga(a.updated_at)}${editor && editor !== autor ? ` por ${editor}` : ""}`]
          .filter(Boolean)
          .join(" · ")}
      </PageHeader>
      {a.conteudo.trim() ? <Markdown texto={a.conteudo} /> : <p className="mt-8 font-sans text-sm font-light text-muted-foreground">Artigo vazio. Sabe como fazer? Escreva.</p>}
      <ArtigoEditor id={a.id} conteudo={a.conteudo} titulo={a.titulo} area={a.area} />
      {(a.autor_id === user.id || temCargo(perfil?.cargo)) && (
        <div className="mt-8">
          <BotaoApagar tabela="artigos" id={a.id} descricao={`o artigo ${a.titulo}`} depois="/membros/conhecimento" />
        </div>
      )}
    </section>
  )
}
