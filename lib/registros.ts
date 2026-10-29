/** O que as telas de Formulários pedem de `registros` (035). */
export const COLUNAS_REGISTRO =
  "id, modelo, ano, numero, titulo, dados, status, visibilidade, anonimo, autor_id, decisao_por, decisao_em, decisao_nota, created_at, updated_at"

export type Registro = {
  id: string
  modelo: string
  ano: number
  numero: number | null
  titulo: string
  dados: Record<string, unknown>
  status: "rascunho" | "enviado" | "aprovado" | "devolvido"
  visibilidade: string
  anonimo: boolean
  autor_id: string | null
  decisao_por: string | null
  decisao_em: string | null
  decisao_nota: string | null
  created_at: string
  updated_at: string
}

export const ROTULO_STATUS: Record<Registro["status"], string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  devolvido: "Devolvido",
}
