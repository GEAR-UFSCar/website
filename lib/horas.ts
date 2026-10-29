/**
 * Horas de extensão (033): o que a tela de cada membro e a da Gestão somam.
 * Dado puro, sem React, para o mesmo cálculo valer nas duas.
 */

export type Chamada = { evento_id: string; dia: string; horas: number; evento: { titulo: string; tipo: string } | null }
export type HoraLancada = { id: string; data: string; horas: number; descricao: string }

export type LinhaHoras = { chave: string; data: string; descricao: string; horas: number; origem: "Evento" | "Lançamento" }

/** Junta chamada e lançamento avulso numa lista só, mais recente primeiro. */
export function linhasDeHoras(chamadas: Chamada[], lancadas: HoraLancada[]): LinhaHoras[] {
  return [
    ...chamadas.map((c) => ({
      chave: `${c.evento_id}-${c.dia}`,
      data: c.dia,
      descricao: c.evento ? `${c.evento.tipo}: ${c.evento.titulo}` : "Evento apagado",
      horas: Number(c.horas),
      origem: "Evento" as const,
    })),
    ...lancadas.map((l) => ({
      chave: l.id,
      data: l.data,
      descricao: l.descricao,
      horas: Number(l.horas),
      origem: "Lançamento" as const,
    })),
  ].sort((a, b) => b.data.localeCompare(a.data))
}

export const somarHoras = (linhas: { horas: number }[]) => linhas.reduce((s, l) => s + Number(l.horas), 0)

/** 1.5 → "1h30"; o banco guarda decimal, a tela fala em horas e minutos. */
export function formatarHoras(horas: number) {
  const total = Math.round(horas * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`
}

/** Duração sugerida para a chamada: a do evento, arredondada a meia hora; sem fim, 2h. */
export function duracaoSugerida(inicio: string, fim: string | null) {
  if (!fim) return 2
  const horas = (new Date(fim).getTime() - new Date(inicio).getTime()) / 3_600_000
  return horas > 0 && horas <= 24 ? Math.max(0.5, Math.round(horas * 2) / 2) : 2
}
