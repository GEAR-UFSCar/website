import { PedidoDecisao } from "@/components/compras"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { Pilula } from "@/components/membros/pilula"
import { dataDoDia, diaGear } from "@/lib/datas"

/** Real com centavos: o caixa não arredonda (o reais() de métricas corta os centavos). */
export const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export type Pedido = {
  id: string
  solicitante_id: string
  item: string
  justificativa: string
  link: string | null
  valor_estimado: number | null
  frente: string | null
  status: string
  resposta: string | null
  created_at: string
  solicitante: { nome_completo: string | null } | null
}

export const COLUNAS_PEDIDO =
  "id, solicitante_id, item, justificativa, link, valor_estimado, frente, status, resposta, created_at, solicitante:perfis!pedidos_compra_solicitante_id_fkey(nome_completo)"

const TOM: Record<string, "neutro" | "ativo" | "alerta"> = { Pendente: "neutro", Aprovado: "ativo", Comprado: "ativo", Recusado: "alerta" }

/** Lista de pedidos, com os botões de decisão para quem cuida do dinheiro. */
export function ListaPedidos({ pedidos, decide, usuarioId }: { pedidos: Pedido[]; decide: boolean; usuarioId: string }) {
  if (pedidos.length === 0) return <EstadoVazio>Nenhum pedido.</EstadoVazio>
  return (
    <ul className="space-y-4">
      {pedidos.map((p) => (
        <li key={p.id} className="border border-linha p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-sans text-lg font-light">{p.item}</p>
            <Pilula tom={TOM[p.status]}>{p.status}</Pilula>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {p.solicitante?.nome_completo ?? "ex-membro"} · {dataDoDia(diaGear(p.created_at))}
            {p.frente && ` · ${p.frente}`}
            {p.valor_estimado !== null && ` · ${moeda.format(Number(p.valor_estimado))}`}
          </p>
          <p className="mt-3 max-w-[70ch] whitespace-pre-line font-sans text-sm font-light leading-relaxed">{p.justificativa}</p>
          {p.link?.match(/^https?:\/\//) && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:underline">
              Ver produto ↗
            </a>
          )}
          {p.resposta && <p className="mt-3 border-l-2 border-[var(--gear-amber)] pl-3 font-sans text-sm">{p.resposta}</p>}
          {decide && <PedidoDecisao id={p.id} status={p.status} />}
          {/* quem pediu pode desistir enquanto ninguém decidiu (033) */}
          {p.solicitante_id === usuarioId && p.status === "Pendente" && (
            <div className="mt-3">
              <BotaoApagar tabela="pedidos_compra" id={p.id} rotulo="Desistir" descricao={`do pedido ${p.item}`} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

