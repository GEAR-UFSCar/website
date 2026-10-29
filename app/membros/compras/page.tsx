import type { Metadata } from "next"

import { PedidoForm } from "@/components/compras"
import { COLUNAS_PEDIDO, ListaPedidos, type Pedido } from "@/components/compras-lista"
import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { eFinanceiro, temCargo } from "@/lib/administracao"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Compras | GEAR",
  robots: { index: false, follow: false },
}

export default async function ComprasPage() {
  const { perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  // RLS: sem cargo volta só o que é seu; com cargo, todos (033)
  const { data, error } = await supabase.from("pedidos_compra").select(COLUNAS_PEDIDO).order("created_at", { ascending: false })
  const pedidos = (data ?? []) as unknown as Pedido[]
  const decide = eFinanceiro(perfil?.cargo)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Compras">
        Precisa de componente, ferramenta ou inscrição? Faça o pedido aqui. A tesouraria aprova ou recusa e a resposta
        aparece no próprio pedido.
      </PageHeader>

      {error ? (
        <ErroDados titulo="COMPRAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code>.
        </ErroDados>
      ) : (
        <>
          <Recolhivel rotulo="Novo pedido" aberto={pedidos.length === 0} className="mt-10">
            <PedidoForm />
          </Recolhivel>
          <Secao titulo={temCargo(perfil?.cargo) ? "Todos os pedidos" : "Meus pedidos"}>
            <ListaPedidos pedidos={pedidos} decide={decide} />
          </Secao>
        </>
      )}
    </section>
  )
}
