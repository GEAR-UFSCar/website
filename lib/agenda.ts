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

import { diaGear } from "@/lib/datas"
import { MESES, diaPorExtenso as diaPorExtensoGear, type RespostaPresenca } from "@/lib/calendario"

export type OrigemItem = "evento" | "meta" | "sprint" | "modulo"

/**
 * Uma linha do calendário NUM DIA. Evento de três dias vira três itens (um por
 * dia), e evento recorrente vira um por repetição: a grade desenha itens, e é
 * a página que decide quantos existem.
 */
export type ItemAgenda = {
  /** Único na tela: evento e dia entram na chave, porque o mesmo evento repete. */
  id: string
  origem: OrigemItem
  titulo: string
  /** "YYYY-MM-DD" em Brasília — a célula em que o item cai. */
  dia: string
  /** "14:30" para o que tem hora; null para prazo e evento de dia inteiro. */
  hora: string | null
  descricao: string | null
  /** "Reunião"/"Sprint"/"Prazo"/"Outro" no evento; "Sua meta", "Sprint · Em andamento"… nos demais. */
  rotulo: string
  frente: string | null
  /** Só em meta: prazo vencido e não concluída. */
  atrasada?: boolean
  concluida?: boolean

  /** Para onde o item leva quando não abre o painel (meta, sprint, módulo). */
  href?: string
  /** Só em evento: tipo (Reunião, Sprint, Prazo, Outro). */
  tipo?: string
  /** Só em evento: id real da linha e dia em que ESTA ocorrência começa — abrem o painel. */
  eventoId?: string
  ocorrencia?: string
  /** "19:00–20:30", "Dia inteiro", "19:00". */
  horario?: string
  local?: string | null
  repete?: boolean
  /** Minutos desde 00:00 do dia para a grade de horas. Null = dia inteiro (vai na faixa de cima). */
  inicioMin: number | null
  fimMin: number | null
  /** Evento sem hora de fim: o bloco da grade usa 1h só para desenhar. */
  semFim?: boolean
  continuaDeOntem?: boolean
  continuaAmanha?: boolean
  /** Minha resposta de presença nesta ocorrência. */
  resposta?: RespostaPresenca | null
  /** Meta minha ou sprint em que sou responsável. Alimenta o filtro "só o meu". */
  meu?: boolean
}

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

/**
 * Timestamp do Postgres → chave de dia em Brasília. NÃO no fuso do servidor:
 * na Vercel ele é UTC, e um evento das 22h cairia na célula do dia seguinte.
 */
export const chaveDoTimestamp = (iso: string) => diaGear(iso)

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
export const diaPorExtenso = diaPorExtensoGear

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

// -----------------------------------------------------------------------------
// Visões Semana e Dia
//
// Mesma regra do resto do arquivo: tudo é chave "YYYY-MM-DD", e Date só entra
// para a aritmética de calendário (somar dias, achar a segunda-feira) — nunca
// para decidir em que dia um timestamp cai, que é trabalho de diaGear().
// -----------------------------------------------------------------------------

export const VISOES = ["semana", "dia", "mes", "agenda"] as const
export type Visao = (typeof VISOES)[number]

export const ROTULO_DA_VISAO: Record<Visao, string> = {
  semana: "Semana",
  dia: "Dia",
  mes: "Mês",
  agenda: "Agenda",
}

/** Visão válida, ou `alternativa` quando vier lixo pela URL. */
export function visaoValida(bruta: string | undefined, alternativa: Visao): Visao {
  return (VISOES as readonly string[]).includes(bruta ?? "") ? (bruta as Visao) : alternativa
}

/** "YYYY-MM-DD" que existe de verdade no calendário, ou `alternativa`. */
export function chaveDeDiaValida(bruta: string | undefined, alternativa: string) {
  if (!bruta || !/^\d{4}-\d{2}-\d{2}$/.test(bruta)) return alternativa
  // 2026-02-31 passa na regex; o Date normaliza para março e a ida e volta denuncia.
  return chaveDoDia(dataDaChave(bruta)) === bruta ? bruta : alternativa
}

/** Desloca a chave de dia em `passo` dias. */
export function deslocarDia(chave: string, passo: number) {
  const d = dataDaChave(chave)
  return chaveDoDia(new Date(d.getFullYear(), d.getMonth(), d.getDate() + passo))
}

/** As 7 chaves da semana (segunda a domingo) que contém `chave`. */
export function semanaDe(chave: string): string[] {
  const recuo = (dataDaChave(chave).getDay() + 6) % 7
  const segunda = deslocarDia(chave, -recuo)
  return Array.from({ length: 7 }, (_, i) => deslocarDia(segunda, i))
}

/** "Semana de 12 a 18 de outubro" — ou com os dois meses, quando ela vira o mês. */
export function rotuloDaSemana(chave: string) {
  const dias = semanaDe(chave)
  const ini = dataDaChave(dias[0])
  const fim = dataDaChave(dias[6])
  if (ini.getMonth() === fim.getMonth()) {
    return `Semana de ${ini.getDate()} a ${diaPorExtenso(dias[6])}`
  }
  return `Semana de ${diaPorExtenso(dias[0])} a ${diaPorExtenso(dias[6])}`
}

/** "Sexta-feira, 16 de outubro". */
export function rotuloDoDia(chave: string) {
  const semana = diaDaSemanaPorExtenso(chave)
  return `${semana[0].toUpperCase()}${semana.slice(1)}, ${diaPorExtenso(chave)}`
}

/** Dias inteiros de `de` até `ate`, as duas como chave. Negativo = já passou. */
export function diasEntre(de: string, ate: string) {
  return Math.round((dataDaChave(ate).getTime() - dataDaChave(de).getTime()) / 86_400_000)
}

/** Camadas que a pessoa pode esconder. Evento do GEAR não está aqui: é o calendário. */
export const CAMADAS = ["metas", "sprints", "academia"] as const
export type Camada = (typeof CAMADAS)[number]
export const ROTULO_DA_CAMADA: Record<Camada, string> = {
  metas: "Metas",
  sprints: "Sprints",
  academia: "Academia",
}

/** Lista de camadas escondidas vinda da URL ("sem=metas,sprints"), sem lixo e sem repetição. */
export function camadasEscondidas(bruto: string | undefined): Camada[] {
  const lista = (bruto ?? "").split(",").map((c) => c.trim())
  return CAMADAS.filter((c) => lista.includes(c))
}

/**
 * Tudo o que a URL do calendário guarda. Visão e dia moram na URL (e não em
 * useState) pelo mesmo motivo do `?mes=` que já existia: a página busca no
 * servidor só o intervalo que vai desenhar, e o link pode ser mandado no grupo.
 *
 * Os quatro últimos campos (evento, ocorrencia, novo, editar) são o PAINEL
 * lateral, não o período: navegar para outro dia fecha o painel, e é por isso
 * que `comEstado()` os zera a cada link.
 */
export type EstadoCalendario = {
  visao: Visao
  dia: string
  frente?: string | null
  tipo?: string | null
  q?: string | null
  /** "Só o meu": o que eu confirmei, minhas metas e meus sprints. */
  meu?: boolean
  sem?: Camada[]
  evento?: string | null
  ocorrencia?: string | null
  novo?: boolean
  editar?: boolean
}

export function hrefCalendario(estado: EstadoCalendario) {
  const p = new URLSearchParams({ visao: estado.visao })
  if (estado.visao === "mes") p.set("mes", mesDaChave(estado.dia))
  else p.set("dia", estado.dia)
  if (estado.frente) p.set("frente", estado.frente)
  if (estado.tipo) p.set("tipo", estado.tipo)
  if (estado.q) p.set("q", estado.q)
  if (estado.meu) p.set("meu", "1")
  if (estado.sem?.length) p.set("sem", estado.sem.join(","))
  if (estado.evento) {
    p.set("evento", estado.evento)
    if (estado.ocorrencia) p.set("ocorrencia", estado.ocorrencia)
    if (estado.editar) p.set("editar", "1")
  }
  if (estado.novo) p.set("novo", "1")
  return `/membros/calendario?${p.toString()}`
}

/**
 * Gerador de links que parte do estado atual e muda só o que se pede. O painel
 * sempre começa fechado: quem troca de semana não quer o evento da semana
 * passada ainda aberto por cima.
 */
export function comEstado(atual: EstadoCalendario) {
  return (mudanca: Partial<EstadoCalendario> = {}) =>
    hrefCalendario({ ...atual, evento: null, ocorrencia: null, novo: false, editar: false, ...mudanca })
}
