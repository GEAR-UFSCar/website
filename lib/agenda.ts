/**
 * Aritmética de calendário da grade mensal, separada da tela.
 *
 * Tudo aqui trabalha com "chave de dia": a string "YYYY-MM-DD" em horário
 * LOCAL. É o mesmo formato da coluna `metas.prazo`, o que deixa a comparação
 * ser string contra string, sem Date no meio — e Date no meio é justamente
 * onde nasce o bug de fuso que faz o dia 1º aparecer na última célula do mês
 * anterior. Ver o comentário de dataDoDia em lib/datas.ts.
 *
 * "Chave de mês" segue a mesma ideia: "YYYY-MM".
 */

export type OrigemItem = "evento" | "meta"

export type ItemAgenda = {
  id: string
  origem: OrigemItem
  titulo: string
  /** "YYYY-MM-DD" local — a célula em que o item cai. */
  dia: string
  /** "14:30" para evento com hora; null para meta, que é prazo do dia. */
  hora: string | null
  descricao: string | null
  /** "Reunião"/"Sprint"/"Prazo"/"Outro" no evento; autor ou "Sua meta" na meta. */
  rotulo: string
  frente: string | null
  /** Só em meta: prazo vencido e não concluída. */
  atrasada?: boolean
  concluida?: boolean
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

/** Segunda a domingo — a semana como a entidade marca reunião. */
export const DIAS_DA_SEMANA = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const

const doisDigitos = (n: number) => String(n).padStart(2, "0")

/** Date local → "YYYY-MM-DD". */
export const chaveDoDia = (d: Date) =>
  `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`

/** "YYYY-MM-DD" → Date local à meia-noite. */
export function dataDaChave(chave: string) {
  const [ano, mes, dia] = chave.slice(0, 10).split("-").map(Number)
  return new Date(ano, mes - 1, dia)
}

/** Timestamp do Postgres → chave de dia no fuso do servidor. */
export const chaveDoTimestamp = (iso: string) => chaveDoDia(new Date(iso))

/** "YYYY-MM" válido, ou o mês de `alternativa` quando vier lixo pela URL. */
export function chaveDeMesValida(bruta: string | undefined, alternativa: string) {
  if (!bruta || !/^\d{4}-\d{2}$/.test(bruta)) return alternativa
  const mes = Number(bruta.slice(5, 7))
  return mes >= 1 && mes <= 12 ? bruta : alternativa
}

export const mesDaChave = (chave: string) => chave.slice(0, 7)

/** Desloca a chave de mês em `passo` meses. O Date local resolve a virada de ano. */
export function deslocarMes(mes: string, passo: number) {
  const [ano, m] = mes.split("-").map(Number)
  const d = new Date(ano, m - 1 + passo, 1)
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`
}

/** "2026-09" → "Setembro de 2026". */
export function rotuloDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number)
  const nome = MESES[m - 1]
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`
}

/** "2026-09-14" → "14 de setembro". */
export function diaPorExtenso(chave: string) {
  const d = dataDaChave(chave)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** "2026-09-14" → "segunda-feira". */
export function diaDaSemanaPorExtenso(chave: string) {
  return dataDaChave(chave).toLocaleDateString("pt-BR", { weekday: "long" })
}

/**
 * Todas as células da grade: do começo da semana que contém o dia 1º até o
 * fim da semana que contém o último dia. Sempre múltiplo de 7, entre 28 e 42
 * células — não são 42 fixas, porque uma linha vazia no fim é linha que a
 * pessoa lê como "sem nada marcado" quando na verdade é "não é este mês".
 */
export function gradeDoMes(mes: string): string[] {
  const [ano, m] = mes.split("-").map(Number)
  const primeiro = new Date(ano, m - 1, 1)
  const ultimo = new Date(ano, m, 0)

  // getDay(): 0 = domingo. Com a semana começando na segunda, domingo é o 6º.
  const recuo = (primeiro.getDay() + 6) % 7
  const avanco = 6 - ((ultimo.getDay() + 6) % 7)

  const inicio = new Date(ano, m - 1, 1 - recuo)
  const total = recuo + ultimo.getDate() + avanco

  return Array.from({ length: total }, (_, i) =>
    chaveDoDia(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)),
  )
}

/** Primeira e última chave da grade — o intervalo que a consulta precisa cobrir. */
export function intervaloDaGrade(mes: string) {
  const grade = gradeDoMes(mes)
  return { primeira: grade[0], ultima: grade[grade.length - 1] }
}

/** Agrupa por dia, preservando a ordem recebida (eventos por hora, metas depois). */
export function agruparPorDia(itens: ItemAgenda[]) {
  const mapa = new Map<string, ItemAgenda[]>()
  for (const item of itens) {
    const lista = mapa.get(item.dia)
    if (lista) lista.push(item)
    else mapa.set(item.dia, [item])
  }
  return mapa
}
