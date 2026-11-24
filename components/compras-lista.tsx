import { ComprovanteArquivo, PedidoDecisao } from "@/components/compras"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { Pilula } from "@/components/membros/pilula"
import { alcada } from "@/lib/administracao"
import { dataDoDia, diaGear } from "@/lib/datas"

/** Real com centavos: o caixa não arredonda (o reais() de métricas corta os centavos). */
export const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export type Pedido = {
  id: string
  solicitante_id: string
  item: string
  justificativa: string | null
  link: string | null
  valor_estimado: number | null
  frente: string | null
  status: string
  resposta: string | null
  created_at: string
  /** 044: o gasto em si */
  data_gasto: string
  comprovante_url: string | null
  comprovante_arquivo: string | null
  solicitante: { nome_completo: string | null } | null
}

export const COLUNAS_PEDIDO =
  "id, solicitante_id, item, justificativa, link, valor_estimado, frente, status, resposta, created_at, data_gasto, comprovante_url, comprovante_arquivo, solicitante:perfis!pedidos_compra_solicitante_id_fkey(nome_completo)"

const TOM: Record<string, "neutro" | "ativo" | "alerta"> = { Registrado: "neutro", "Aguardando aprovação": "alerta", Aprovado: "ativo", Comprado: "ativo", Recusado: "neutro" }

/** Lista de gastos (044), com os botões de decisão para quem cuida do dinheiro. */
export function ListaPedidos({ pedidos, decide, usuarioId }: { pedidos: Pedido[]; decide: boolean; usuarioId: string }) {
  if (pedidos.length === 0) return <EstadoVazio>Nenhum gasto.</EstadoVazio>
  return (
    <ul className="space-y-4">
      {pedidos.map((p) => (
        <li key={p.id} className="border border-linha p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-sans text-lg font-light">{p.item}</p>
            <Pilula tom={TOM[p.status]}>{p.status}</Pilula>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {p.solicitante?.nome_completo ?? "ex-membro"} · {dataDoDia(p.data_gasto ?? diaGear(p.created_at))}
            {p.frente && ` · ${p.frente}`}
            {p.valor_estimado !== null && ` · ${moeda.format(Number(p.valor_estimado))}`}
          </p>
          {p.justificativa && <p className="mt-3 max-w-[70ch] whitespace-pre-line font-sans text-sm font-light leading-relaxed">{p.justificativa}</p>}
          {p.comprovante_url?.match(/^https?:\/\//) && (
            <a href={p.comprovante_url} target="_blank" rel="noopener noreferrer" className="mr-4 mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:underline">
              Comprovante ↗
            </a>
          )}
          {p.comprovante_arquivo && <ComprovanteArquivo caminho={p.comprovante_arquivo} />}
          {p.status === "Aguardando aprovação" && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Alçada: {alcada(p.valor_estimado === null ? null : Number(p.valor_estimado))}
            </p>
          )}
          {p.link?.match(/^https?:\/\//) && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:underline">
              Ver produto ↗
            </a>
          )}
          {p.resposta && <p className="mt-3 border-l-2 border-[var(--gear-amber)] pl-3 font-sans text-sm">{p.resposta}</p>}
          {/* ninguém aprova o próprio gasto (044) */}
          {decide && p.solicitante_id !== usuarioId && <PedidoDecisao id={p.id} status={p.status} />}
          {/* quem registrou pode retirar enquanto ninguém decidiu (044) */}
          {p.solicitante_id === usuarioId && (p.status === "Registrado" || p.status === "Aguardando aprovação") && (
            <div className="mt-3">
              <BotaoApagar tabela="pedidos_compra" id={p.id} rotulo="Retirar" descricao={`o gasto ${p.item}`} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

