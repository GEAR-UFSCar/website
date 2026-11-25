import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { FilaRevisao } from "@/components/fila-revisao"
import { PageHeader } from "@/components/membros/page-header"
import { eRevisor } from "@/lib/administracao"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import type { ItemFila } from "@/lib/revisao"
import { agoraISO } from "@/lib/datas"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Fila de revisão | GEAR",
  robots: { index: false, follow: false },
}

export default async function RevisaoPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  const [fila, pessoas] = await Promise.all([
    supabase.from("fila_revisao").select("*").order("enviada_em", { ascending: true }),
    supabase.from("perfis").select("id, nome_completo").eq("aprovado", true),
  ])
  const nomes = Object.fromEntries((pessoas.data ?? []).map((p) => [p.id, p.nome_completo ?? "sem nome"]))
  const revisor = eRevisor(perfil)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Fila de revisão">
        Tarefas e comprovações da Academia esperando revisão, a mais antiga primeiro. Qualquer pessoa
        revisora pega, menos quem fez. Item com mais de 48 h fica destacado e qualquer outra pessoa revisora
        pode assumir, mesmo que alguém já tenha pegado.
        {!revisor && " Você acompanha a fila; revisar é de quem tem formação Principal ou Avançada."}
      </PageHeader>
      {fila.error ? (
        <ErroDados titulo="FILA INDISPONÍVEL" erro={fila.error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/043_organizacao_fase2.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <FilaRevisao itens={(fila.data ?? []) as ItemFila[]} nomes={nomes} usuarioId={user.id} revisor={revisor} agora={Date.parse(agoraISO())} />
      )}
    </section>
  )
}
