/**
 * Alertas (044): a view `alertas` calcula; aqui só se decide quem vê o quê.
 * Sem import, para o teste puro rodar no Node.
 */

export type Alerta = {
  tipo: string
  titulo: string
  detalhe: string | null
  href: string
  pessoa_id: string | null
  grupo: "revisores" | "financeiro" | null
  desde: string | null
}

/** Os que envolvem quem vê: é a pessoa, ou está no grupo que deve agir. */
export function alertasDe(lista: Alerta[], q: { usuarioId: string; revisor: boolean; financeiro: boolean }) {
  return lista.filter(
    (a) => a.pessoa_id === q.usuarioId || (a.grupo === "revisores" && q.revisor) || (a.grupo === "financeiro" && q.financeiro),
  )
}

/** Pontos validados no ciclo: comprovação aprovada com data de aprovação dentro dele. */
export function pontosNoCiclo(
  aprovadas: { concluido_em: string | null; pontos: number }[],
  ciclo: { inicio: string; fim: string } | null,
) {
  if (!ciclo) return 0
  return aprovadas
    .filter((a) => a.concluido_em && a.concluido_em.slice(0, 10) >= ciclo.inicio && a.concluido_em.slice(0, 10) <= ciclo.fim)
    .reduce((s, a) => s + a.pontos, 0)
}
