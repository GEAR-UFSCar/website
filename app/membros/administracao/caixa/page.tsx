import type { Metadata } from "next"

import { LancamentoCaixaForm } from "@/components/compras"
import { COLUNAS_PEDIDO, ListaPedidos, moeda, type Pedido } from "@/components/compras-lista"
import { ErroDados } from "@/components/erro-dados"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { eDiretoria, eFinanceiro } from "@/lib/administracao"
import { dataDoDia } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Caixa | GEAR",
  robots: { index: false, follow: false },
}

type Lancamento = {
  id: string
  data: string
  tipo: "Entrada" | "Saída"
  valor: number
  descricao: string
  categoria: string | null
  comprovante_url: string | null
}

/** Caixa do grupo: saldo, lançamentos e pedidos esperando decisão (033). */
export default async function CaixaPage() {
  const user = await exigirUsuario()
  const { perfil } = await getPerfil()
  const financeiro = eFinanceiro(perfil?.cargo)
  // espelha "caixa: diretoria apaga" (033): Tesouraria lança, só a diretoria apaga
  const apaga = eDiretoria(perfil?.cargo)
  const supabase = await createClient()

  const [lancR, pedidosR] = await Promise.all([
    supabase.from("caixa_lancamentos").select("id, data, tipo, valor, descricao, categoria, comprovante_url").order("data", { ascending: false }),
    supabase.from("pedidos_compra").select(COLUNAS_PEDIDO).in("status", ["Pendente", "Aprovado"]).order("created_at"),
  ])
  const erro = lancR.error ?? pedidosR.error
  const lancamentos = (lancR.data ?? []) as Lancamento[]
  const saldo = lancamentos.reduce((s, l) => s + (l.tipo === "Entrada" ? 1 : -1) * Number(l.valor), 0)
  const pedidos = (pedidosR.data ?? []) as unknown as Pedido[]

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Caixa">
        Entradas e saídas do grupo e os pedidos de compra dos membros. Todo membro lê as contas (Regimento art. 49);
        Presidência, Vice, Tesouraria e Operações e Patrimônio lançam e decidem.
      </PageHeader>

      {erro ? (
        <ErroDados titulo="CAIXA INDISPONÍVEL" erro={erro} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code>.
        </ErroDados>
      ) : (
        <>
          <p className={`mt-10 font-sans text-5xl font-light tabular-nums ${saldo < 0 ? "text-[var(--gear-amber)]" : ""}`}>
            {moeda.format(saldo)}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Saldo pelos lançamentos registrados aqui; confira com o extrato da conta
          </p>

          <Secao titulo={`Pedidos esperando (${pedidos.length})`}>
            <ListaPedidos pedidos={pedidos} decide={financeiro} usuarioId={user.id} />
          </Secao>

          <Secao titulo="Lançamentos">
            {financeiro && (
              <Recolhivel rotulo="Novo lançamento" aberto={lancamentos.length === 0} className="mb-6">
                <LancamentoCaixaForm />
              </Recolhivel>
            )}
            {lancamentos.length === 0 ? (
              <EstadoVazio>Nenhum lançamento.</EstadoVazio>
            ) : (
              <ul className="border border-linha">
                {lancamentos.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-baseline gap-x-4 border-b border-linha px-5 py-3 last:border-b-0">
                    <span className="font-mono text-[11px] text-muted-foreground">{dataDoDia(l.data)}</span>
                    <span className="flex-1 font-sans text-sm">
                      {l.descricao}
                      {l.categoria && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{l.categoria}</span>}
                      {l.comprovante_url?.match(/^https?:\/\//) && (
                        <a href={l.comprovante_url} target="_blank" rel="noopener noreferrer" className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--gear-amber)] hover:underline">
                          comprovante ↗
                        </a>
                      )}
                    </span>
                    <span className={`font-mono text-[11px] tabular-nums ${l.tipo === "Entrada" ? "text-[var(--gear-amber)]" : ""}`}>
                      {l.tipo === "Entrada" ? "+" : "−"} {moeda.format(Number(l.valor))}
                    </span>
                    {apaga && <BotaoApagar tabela="caixa_lancamentos" id={l.id} descricao={`lançamento ${l.descricao}`} />}
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
