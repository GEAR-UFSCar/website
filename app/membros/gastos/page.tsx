import type { Metadata } from "next"

import { GastoForm, LimiteGastoForm } from "@/components/compras"
import { COLUNAS_PEDIDO, ListaPedidos, moeda, type Pedido } from "@/components/compras-lista"
import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { eDiretoria, eFinanceiro } from "@/lib/administracao"
import { MESES } from "@/lib/calendario"
import { dataDoDia } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Gastos | GEAR",
  robots: { index: false, follow: false },
}

/** Gasto que conta no total: o que não foi recusado. */
const conta = (p: Pedido) => p.status !== "Recusado" && p.valor_estimado !== null

/**
 * Gastos (044): qualquer membro registra com comprovante. Até o limite fica
 * Registrado; acima, aguarda o financeiro. Total por mês para prestação de
 * contas de edital. Todo membro lê (Regimento art. 49).
 */
export default async function GastosPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()
  const [gastosR, parametrosR, contasR] = await Promise.all([
    supabase.from("pedidos_compra").select(COLUNAS_PEDIDO).order("data_gasto", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("parametros").select("limite_gasto").maybeSingle(),
    // Regimento art. 49: os registros financeiros são acessíveis a todos os membros (035)
    supabase.from("caixa_lancamentos").select("id, data, tipo, valor, descricao").order("data", { ascending: false }),
  ])
  const lancamentos = (contasR.data ?? []) as { id: string; data: string; tipo: string; valor: number; descricao: string }[]
  const saldo = lancamentos.reduce((s, l) => s + (l.tipo === "Entrada" ? 1 : -1) * Number(l.valor), 0)
  const gastos = (gastosR.data ?? []) as unknown as Pedido[]
  const limite = Number(parametrosR.data?.limite_gasto ?? 50)
  const aguardando = gastos.filter((g) => g.status === "Aguardando aprovação")

  // agrupa por mês do gasto ("2026-11"), do mais recente para o mais antigo
  const porMes = new Map<string, Pedido[]>()
  for (const g of gastos) {
    const mes = (g.data_gasto ?? g.created_at).slice(0, 7)
    porMes.set(mes, [...(porMes.get(mes) ?? []), g])
  }
  const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Gastos">
        Comprou algo para o grupo? Registre com o comprovante. Até {moeda.format(limite)} fica registrado na hora, sem
        pedir a ninguém; acima disso aguarda a aprovação do financeiro. O total por mês serve para a prestação de contas.
      </PageHeader>

      {gastosR.error ? (
        <ErroDados titulo="GASTOS INDISPONÍVEIS" erro={gastosR.error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/044_organizacao_fase3.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <>
          <Recolhivel rotulo="Registrar gasto" aberto={gastos.length === 0} className="mt-10">
            <GastoForm limite={limite} />
          </Recolhivel>

          {eDiretoria(perfil?.cargo) && (
            <div className="mt-6">
              <LimiteGastoForm atual={limite} />
            </div>
          )}

          {aguardando.length > 0 && (
            <Secao titulo={`Aguardando aprovação · ${aguardando.length}`}>
              <ListaPedidos pedidos={aguardando} decide={eFinanceiro(perfil?.cargo)} usuarioId={user.id} />
            </Secao>
          )}

          <Secao titulo="Total por mês">
            {porMes.size === 0 ? (
              <p className="font-sans text-sm font-light text-muted-foreground">Nenhum gasto registrado.</p>
            ) : (
              <ul className="border border-linha">
                {[...porMes].map(([mes, lista]) => (
                  <li key={mes} className="flex flex-wrap items-baseline gap-x-4 border-b border-linha px-5 py-3 last:border-b-0">
                    <span className="flex-1 font-sans text-sm capitalize">{rotuloMes(mes)}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{lista.filter(conta).length} gasto(s)</span>
                    <span className="font-mono text-sm tabular-nums">{moeda.format(lista.filter(conta).reduce((s, g) => s + Number(g.valor_estimado), 0))}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Recusados ficam fora do total.</p>
          </Secao>

          {[...porMes].map(([mes, lista]) => (
            <Secao key={mes} titulo={rotuloMes(mes)}>
              <ListaPedidos pedidos={lista} decide={eFinanceiro(perfil?.cargo)} usuarioId={user.id} />
            </Secao>
          ))}

          <Secao titulo="Contas do Grupo">
            <p className="font-sans text-3xl font-light tabular-nums">{moeda.format(saldo)}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Saldo pelos lançamentos do caixa · o dinheiro passa pela UFSCar ou pela fundação de apoio
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
