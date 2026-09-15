/**
 * Metas pessoais: o que a tela e o banco precisam concordar.
 *
 * Os valores de `visibilidade` espelham o CHECK de supabase/017_metas.sql. As
 * frentes continuam vindo de lib/administracao.ts — meta vinculada a frente
 * usa a mesma lista de sempre, não uma cópia.
 */

import { hojeISO } from "@/lib/datas"

export const VISIBILIDADES = ["Privada", "Pública"] as const
export type Visibilidade = (typeof VISIBILIDADES)[number]

export type Meta = {
  id: string
  usuario_id: string
  titulo: string
  descricao: string | null
  /** Coluna `date`: chega como "YYYY-MM-DD", sem hora e sem fuso. */
  prazo: string
  visibilidade: string
  concluida: boolean
  frente_vinculada: string | null
  created_at: string
}

/** Colunas que toda consulta de meta pede. Uma lista, um lugar. */
export const COLUNAS_META =
  "id, usuario_id, titulo, descricao, prazo, visibilidade, concluida, frente_vinculada, created_at"

/**
 * Vencida = o prazo já passou e ninguém marcou como concluída. Meta concluída
 * depois do prazo não é vencida: foi entregue, ainda que tarde, e continuar
 * pintando de vermelho o que já está feito só ensina a ignorar o vermelho.
 */
export function estaVencida(meta: Pick<Meta, "prazo" | "concluida">) {
  return !meta.concluida && meta.prazo < hojeISO()
}

/** "em 3 dias", "hoje", "há 2 dias" — a distância em dias inteiros. */
export function prazoRelativo(prazo: string) {
  const dia = 86_400_000
  const [a, m, d] = prazo.slice(0, 10).split("-").map(Number)
  const alvo = new Date(a, m - 1, d).setHours(0, 0, 0, 0)
  const hoje = new Date().setHours(0, 0, 0, 0)
  const dias = Math.round((alvo - hoje) / dia)

  if (dias === 0) return "hoje"
  if (dias === 1) return "amanhã"
  if (dias === -1) return "ontem"
  return dias > 0 ? `em ${dias} dias` : `há ${Math.abs(dias)} dias`
}
