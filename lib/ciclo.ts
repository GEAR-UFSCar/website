/** Linha da view ciclo_publico (038): o próximo ciclo ou o que está aberto. */
export type CicloPublico = {
  titulo: string
  inscricoes_de: string
  inscricoes_ate: string
  edital_url: string | null
}

export type FaseDoCiclo = "fechado" | "anunciado" | "aberto"

/** Datas em "YYYY-MM-DD" comparam certo como texto; `hoje` é o dia em Brasília. */
export function faseDoCiclo(ciclo: CicloPublico | null, hoje: string): FaseDoCiclo {
  if (!ciclo || ciclo.inscricoes_ate < hoje) return "fechado"
  return ciclo.inscricoes_de > hoje ? "anunciado" : "aberto"
}
