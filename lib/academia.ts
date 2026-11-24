/**
 * Academia GEAR: o que a tela e o banco precisam concordar.
 *
 * Saiu de dentro de app/membros/aprendizagem/page.tsx quando a página passou a
 * ter cartões além da lista — a ordem dos níveis e o cálculo de estágio eram
 * usados em quatro lugares da mesma função, e agora em mais de um arquivo.
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
}

export type Progresso = {
  modulo_id: string
  concluido_em: string | null
}

/** Colunas que toda consulta de módulo pede. Uma lista, um lugar. */
export const COLUNAS_MODULO =
  "id, nivel, ordem, titulo, descricao, conteudo_url, prazo_conclusao, duracao_estimada, codigo, area, pontos, criterio_aceite, guia_id"

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


export type Estagio = {
  nivel: NivelAcademia
  indice: number
  modulos: Modulo[]
  feitos: number
  total: number
  completo: boolean
  /** Maior prazo entre os módulos do nível. Null = nenhum módulo tem prazo. */
  prazo: string | null
}

/**
 * Os três níveis com progresso e prazo já contabilizados. Sem trava entre
 * níveis nem dentro deles desde a 043: o membro escolhe a competência.
 * "Concluído" aqui é comprovação APROVADA (concluido_em preenchido).
 */
export function montarEstagios(modulos: Modulo[], concluidos: Set<string>): Estagio[] {
  const parciais = NIVEIS_ACADEMIA.map((nivel, indice) => {
    const doNivel = modulos.filter((m) => m.nivel === nivel).sort((a, b) => a.ordem - b.ordem)
    const feitos = doNivel.filter((m) => concluidos.has(m.id)).length
    // Maior prazo entre os módulos do nível — ver o comentário da 022.
    const prazos = doNivel.map((m) => m.prazo_conclusao).filter((p): p is string => Boolean(p))

    return {
      nivel,
      indice,
      modulos: doNivel,
      feitos,
      total: doNivel.length,
      completo: doNivel.length > 0 && feitos === doNivel.length,
      // strings "YYYY-MM-DD" ordenam por comparação direta; sort() basta
      prazo: prazos.length > 0 ? prazos.sort().at(-1)! : null,
    }
  })

  return parciais
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
