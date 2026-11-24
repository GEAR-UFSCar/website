import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { TarefasQuadro } from "@/components/tarefas-quadro"
import { quemVe } from "@/lib/administracao"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { COLUNAS_TAREFA, type Tarefa } from "@/lib/tarefas"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Projetos e tarefas | GEAR",
  robots: { index: false, follow: false },
}

export default async function TarefasPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  const [tarefas, projetos, pessoas] = await Promise.all([
    supabase.from("sprint_tarefas").select(COLUNAS_TAREFA).order("prazo", { nullsFirst: false }).order("created_at"),
    supabase.from("sprints").select("id, titulo, frente").neq("status", "Concluído").order("frente").order("titulo"),
    supabase.from("perfis").select("id, nome_completo").eq("aprovado", true).order("nome_completo"),
  ])

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Projetos e tarefas">
        Toda tarefa nasce dizendo quando fica pronta e tem um único responsável. Quem termina envia
        para revisão com a evidência; quem tem formação Principal ou Avançada revisa, e ninguém revisa
        o próprio trabalho. Tarefa sem responsável é pauta aberta.
      </PageHeader>

      {tarefas.error ? (
        <ErroDados titulo="TAREFAS INDISPONÍVEIS" erro={tarefas.error} className="mt-10 max-w-2xl">
          Se o erro fala em <code>estado</code> ou <code>pronto_quando</code>, falta rodar{" "}
          <code>supabase/042_organizacao_fase1.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <TarefasQuadro
          tarefas={(tarefas.data ?? []) as unknown as Tarefa[]}
          projetos={(projetos.data ?? []).map((p) => ({ id: p.id, nome: `${p.titulo} · ${p.frente}` }))}
          pessoas={pessoas.data ?? []}
          quem={quemVe(user.id, perfil)}
        />
      )}
    </section>
  )
}
