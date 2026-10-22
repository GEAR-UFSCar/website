/**
 * Regras de "Hoje" que não dependem de React nem do Supabase. Sem imports,
 * para o teste (scripts/testar-hoje.mjs) rodar em Node. Todo dia chega como
 * "YYYY-MM-DD" já calculado em Brasília (hojeISO/diaGear de lib/datas.ts).
 */

/** "YYYY-MM-DD" deslocado em `n` dias. UTC puro: sem fuso, sem horário de verão. */
export function maisDias(chave: string, n: number): string {
  const [a, m, d] = chave.split("-").map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

const PESO_STATUS: Record<string, number> = { Bloqueado: 0, "Em andamento": 1, Planejado: 2 }

/** Bloqueado primeiro (pede ação), depois em andamento; empate: mexido por último. */
export function ordenarSprints<T extends { status: string; updated_at: string }>(sprints: T[]): T[] {
  return [...sprints].sort((a, b) => {
    const pa = PESO_STATUS[a.status] ?? 3
    const pb = PESO_STATUS[b.status] ?? 3
    if (pa !== pb) return pa - pb
    return b.updated_at.localeCompare(a.updated_at)
  })
}

/**
 * Evento aparece se é geral, se a pessoa não tem frente (diretoria enxerga
 * todas) ou se é da frente dela.
 */
export function eventoVisivel(frenteDoEvento: string | null, frenteDoUsuario: string | null): boolean {
  return !frenteDoEvento || !frenteDoUsuario || frenteDoEvento === frenteDoUsuario
}

export type ItemPrazo = {
  id: string
  origem: "evento" | "meta"
  titulo: string
  dia: string
  hora: string | null
  href: string
  detalhe: string
}

/**
 * Atrasados = metas (nunca eventos) com dia antes de hoje; quem chama já tirou
 * as concluídas. Próximos = hoje até `ate`, inclusive, por dia, evento antes de
 * meta dentro do dia, e por hora entre eventos.
 */
export function prazosDaSemana(itens: ItemPrazo[], hoje: string, ate: string) {
  const atrasados = itens
    .filter((i) => i.origem === "meta" && i.dia < hoje)
    .sort((a, b) => a.dia.localeCompare(b.dia))

  const proximos = itens
    .filter((i) => i.dia >= hoje && i.dia <= ate)
    .sort((a, b) => {
      if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
      if (a.origem !== b.origem) return a.origem === "evento" ? -1 : 1
      return (a.hora ?? "").localeCompare(b.hora ?? "")
    })

  return { atrasados, proximos }
}

/** Metas em quatro grupos; "semana" = de hoje até 7 dias, inclusive. */
export function agruparMetas<T extends { prazo: string; concluida: boolean }>(metas: T[], hoje: string) {
  const ate = maisDias(hoje, 7)
  const abertas = metas.filter((m) => !m.concluida)
  return {
    atrasadas: abertas.filter((m) => m.prazo < hoje),
    semana: abertas.filter((m) => m.prazo >= hoje && m.prazo <= ate),
    depois: abertas.filter((m) => m.prazo > ate),
    concluidas: metas.filter((m) => m.concluida),
  }
}
