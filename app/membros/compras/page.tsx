import type { Metadata } from "next"

import { PedidoForm } from "@/components/compras"
import { COLUNAS_PEDIDO, ListaPedidos, moeda, type Pedido } from "@/components/compras-lista"
import { dataDoDia } from "@/lib/datas"
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
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  // RLS: sem cargo volta só o que é seu; com cargo, todos (033)
  const [{ data, error }, contas] = await Promise.all([
    supabase.from("pedidos_compra").select(COLUNAS_PEDIDO).order("created_at", { ascending: false }),
    // Regimento art. 49: os registros financeiros são acessíveis a todos os membros (035)
    supabase.from("caixa_lancamentos").select("id, data, tipo, valor, descricao").order("data", { ascending: false }),
  ])
  const lancamentos = (contas.data ?? []) as { id: string; data: string; tipo: string; valor: number; descricao: string }[]
  const saldo = lancamentos.reduce((s, l) => s + (l.tipo === "Entrada" ? 1 : -1) * Number(l.valor), 0)
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
            <ListaPedidos pedidos={pedidos} decide={decide} usuarioId={user.id} />
          </Secao>

          <Secao titulo="Contas do Grupo">
            <p className="font-sans text-3xl font-light tabular-nums">{moeda.format(saldo)}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Saldo pelos lançamentos registrados · o dinheiro passa pela UFSCar ou pela fundação de apoio
            </p>
            {lancamentos.length > 0 && (
              <ul className="mt-4 border border-linha">
                {lancamentos.slice(0, 20).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-baseline gap-x-4 border-b border-linha px-5 py-2 last:border-b-0">
                    <span className="font-mono text-[11px] text-muted-foreground">{dataDoDia(l.data)}</span>
                    <span className="flex-1 font-sans text-sm">{l.descricao}</span>
                    <span className="font-mono text-[11px] tabular-nums">{l.tipo === "Entrada" ? "+" : "−"} {moeda.format(Number(l.valor))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </>
      )}
    </section>
  )
}
