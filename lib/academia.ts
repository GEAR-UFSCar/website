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
}

export type Progresso = {
  modulo_id: string
  concluido_em: string | null
}

/** Colunas que toda consulta de módulo pede. Uma lista, um lugar. */
export const COLUNAS_MODULO =
  "id, nivel, ordem, titulo, descricao, conteudo_url, prazo_conclusao, duracao_estimada"

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

/** Estado de um módulo na trilha, na linguagem que o badge usa. */
export type EstadoModulo = "Concluído" | "Em andamento" | "A fazer" | "Bloqueado"

/**
 * A gramática visual dos quatro estados, num lugar só — mesma ideia de
 * aparenciaDoStatus() em lib/sprints.ts.
 *
 * "Em andamento" existe para UM módulo por vez: o que a pessoa está fazendo
 * agora. A Academia registra conclusão por módulo, não fração dentro dele
 * (não há sub-itens no banco), então "em andamento" é posição na fila, não
 * uma porcentagem medida — e a tela não finge o contrário.
 */
export const APARENCIA_MODULO: Record<EstadoModulo, string> = {
  Concluído: "border-[var(--gear-amber)] text-[var(--gear-amber)]",
  "Em andamento": "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]",
  "A fazer": "border-white/20 text-muted-foreground",
  Bloqueado: "border-white/10 text-white/40",
}

export type Estagio = {
  nivel: NivelAcademia
  indice: number
  modulos: Modulo[]
  feitos: number
  total: number
  completo: boolean
  /** Trava entre níveis — afordância de interface, não garantia. Ver abaixo. */
  travado: boolean
  /** Maior prazo entre os módulos do nível. Null = nenhum módulo tem prazo. */
  prazo: string | null
}

/**
 * Os três níveis com progresso, trava e prazo já contabilizados.
 *
 * Nível sem módulo nenhum (banco a meio caminho de uma migração) não trava o
 * seguinte: sem isso, um seed incompleto deixaria a Academia inacessível.
 *
 * TRAVA ENTRE NÍVEIS — SÓ NA INTERFACE. A regra que o banco garante (trigger
 * validar_ordem_progresso, em supabase/005_ordem_progresso.sql) é sequencial
 * DENTRO de um nível: `anterior.nivel = nivel_alvo`. Ela não sabe nada sobre a
 * ordem Fundamental → Principal → Avançada. O `travado` daqui comunica a ordem
 * da formação a quem olha a página e não sobreviveria a um POST direto ao
 * PostgREST. Se um dia precisar ser regra de verdade, o lugar é uma migração
 * que estenda aquele trigger — não mais JavaScript aqui.
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

  return parciais.map((estagio) => ({
    ...estagio,
    travado: parciais
      .slice(0, estagio.indice)
      .some((anterior) => anterior.total > 0 && !anterior.completo),
  }))
}
