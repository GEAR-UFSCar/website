import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { PautasLista } from "@/components/pautas-lista"
import { quemVe } from "@/lib/administracao"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { COLUNAS_TAREFA, type Tarefa } from "@/lib/tarefas"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Pautas abertas | GEAR",
  robots: { index: false, follow: false },
}

export default async function PautasPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sprint_tarefas")
    .select(COLUNAS_TAREFA)
    .is("responsavel_id", null)
    .eq("estado", "Aberta")
    .order("prazo", { nullsFirst: false })
    .order("created_at")

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Pautas abertas">
        Tarefas sem responsável. Escolha uma e clique em Assumir: ela vira sua na hora, entra no ciclo atual e fica Em
        andamento, sem pedir aprovação. Diga se é a sua tarefa principal ou a de reserva (uma de cada).
      </PageHeader>
      {error ? (
        <ErroDados titulo="PAUTAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/044_organizacao_fase3.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <PautasLista pautas={(data ?? []) as unknown as Tarefa[]} quem={quemVe(user.id, perfil)} />
      )}
    </section>
  )
}
