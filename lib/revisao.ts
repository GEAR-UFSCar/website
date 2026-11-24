/**
 * Fila de revisão (043): espelho na tela das regras de pegar_* e revisar_*.
 * Sem import, para o teste puro rodar no Node sem resolver "@/".
 */

export type ItemFila = {
  tipo: "tarefa" | "comprovacao"
  id: string
  titulo: string
  autor_id: string | null
  enviada_em: string | null
  revisor_id: string | null
  evidencia_url: string | null
  /** Projeto da tarefa, ou critério de aceite da competência. */
  contexto: string | null
  pontos: number | null
  rodadas_ajustes: number
}

export const LIMITE_HORAS = 48

export const horasNaFila = (enviadaEm: string | null, agora: number) =>
  enviadaEm ? Math.max(0, Math.floor((agora - Date.parse(enviadaEm)) / 3_600_000)) : 0

/** Passou de 48 h: destacado, e qualquer outro revisor pode pegar. */
export const atrasadoNaFila = (i: Pick<ItemFila, "enviada_em">, agora: number) => horasNaFila(i.enviada_em, agora) >= LIMITE_HORAS

/** Quem pode pegar ou revisar: revisor, não é o autor, e o item está livre, é dele, ou passou de 48 h. */
export function podeRevisar(i: Pick<ItemFila, "autor_id" | "revisor_id" | "enviada_em">, usuarioId: string, revisor: boolean, agora: number) {
  if (!revisor || i.autor_id === usuarioId) return false
  return !i.revisor_id || i.revisor_id === usuarioId || atrasadoNaFila(i, agora)
}
