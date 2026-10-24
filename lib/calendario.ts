/**
 * Cálculo do calendário: recorrência, horário de Brasília, grade de horas,
 * busca, link do Google Agenda e arquivo .ics.
 *
 * SEM IMPORTS, de propósito. Os testes (scripts/testar-calendario.mjs) rodam
 * este arquivo direto no Node, sem o alias `@/` do Next, e o mesmo código roda
 * no servidor (página, feed) e no navegador (formulário). Por isso também não
 * usa Intl para achar o horário de Brasília: o Brasil não tem horário de verão
 * desde 2019, então o fuso é uma soma fixa — a mesma convenção de
 * lib/datas.ts (OFFSET_GEAR). Se o horário de verão voltar, são os DOIS
 * lugares a mudar, e o teste confere que continuam concordando.
 *
 * Vocabulário:
 *  - "dia"        → "YYYY-MM-DD", o dia em Brasília. Nunca Date no meio.
 *  - "minutos"    → minutos desde 00:00 desse dia (14:30 = 870).
 *  - "ocorrência" → uma vez em que o evento acontece. Evento único tem uma;
 *                   evento recorrente tem uma por repetição, calculada AQUI
 *                   (o banco guarda só a regra, não as linhas).
 *  - "segmento"   → o pedaço de uma ocorrência que cai em um dia. Reunião das
 *                   22h às 2h tem dois: 22h–24h num dia e 0h–2h no seguinte.
 */

const OFFSET_MIN = -180
const MS_DIA = 86_400_000
export const MINUTOS_DO_DIA = 1440

/** Duração mostrada no bloco quando o evento não tem hora de fim. */
export const DURACAO_PADRAO_MIN = 60
/** Altura mínima, em minutos, de um bloco na grade — evento curto continua clicável. */
export const BLOCO_MINIMO_MIN = 30

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]
const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]

const doisDigitos = (n: number) => String(n).padStart(2, "0")

// -----------------------------------------------------------------------------
// Dias e horário de Brasília
// -----------------------------------------------------------------------------

/** "2026-10-21" → dias desde 1970-01-01. Aritmética de calendário sem fuso. */
export function numeroDoDia(dia: string) {
  const [a, m, d] = dia.slice(0, 10).split("-").map(Number)
  return Math.round(Date.UTC(a, m - 1, d) / MS_DIA)
}

export function diaDoNumero(n: number) {
  const d = new Date(n * MS_DIA)
  return `${d.getUTCFullYear()}-${doisDigitos(d.getUTCMonth() + 1)}-${doisDigitos(d.getUTCDate())}`
}

export const somarDias = (dia: string, n: number) => diaDoNumero(numeroDoDia(dia) + n)

/** 0 = domingo. */
export const diaDaSemana = (dia: string) => (((numeroDoDia(dia) + 4) % 7) + 7) % 7

function diasNoMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** 870 → "14:30". 1440 → "24:00" (fim de um bloco que vai até a meia-noite). */
export const rotuloDeMinutos = (m: number) => `${doisDigitos(Math.floor(m / 60))}:${doisDigitos(m % 60)}`

/** Instante (ISO/UTC) → dia, minutos e "HH:MM" em Brasília. */
export function partesGear(iso: string) {
  const t = new Date(Date.parse(iso) + OFFSET_MIN * 60_000)
  const minutos = t.getUTCHours() * 60 + t.getUTCMinutes()
  const dia = `${t.getUTCFullYear()}-${doisDigitos(t.getUTCMonth() + 1)}-${doisDigitos(t.getUTCDate())}`
  return { dia, minutos, hora: rotuloDeMinutos(minutos) }
}

/** Dia + minutos em Brasília → instante em ISO/UTC. */
export function instanteGear(dia: string, minutos = 0) {
  const [a, m, d] = dia.slice(0, 10).split("-").map(Number)
  return new Date(Date.UTC(a, m - 1, d, 0, minutos) - OFFSET_MIN * 60_000).toISOString()
}

/** Valor de <input type="datetime-local"> ("2026-10-21T14:30") → ISO, lido como Brasília. */
export function localParaISO(valor: string) {
  const [dia, hora = "00:00"] = valor.split("T")
  const [h, m] = hora.split(":").map(Number)
  return instanteGear(dia, h * 60 + (m || 0))
}

/** ISO → valor de <input type="datetime-local">, em Brasília. */
export function isoParaLocal(iso: string) {
  const p = partesGear(iso)
  return `${p.dia}T${p.hora}`
}

/** "2026-10-21" → "21/10". */
export const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

/** "2026-10-21" → "21 de outubro". */
export function diaPorExtenso(dia: string) {
  return `${Number(dia.slice(8, 10))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`
}

/** "2026-10-21" → "quarta-feira, 21 de outubro". */
export function diaCompleto(dia: string) {
  return `${DIAS_SEMANA[diaDaSemana(dia)]}, ${diaPorExtenso(dia)}`
}

/** "YYYY-MM-DD" que existe de verdade (2026-02-31 não existe). */
export function ehDiaValido(dia: string | null | undefined): dia is string {
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false
  return diaDoNumero(numeroDoDia(dia)) === dia
}

// -----------------------------------------------------------------------------
// Eventos e recorrência
// -----------------------------------------------------------------------------

export const RECORRENCIAS = ["semanal", "quinzenal", "mensal"] as const
export type Recorrencia = (typeof RECORRENCIAS)[number]

export const ROTULO_RECORRENCIA: Record<Recorrencia, string> = {
  semanal: "Toda semana",
  quinzenal: "A cada 2 semanas",
  mensal: "Todo mês",
}

export function recorrenciaValida(valor: string | null | undefined): Recorrencia | null {
  return (RECORRENCIAS as readonly string[]).includes(valor ?? "") ? (valor as Recorrencia) : null
}

/** Colunas de `eventos` que a tela lê. Os campos depois de `frente_vinculada` vêm da 027. */
export type EventoCal = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  data_inicio: string
  data_fim: string | null
  frente_vinculada: string | null
  criado_por?: string | null
  local?: string | null
  link?: string | null
  dia_inteiro?: boolean | null
  recorrencia?: string | null
  recorrencia_ate?: string | null
}

export type Ocorrencia = {
  evento: EventoCal
  /** Dia em que ESTA ocorrência começa. É também a chave da presença. */
  dia: string
  /** Último dia dela, inclusive. Igual a `dia` na maioria. */
  diaFim: string
  diaInteiro: boolean
  /** Minutos desde 00:00 de `dia`. 0 em evento de dia inteiro. */
  inicioMin: number
  /** Minutos desde 00:00 de `diaFim`. Null: sem hora de fim, ou dia inteiro. */
  fimMin: number | null
  inicioISO: string
  fimISO: string | null
}

/**
 * A ocorrência que começa em `dia`. Presume que `dia` é uma data em que o
 * evento realmente acontece — quem decide isso é ocorrencias().
 */
export function ocorrenciaEm(evento: EventoCal, dia: string): Ocorrencia {
  const ini = partesGear(evento.data_inicio)

  if (evento.dia_inteiro) {
    // O último dia vem de data_fim (meia-noite de Brasília daquele dia) ou é o próprio dia.
    const fim = evento.data_fim ? partesGear(evento.data_fim).dia : ini.dia
    const extra = Math.max(0, numeroDoDia(fim) - numeroDoDia(ini.dia))
    return {
      evento, dia, diaFim: somarDias(dia, extra), diaInteiro: true,
      inicioMin: 0, fimMin: null, inicioISO: instanteGear(dia, 0), fimISO: null,
    }
  }

  const inicioISO = instanteGear(dia, ini.minutos)
  if (!evento.data_fim) {
    return { evento, dia, diaFim: dia, diaInteiro: false, inicioMin: ini.minutos, fimMin: null, inicioISO, fimISO: null }
  }

  const duracao = Date.parse(evento.data_fim) - Date.parse(evento.data_inicio)
  const fimISO = new Date(Date.parse(inicioISO) + duracao).toISOString()
  const fim = partesGear(fimISO)
  let diaFim = fim.dia
  let fimMin = fim.minutos
  // Termina à meia-noite em ponto: pertence ao dia que acabou, não a um bloco vazio no seguinte.
  if (fimMin === 0 && numeroDoDia(diaFim) > numeroDoDia(dia)) {
    diaFim = somarDias(diaFim, -1)
    fimMin = MINUTOS_DO_DIA
  }
  return { evento, dia, diaFim, diaInteiro: false, inicioMin: ini.minutos, fimMin, inicioISO, fimISO }
}

const LIMITE_DE_REPETICOES = 800

/**
 * Todas as ocorrências do evento que encostam em [de, ate] (os dois inclusive).
 *
 * "Encostam" e não "começam": uma viagem de 3 dias que começou ontem ainda
 * está no calendário de hoje. A repetição é calculada aqui, não pelo banco, e
 * por isso a página pode pedir ao banco mais do que precisa e confiar que o
 * recorte certo sai desta função.
 *
 * Mensal repete no MESMO dia do mês e pula os meses que não o têm (o dia 31
 * não acontece em abril) — é o que o iCalendar faz, e a tela tem de concordar
 * com o que o Google Agenda mostrará depois de assinar.
 */
export function ocorrencias(evento: EventoCal, de: string, ate: string): Ocorrencia[] {
  const base = partesGear(evento.data_inicio).dia
  const primeira = ocorrenciaEm(evento, base)
  const extra = numeroDoDia(primeira.diaFim) - numeroDoDia(primeira.dia)
  const encosta = (d: string) => numeroDoDia(d) <= numeroDoDia(ate) && numeroDoDia(d) + extra >= numeroDoDia(de)

  const regra = recorrenciaValida(evento.recorrencia)
  if (!regra) return encosta(base) ? [primeira] : []

  const limite = evento.recorrencia_ate && ehDiaValido(evento.recorrencia_ate) ? numeroDoDia(evento.recorrencia_ate) : Infinity
  const fim = Math.min(numeroDoDia(ate), limite)
  const saida: Ocorrencia[] = []

  if (regra === "mensal") {
    const [anoBase, mesBase, diaDoMes] = base.split("-").map(Number)
    const alvo = somarDias(de, -extra)
    const [anoAlvo, mesAlvo] = alvo.split("-").map(Number)
    const comeco = Math.max(0, (anoAlvo - anoBase) * 12 + (mesAlvo - mesBase) - 1)
    for (let n = comeco; n < comeco + LIMITE_DE_REPETICOES; n++) {
      const indice = mesBase - 1 + n
      const ano = anoBase + Math.floor(indice / 12)
      const mes = (indice % 12) + 1
      if (diaDoMes > diasNoMes(ano, mes)) continue
      const d = `${ano}-${doisDigitos(mes)}-${doisDigitos(diaDoMes)}`
      if (numeroDoDia(d) > fim) break
      if (encosta(d)) saida.push(ocorrenciaEm(evento, d))
    }
    return saida
  }

  const passo = regra === "quinzenal" ? 14 : 7
  const n0 = numeroDoDia(base)
  const k0 = Math.max(0, Math.ceil((numeroDoDia(de) - extra - n0) / passo))
  for (let k = k0; k < k0 + LIMITE_DE_REPETICOES; k++) {
    const n = n0 + k * passo
    if (n > fim) break
    saida.push(ocorrenciaEm(evento, diaDoNumero(n)))
  }
  return saida
}

export type Segmento = {
  ocorrencia: Ocorrencia
  dia: string
  /** Null: evento de dia inteiro (não ocupa horário na grade). */
  inicioMin: number | null
  fimMin: number | null
  /** Sem hora de fim cadastrada — o bloco usa a duração padrão só para desenhar. */
  semFim: boolean
  continuaDeOntem: boolean
  continuaAmanha: boolean
}

/** Os pedaços diários da ocorrência dentro de [de, ate]. */
export function segmentos(o: Ocorrencia, de: string, ate: string): Segmento[] {
  const primeiro = Math.max(numeroDoDia(o.dia), numeroDoDia(de))
  const ultimo = Math.min(numeroDoDia(o.diaFim), numeroDoDia(ate))
  const saida: Segmento[] = []

  for (let n = primeiro; n <= ultimo; n++) {
    const dia = diaDoNumero(n)
    const ehPrimeiro = dia === o.dia
    const ehUltimo = dia === o.diaFim
    const base = { ocorrencia: o, dia, continuaDeOntem: !ehPrimeiro, continuaAmanha: !ehUltimo }

    if (o.diaInteiro) {
      saida.push({ ...base, inicioMin: null, fimMin: null, semFim: false })
      continue
    }

    const inicioMin = ehPrimeiro ? o.inicioMin : 0
    const semFim = ehUltimo && o.fimMin == null
    let fimMin = ehUltimo ? (o.fimMin ?? inicioMin + DURACAO_PADRAO_MIN) : MINUTOS_DO_DIA
    fimMin = Math.min(MINUTOS_DO_DIA, fimMin)
    if (fimMin <= inicioMin) fimMin = Math.min(MINUTOS_DO_DIA, inicioMin + BLOCO_MINIMO_MIN)
    saida.push({ ...base, inicioMin, fimMin, semFim })
  }
  return saida
}

// -----------------------------------------------------------------------------
// Presença
// -----------------------------------------------------------------------------

/** Espelha o CHECK de eventos_presencas.resposta (027). */
export const RESPOSTAS_PRESENCA = ["vou", "talvez", "nao"] as const
export type RespostaPresenca = (typeof RESPOSTAS_PRESENCA)[number]

export const ROTULO_PRESENCA: Record<RespostaPresenca, string> = {
  vou: "Vou",
  talvez: "Talvez",
  nao: "Não vou",
}

export function respostaValida(valor: string | null | undefined): RespostaPresenca | null {
  return (RESPOSTAS_PRESENCA as readonly string[]).includes(valor ?? "") ? (valor as RespostaPresenca) : null
}

// -----------------------------------------------------------------------------
// Grade de horas
// -----------------------------------------------------------------------------

export type Bloco = { id: string; inicio: number; fim: number }
export type BlocoPosto = Bloco & { coluna: number; colunas: number }

/**
 * Dispõe blocos que se sobrepõem lado a lado, como a grade do Google Agenda.
 *
 * Blocos que se tocam (direta ou por um terceiro) formam um grupo; dentro do
 * grupo cada bloco ocupa a primeira coluna livre, e todos dividem a largura
 * pelo número de colunas do grupo. Um bloco isolado ocupa a largura toda.
 * Bloco curto conta como `minimo` minutos para sobreposição — é a altura que
 * ele realmente ocupa na tela, e dois eventos às 14h e às 14h10 se encostam
 * ali mesmo que o primeiro dure cinco minutos.
 */
export function empilhar(blocos: Bloco[], minimo = BLOCO_MINIMO_MIN): BlocoPosto[] {
  const fimVisual = (b: Bloco) => Math.max(b.fim, b.inicio + minimo)
  const ordenados = [...blocos].sort((a, b) => a.inicio - b.inicio || fimVisual(b) - fimVisual(a) || a.id.localeCompare(b.id))

  const saida: BlocoPosto[] = []
  let grupo: BlocoPosto[] = []
  let fimDoGrupo = -Infinity
  let finsDasColunas: number[] = []

  const fechar = () => {
    for (const b of grupo) b.colunas = finsDasColunas.length
    saida.push(...grupo)
    grupo = []
    finsDasColunas = []
    fimDoGrupo = -Infinity
  }

  for (const b of ordenados) {
    if (b.inicio >= fimDoGrupo) fechar()
    let coluna = finsDasColunas.findIndex((fim) => fim <= b.inicio)
    if (coluna === -1) {
      coluna = finsDasColunas.length
      finsDasColunas.push(0)
    }
    finsDasColunas[coluna] = fimVisual(b)
    fimDoGrupo = Math.max(fimDoGrupo, fimVisual(b))
    grupo.push({ ...b, coluna, colunas: 1 })
  }
  fechar()
  return saida
}

/** Faixa de horas que a grade mostra: a padrão, esticada para caber o que estiver fora dela. */
export function janelaDeHoras(blocos: Bloco[], padrao = { de: 7, ate: 22 }) {
  let de = padrao.de
  let ate = padrao.ate
  for (const b of blocos) {
    de = Math.min(de, Math.floor(b.inicio / 60))
    ate = Math.max(ate, Math.ceil(Math.max(b.fim, b.inicio + BLOCO_MINIMO_MIN) / 60))
  }
  return { de: Math.max(0, de), ate: Math.min(24, ate) }
}

// -----------------------------------------------------------------------------
// Texto
// -----------------------------------------------------------------------------

/** "14:00–15:30", "14:00", "Dia inteiro", "21/10 22:00 – 22/10 02:00". */
export function rotuloDoHorario(o: Ocorrencia) {
  if (o.diaInteiro) {
    return o.diaFim === o.dia ? "Dia inteiro" : `Dia inteiro · ${diaCurto(o.dia)} a ${diaCurto(o.diaFim)}`
  }
  const ini = rotuloDeMinutos(o.inicioMin)
  if (o.fimMin == null) return ini
  const fim = rotuloDeMinutos(o.fimMin)
  if (o.diaFim === o.dia) return `${ini}–${fim}`
  return `${diaCurto(o.dia)} ${ini} – ${diaCurto(o.diaFim)} ${fim}`
}

/** "Toda quarta-feira", "A cada 2 semanas, às quartas-feiras", "Todo dia 21 do mês" (+ ", até 15 de dezembro"). */
export function rotuloDaRecorrencia(evento: Pick<EventoCal, "data_inicio" | "recorrencia" | "recorrencia_ate">) {
  const regra = recorrenciaValida(evento.recorrencia)
  if (!regra) return null
  const base = partesGear(evento.data_inicio).dia
  const nome = DIAS_SEMANA[diaDaSemana(base)]
  // Segunda a sexta são femininas ("toda", "às"); sábado e domingo, masculinos.
  const feminino = nome.endsWith("-feira")
  const plural = feminino ? nome.replace("-feira", "s-feiras") : `${nome}s`

  let texto =
    regra === "semanal" ? `${feminino ? "Toda" : "Todo"} ${nome}`
    : regra === "quinzenal" ? `A cada 2 semanas, ${feminino ? "às" : "aos"} ${plural}`
    : `Todo dia ${Number(base.slice(8, 10))} do mês`

  if (evento.recorrencia_ate && ehDiaValido(evento.recorrencia_ate)) {
    texto += `, até ${diaPorExtenso(evento.recorrencia_ate)}`
  }
  return texto
}

/** Minúsculas e sem acento: "Reunião" casa com "reuniao". */
export const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

/** Todas as palavras de `busca` aparecem em algum dos textos. Busca vazia casa com tudo. */
export function combinaBusca(textos: (string | null | undefined)[], busca: string) {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return true
  const alvo = normalizar(textos.filter(Boolean).join(" "))
  return palavras.every((p) => alvo.includes(p))
}

/** Só http(s). Link guardado no banco é digitado por gente; `javascript:` não vira href. */
export function linkSeguro(url: string | null | undefined) {
  if (!url) return null
  try {
    const u = new URL(url.trim())
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}

// -----------------------------------------------------------------------------
// Google Agenda e .ics
// -----------------------------------------------------------------------------

/** ISO → "20261021T170000Z". */
export const formatoICS = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

const dataICS = (dia: string) => dia.replace(/-/g, "")

function regraICS(evento: EventoCal) {
  const regra = recorrenciaValida(evento.recorrencia)
  if (!regra) return null
  const freq = regra === "mensal" ? "FREQ=MONTHLY" : regra === "quinzenal" ? "FREQ=WEEKLY;INTERVAL=2" : "FREQ=WEEKLY"
  if (!evento.recorrencia_ate || !ehDiaValido(evento.recorrencia_ate)) return freq
  // Evento com hora: UNTIL em UTC e ao fim do último dia (em Brasília); dia inteiro: só a data.
  const ate = evento.dia_inteiro ? dataICS(evento.recorrencia_ate) : formatoICS(instanteGear(evento.recorrencia_ate, MINUTOS_DO_DIA - 1))
  return `${freq};UNTIL=${ate}`
}

/** Endereço que abre o Google Agenda com o evento preenchido, só falta salvar. */
export function linkGoogleAgenda(o: Ocorrencia) {
  const e = o.evento
  const datas = o.diaInteiro
    ? `${dataICS(o.dia)}/${dataICS(somarDias(o.diaFim, 1))}`
    : `${formatoICS(o.inicioISO)}/${formatoICS(o.fimISO ?? new Date(Date.parse(o.inicioISO) + DURACAO_PADRAO_MIN * 60_000).toISOString())}`

  const link = linkSeguro(e.link)
  const detalhes = [e.descricao, link ? `Link: ${link}` : null].filter(Boolean).join("\n\n")

  const p = new URLSearchParams({ action: "TEMPLATE", text: e.titulo, dates: datas, ctz: "America/Sao_Paulo" })
  if (detalhes) p.set("details", detalhes)
  if (e.local) p.set("location", e.local)
  const regra = regraICS(e)
  if (regra) p.set("recur", `RRULE:${regra}`)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/** Escape de texto do iCalendar: barra, ponto e vírgula, vírgula e quebra de linha. */
export const escaparICS = (texto: string) =>
  texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

/**
 * Linhas do .ics não passam de 75 BYTES (não caracteres): acima disso a linha
 * é quebrada e a continuação começa com um espaço. Cortar no meio de um
 * caractere acentuado corromperia o texto, então o corte respeita o UTF-8.
 */
export function dobrarLinha(linha: string) {
  const codificador = new TextEncoder()
  if (codificador.encode(linha).length <= 75) return linha

  const partes: string[] = []
  let atual = ""
  let bytes = 0
  let limite = 75
  for (const caractere of linha) {
    const tamanho = codificador.encode(caractere).length
    if (bytes + tamanho > limite) {
      partes.push(atual)
      atual = ""
      bytes = 0
      limite = 74 // o espaço da continuação também conta
    }
    atual += caractere
    bytes += tamanho
  }
  partes.push(atual)
  return partes.join("\r\n ")
}

function linhasDoEvento(e: EventoCal, agora: string, lembreteMin: number | null) {
  const o = ocorrenciaEm(e, partesGear(e.data_inicio).dia)
  const linhas = ["BEGIN:VEVENT", `UID:${e.id}@gear.ufscar`, `DTSTAMP:${formatoICS(agora)}`]

  if (o.diaInteiro) {
    linhas.push(`DTSTART;VALUE=DATE:${dataICS(o.dia)}`, `DTEND;VALUE=DATE:${dataICS(somarDias(o.diaFim, 1))}`)
  } else {
    linhas.push(`DTSTART:${formatoICS(o.inicioISO)}`)
    if (o.fimISO) linhas.push(`DTEND:${formatoICS(o.fimISO)}`)
    else linhas.push(`DURATION:PT${DURACAO_PADRAO_MIN}M`)
  }

  const regra = regraICS(e)
  if (regra) linhas.push(`RRULE:${regra}`)

  linhas.push(`SUMMARY:${escaparICS(e.titulo)}`)
  const link = linkSeguro(e.link)
  const descricao = [e.descricao, link ? `Link: ${link}` : null].filter(Boolean).join("\n\n")
  if (descricao) linhas.push(`DESCRIPTION:${escaparICS(descricao)}`)
  if (e.local) linhas.push(`LOCATION:${escaparICS(e.local)}`)
  if (link) linhas.push(`URL:${link}`)
  // Cada categoria é escapada sozinha; a vírgula que as separa é a do formato.
  linhas.push(`CATEGORIES:${[e.tipo, e.frente_vinculada].filter(Boolean).map((c) => escaparICS(c as string)).join(",")}`)

  if (lembreteMin != null && !o.diaInteiro) {
    linhas.push(
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escaparICS(e.titulo)}`,
      `TRIGGER:-PT${lembreteMin}M`, "END:VALARM",
    )
  }
  linhas.push("END:VEVENT")
  return linhas
}

/**
 * Arquivo iCalendar (RFC 5545). Horários saem em UTC ("Z"), o que dispensa o
 * bloco VTIMEZONE e é lido igual por Google, Apple e Outlook.
 *
 * `agora` entra como parâmetro (DTSTAMP) para o resultado ser reproduzível no
 * teste. `lembreteMin` é para o download de UM evento; o feed de assinatura
 * não leva alarme — quem assina decide os avisos no próprio aplicativo.
 */
export function gerarICS({
  nome, eventos, agora, lembreteMin = null,
}: { nome: string; eventos: EventoCal[]; agora: string; lembreteMin?: number | null }) {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GEAR UFSCar//Calendario//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparICS(nome)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...eventos.flatMap((e) => linhasDoEvento(e, agora, lembreteMin)),
    "END:VCALENDAR",
  ]
  return linhas.map(dobrarLinha).join("\r\n") + "\r\n"
}
