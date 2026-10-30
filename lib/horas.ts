/**
 * Horas de extensão (033): o que a tela de cada membro e a da Gestão somam.
 * Dado puro, sem React, para o mesmo cálculo valer nas duas.
 */

/** `atividade` é o nome do evento congelado no registro (034): sobrevive ao evento apagado. */
export type Chamada = { id: string; dia: string; horas: number; atividade: string }
export type HoraLancada = { id: string; data: string; horas: number; descricao: string }

export type LinhaHoras = { chave: string; data: string; descricao: string; horas: number; origem: "Evento" | "Lançamento" }

/** Junta chamada e lançamento avulso numa lista só, mais recente primeiro. */
export function linhasDeHoras(chamadas: Chamada[], lancadas: HoraLancada[]): LinhaHoras[] {
  return [
    ...chamadas.map((c) => ({
      chave: c.id,
      data: c.dia,
      descricao: c.atividade,
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

/*
 * FREQUÊNCIA (doc. 27 art. 3; Regimento art. 13 III; doc. 35)
 * Uma sessão é um dia de evento em que alguém fez a chamada: sem chamada não
 * há como saber quem faltou. Espera-se de cada membro as sessões gerais e as
 * da própria frente, a partir do dia em que entrou. "Não vou" marcado no
 * calendário conta como aviso: a falta continua sendo falta para os 25%, mas
 * não entra na sequência, que o Regimento conta só "sem justificativa".
 */
export const ALERTA_SEGUIDAS = 3
export const ALERTA_PERCENTUAL = 0.25

export type Sessao = { chave: string; dia: string; frente: string | null; presentes: Set<string> }
export type Esperado = { id: string; frente: string | null; desde: string }
export type Frequencia = { esperadas: number; faltas: number; avisadas: number; seguidas: number; alerta: boolean }

/** `avisos` guarda `${chave da sessão}|${usuario}` de quem marcou "Não vou". */
export function frequencia(pessoa: Esperado, sessoes: Sessao[], avisos: Set<string>): Frequencia {
  const minhas = sessoes
    .filter((s) => s.dia >= pessoa.desde && (s.frente === null || s.frente === pessoa.frente))
    .sort((a, b) => b.dia.localeCompare(a.dia))
  let faltas = 0
  let avisadas = 0
  let seguidas = 0
  let sequenciaAberta = true
  for (const s of minhas) {
    if (s.presentes.has(pessoa.id)) {
      sequenciaAberta = false
      continue
    }
    faltas++
    if (avisos.has(`${s.chave}|${pessoa.id}`)) avisadas++
    else if (sequenciaAberta) seguidas++
  }
  const alerta = seguidas >= ALERTA_SEGUIDAS || (minhas.length > 0 && faltas / minhas.length >= ALERTA_PERCENTUAL)
  return { esperadas: minhas.length, faltas, avisadas, seguidas, alerta }
}
