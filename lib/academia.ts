/**
 * Academia GEAR: o que a tela e o banco precisam concordar.
 *
 * O nome é `NIVEIS_ACADEMIA` e não `NIVEIS` porque lib/parceiros.ts já exporta
 * um `NIVEIS` (as cotas de patrocínio). São coisas diferentes com o mesmo nome
 * curto, e quem importar as duas num arquivo só não deve precisar de apelido.
 */

/** Ordem dos níveis na formação — o banco não tem como saber essa hierarquia. */
export const NIVEIS_ACADEMIA = ["Fundamental", "Principal", "Avançada"] as const

export type NivelAcademia = (typeof NIVEIS_ACADEMIA)[number]

export type Modulo = {
  id: string
  nivel: string
  ordem: number
  titulo: string
  descricao: string | null
  conteudo_url: string | null
  /** Coluna `date` (022): "YYYY-MM-DD", sem hora. Null = sem prazo. */
  prazo_conclusao: string | null
  /** Minutos (022). Null = não estimada. Ver formatarDuracao(). */
  duracao_estimada: number | null
  /** 043: competência. Nulos nos nove módulos antigos. */
  codigo: string | null
  area: string | null
  pontos: number
  criterio_aceite: string | null
  guia_id: string | null
  /** 047: competência recomendada antes (sem trava). */
  requisito_id: string | null
}

/** Colunas que toda consulta de módulo pede. Uma lista, um lugar. */
export const COLUNAS_MODULO =
  "id, nivel, ordem, titulo, descricao, conteudo_url, prazo_conclusao, duracao_estimada, codigo, area, pontos, criterio_aceite, guia_id, requisito_id"

/**
 * Minutos → "2h30min". É a contrapartida na tela da decisão da 022 de guardar
 * duração como inteiro: o banco soma, isto aqui imprime.
 *
 * Os três formatos são os que aparecem de fato: "45min" abaixo de uma hora,
 * "2h" quando é hora cheia (o "0min" não acrescenta nada), "2h30min" no resto.
 */
export function formatarDuracao(minutos: number | null | undefined) {
  if (!minutos || minutos <= 0) return null

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  if (horas === 0) return `${resto}min`
  if (resto === 0) return `${horas}h`
  return `${horas}h${String(resto).padStart(2, "0")}min`
}


/** Áreas das competências, espelho do CHECK de modulos.area (043). */
export const AREAS_COMPETENCIA = [
  "IA", "Visão Computacional", "Sistemas Embarcados", "Robótica Móvel", "Eletrônica", "Mecânica",
  "Controle", "CAD", "ROS 2", "Aprendizado por Reforço", "Drones", "Manipulação",
] as const

/** Espelho do CHECK de progresso.estado (043). `null` = só marcou início, antes da 043. */
export const ESTADOS_COMPROVACAO = ["Enviada", "Em revisão", "Ajustes", "Aprovada"] as const
export type EstadoComprovacao = (typeof ESTADOS_COMPROVACAO)[number]

export type Comprovacao = {
  id: string
  usuario_id: string
  modulo_id: string
  estado: EstadoComprovacao | null
  evidencia_url: string | null
  comentario: string | null
  enviada_em: string | null
  concluido_em: string | null
  legado: boolean
}

export const COLUNAS_COMPROVACAO = "id, usuario_id, modulo_id, estado, evidencia_url, comentario, enviada_em, concluido_em, legado"

/** Pontos validados: só comprovação APROVADA conta (nada por "estar em andamento"). */
export function pontosAprovados(comprovacoes: Pick<Comprovacao, "modulo_id" | "estado">[], modulos: Pick<Modulo, "id" | "pontos">[]) {
  const pontos = new Map(modulos.map((m) => [m.id, m.pontos ?? 0]))
  return comprovacoes.filter((c) => c.estado === "Aprovada").reduce((soma, c) => soma + (pontos.get(c.modulo_id) ?? 0), 0)
}

/** O membro pode (re)enviar: nunca enviou, ficou só "iniciada", pediram ajustes, ou ainda ninguém pegou. */
export const podeEnviarComprovacao = (estado: EstadoComprovacao | null | undefined) =>
  estado == null || estado === "Ajustes" || estado === "Enviada"

/** Áreas da base de conhecimento: as das competências mais "Geral" (044). */
export const AREAS_ARTIGO = ["Geral", ...AREAS_COMPETENCIA] as const

// --- 047: lições -------------------------------------------------------------

export const TIPOS_LICAO = ["texto", "video", "quiz"] as const
export type TipoLicao = (typeof TIPOS_LICAO)[number]

export type Questao = { pergunta: string; opcoes: string[]; correta: number; explicacao?: string }

export type Licao = {
  id: string
  modulo_id: string
  ordem: number
  titulo: string
  tipo: TipoLicao
  corpo: string
  video_url: string | null
  questoes: Questao[]
  duracao_min: number | null
}

export const COLUNAS_LICAO = "id, modulo_id, ordem, titulo, tipo, corpo, video_url, questoes, duracao_min"

export const ordenarLicoes = (a: Pick<Licao, "ordem" | "titulo">, b: Pick<Licao, "ordem" | "titulo">) =>
  a.ordem - b.ordem || a.titulo.localeCompare(b.titulo)

/**
 * Quiz em texto, para quem escreve não precisar de JSON:
 *
 *   ? Qual comando lista os tópicos?
 *   - ros2 node list
 *   * ros2 topic list        ← "*" marca a certa (exatamente uma)
 *   > Explicação opcional, mostrada depois de responder.
 *
 * Questões separadas por linha em branco ou por um novo "?". Devolve as
 * questões ou a mensagem do primeiro problema achado.
 */
export function lerQuiz(texto: string): { questoes: Questao[] } | { erro: string } {
  const questoes: Questao[] = []
  let atual: { pergunta: string; opcoes: string[]; certas: number[]; explicacao: string[] } | null = null

  const fechar = () => {
    if (!atual) return null
    const n = questoes.length + 1
    if (atual.opcoes.length < 2) return `Questão ${n} precisa de pelo menos duas opções.`
    if (atual.certas.length !== 1) return `Questão ${n} precisa de exatamente uma opção marcada com "*".`
    const explicacao = atual.explicacao.join(" ").trim()
    questoes.push({ pergunta: atual.pergunta, opcoes: atual.opcoes, correta: atual.certas[0], ...(explicacao ? { explicacao } : {}) })
    atual = null
    return null
  }

  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim()
    if (!linha) continue
    const marca = linha[0]
    const resto = linha.slice(1).trim()
    if (marca === "?") {
      const erro = fechar()
      if (erro) return { erro }
      if (!resto) return { erro: `Questão ${questoes.length + 1} sem pergunta.` }
      atual = { pergunta: resto, opcoes: [], certas: [], explicacao: [] }
    } else if (!atual) {
      return { erro: `Comece cada questão com "?". Linha: ${linha}` }
    } else if (marca === "-" || marca === "*") {
      if (marca === "*") atual.certas.push(atual.opcoes.length)
      atual.opcoes.push(resto)
    } else if (marca === ">") {
      atual.explicacao.push(resto)
    } else {
      return { erro: `Linha sem marca (?, -, * ou >): ${linha}` }
    }
  }
  const erro = fechar()
  if (erro) return { erro }
  if (questoes.length === 0) return { erro: "O quiz precisa de pelo menos uma questão." }
  return { questoes }
}

/** Inverso de lerQuiz, para abrir o quiz salvo no formulário. */
export const escreverQuiz = (questoes: Questao[]) =>
  questoes
    .map((q) => [`? ${q.pergunta}`, ...q.opcoes.map((o, i) => `${i === q.correta ? "*" : "-"} ${o}`), ...(q.explicacao ? [`> ${q.explicacao}`] : [])].join("\n"))
    .join("\n\n")

/** Link do YouTube → player sem cookies; outro link → null (a tela mostra o link). */
export function embedDoVideo(url: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, "")
    const id =
      host === "youtu.be" ? u.pathname.slice(1) :
      host === "youtube.com" ? (u.pathname.startsWith("/watch") ? u.searchParams.get("v") : u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]) :
      null
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  } catch {
    return null
  }
}

/**
 * Dias seguidos estudando, terminando hoje ou ontem (estudar hoje mantém, não
 * é obrigatório para não zerar até o dia acabar), como no Duolingo.
 * `dias` e `hoje` são "YYYY-MM-DD" já no fuso da GEAR (diaGear / hojeISO).
 */
export function sequenciaDias(dias: string[], hoje: string) {
  const tem = new Set(dias)
  const menos1 = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
  let dia = tem.has(hoje) ? hoje : menos1(hoje)
  let n = 0
  while (tem.has(dia)) {
    n++
    dia = menos1(dia)
  }
  return n
}

/** Primeira lição não feita, na ordem; null quando todas estão feitas (ou não há lição). */
export const proximaLicao = <L extends Pick<Licao, "id">>(licoes: L[], feitas: Set<string>) =>
  licoes.find((l) => !feitas.has(l.id)) ?? null

/**
 * "Continuar de onde parou": a competência da lição feita mais recente que
 * ainda tem lição pela frente, e essa próxima lição. `feitas` vem da mais
 * recente para a mais antiga; `licoes` já em ordem (ordenarLicoes).
 * Usado na Academia e no Hoje, para os dois nunca apontarem lugares diferentes.
 */
export function continuarEstudo<L extends Pick<Licao, "id" | "modulo_id">>(licoes: L[], feitas: { licao_id: string }[]) {
  const ids = new Set(feitas.map((f) => f.licao_id))
  for (const f of feitas) {
    const mid = licoes.find((l) => l.id === f.licao_id)?.modulo_id
    const licao = mid ? proximaLicao(licoes.filter((l) => l.modulo_id === mid), ids) : null
    if (licao) return { moduloId: mid!, licao, href: `/membros/aprendizagem/${mid}?licao=${licao.id}` }
  }
  return null
}

/** Dias seguidos a partir de lições feitas e comprovações enviadas (timestamps). */
export const diasEstudados = (instantes: (string | null | undefined)[], paraDia: (iso: string) => string) =>
  instantes.filter((d): d is string => Boolean(d)).map(paraDia)
