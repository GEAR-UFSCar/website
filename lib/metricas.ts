/**
 * Métricas e impacto: a cadeia lógica Insumos → Atividades → Resultados →
 * Impacto, num lugar só.
 *
 * As quatro camadas são jsonb no banco (supabase/019_metricas.sql). O tipo
 * aqui é o contrato dos dois lados: o formulário escreve exatamente isto, a
 * tela lê exatamente isto. jsonb não valida forma — quem valida é este
 * arquivo, e é por isso que toda leitura passa por `normalizar*`, que preenche
 * o que faltar em vez de deixar `undefined` chegar à tela.
 *
 * Nome da coluna: `frente`, não `trilha`. A 013 renomeou o vocabulário em
 * perfis, sprints e eventos, e a policy de escrita desta tabela compara
 * justamente com `perfis.frente`.
 */

import { hojeISO } from "@/lib/datas"

export const STATUS_PERIODO = ["Em andamento", "Fechado"] as const
export type StatusPeriodo = (typeof STATUS_PERIODO)[number]

export type Insumos = {
  membros_ativos: number
  horas_semanais_media: number
  /** Somado de `patrimonio` no momento de salvar — nunca digitado. */
  valor_patrimonio: number
  patrocinio_recebido: number
}

export type Atividades = {
  sprints_concluidos: number
  modulos_ministrados: number
  reunioes_realizadas: number
  cursos_ofertados: string[]
  eventos_divulgacao: number
}

export type Resultados = {
  projetos_validacao_concluidos: number
  publicacoes_submetidas: number
  publicacoes_aceitas: number
  competicoes_disputadas: number
  membros_completaram_academia: number
}

export type Colocacao = { edicao: string; colocacao: string }

export type Impacto = {
  membros_estagio_ic_bolsa: number
  projetos_viraram_tcc_pesquisa: number
  colocacoes_competicao: Colocacao[]
  citacoes_publicacoes: number
  /** Quantos chegaram a cada degrau — é funil, então só desce. */
  funil_retencao: { bootcamp: number; academia: number; frente: number }
  parcerias_apoio_real: number
}

export type MetricaPeriodo = {
  id: string
  periodo: string
  status: string
  frente: string | null
  insumos: Insumos
  atividades: Atividades
  resultados: Resultados
  impacto: Impacto
  atualizado_por: string | null
  atualizado_em: string
  created_at: string
}

export const COLUNAS_METRICA =
  "id, periodo, status, frente, insumos, atividades, resultados, impacto, atualizado_por, atualizado_em, created_at"

export const INSUMOS_ZERADOS: Insumos = {
  membros_ativos: 0,
  horas_semanais_media: 0,
  valor_patrimonio: 0,
  patrocinio_recebido: 0,
}

export const ATIVIDADES_ZERADAS: Atividades = {
  sprints_concluidos: 0,
  modulos_ministrados: 0,
  reunioes_realizadas: 0,
  cursos_ofertados: [],
  eventos_divulgacao: 0,
}

export const RESULTADOS_ZERADOS: Resultados = {
  projetos_validacao_concluidos: 0,
  publicacoes_submetidas: 0,
  publicacoes_aceitas: 0,
  competicoes_disputadas: 0,
  membros_completaram_academia: 0,
}

export const IMPACTO_ZERADO: Impacto = {
  membros_estagio_ic_bolsa: 0,
  projetos_viraram_tcc_pesquisa: 0,
  colocacoes_competicao: [],
  citacoes_publicacoes: 0,
  funil_retencao: { bootcamp: 0, academia: 0, frente: 0 },
  parcerias_apoio_real: 0,
}

/* --- normalização ---------------------------------------------------------
 * jsonb aceita qualquer forma. Uma chave nova no código, um registro gravado
 * por uma versão anterior, uma edição manual pelo SQL Editor — em todos esses
 * casos a tela receberia `undefined` e renderizaria "NaN" ou quebraria no
 * `.map`. Estas funções são a fronteira onde isso para.
 */

const numero = (v: unknown, padrao = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : padrao

const listaDeTexto = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []

export function normalizarInsumos(v: unknown): Insumos {
  const o = (v ?? {}) as Partial<Insumos>
  return {
    membros_ativos: numero(o.membros_ativos),
    horas_semanais_media: numero(o.horas_semanais_media),
    valor_patrimonio: numero(o.valor_patrimonio),
    patrocinio_recebido: numero(o.patrocinio_recebido),
  }
}

export function normalizarAtividades(v: unknown): Atividades {
  const o = (v ?? {}) as Partial<Atividades>
  return {
    sprints_concluidos: numero(o.sprints_concluidos),
    modulos_ministrados: numero(o.modulos_ministrados),
    reunioes_realizadas: numero(o.reunioes_realizadas),
    cursos_ofertados: listaDeTexto(o.cursos_ofertados),
    eventos_divulgacao: numero(o.eventos_divulgacao),
  }
}

export function normalizarResultados(v: unknown): Resultados {
  const o = (v ?? {}) as Partial<Resultados>
  return {
    projetos_validacao_concluidos: numero(o.projetos_validacao_concluidos),
    publicacoes_submetidas: numero(o.publicacoes_submetidas),
    publicacoes_aceitas: numero(o.publicacoes_aceitas),
    competicoes_disputadas: numero(o.competicoes_disputadas),
    membros_completaram_academia: numero(o.membros_completaram_academia),
  }
}

export function normalizarImpacto(v: unknown): Impacto {
  const o = (v ?? {}) as Partial<Impacto>
  const funil = (o.funil_retencao ?? {}) as Partial<Impacto["funil_retencao"]>
  return {
    membros_estagio_ic_bolsa: numero(o.membros_estagio_ic_bolsa),
    projetos_viraram_tcc_pesquisa: numero(o.projetos_viraram_tcc_pesquisa),
    colocacoes_competicao: Array.isArray(o.colocacoes_competicao)
      ? o.colocacoes_competicao
          .filter((c): c is Colocacao => Boolean(c) && typeof c === "object")
          .map((c) => ({ edicao: String(c.edicao ?? ""), colocacao: String(c.colocacao ?? "") }))
          .filter((c) => c.edicao.trim() || c.colocacao.trim())
      : [],
    citacoes_publicacoes: numero(o.citacoes_publicacoes),
    funil_retencao: {
      bootcamp: numero(funil.bootcamp),
      academia: numero(funil.academia),
      frente: numero(funil.frente),
    },
    parcerias_apoio_real: numero(o.parcerias_apoio_real),
  }
}

/** Linha do banco → objeto com as quatro camadas garantidas. */
export function normalizarMetrica(linha: Record<string, unknown>): MetricaPeriodo {
  return {
    id: String(linha.id ?? ""),
    periodo: String(linha.periodo ?? ""),
    status: String(linha.status ?? "Em andamento"),
    frente: (linha.frente as string | null) ?? null,
    insumos: normalizarInsumos(linha.insumos),
    atividades: normalizarAtividades(linha.atividades),
    resultados: normalizarResultados(linha.resultados),
    impacto: normalizarImpacto(linha.impacto),
    atualizado_por: (linha.atualizado_por as string | null) ?? null,
    atualizado_em: String(linha.atualizado_em ?? ""),
    created_at: String(linha.created_at ?? ""),
  }
}

/* --- período -------------------------------------------------------------- */

/** "2026.2" — ano e semestre. É o formato que o CHECK do banco exige. */
export const PERIODO_VALIDO = /^\d{4}\.[12]$/

/** "2026.1" → "2026.2" · "2026.2" → "2027.1". */
export function proximoPeriodo(periodo: string): string {
  if (!PERIODO_VALIDO.test(periodo)) {
    // Sem período legível não dá para adivinhar o próximo; começa do atual.
    return periodoAtual()
  }
  const [ano, semestre] = periodo.split(".").map(Number)
  return semestre === 1 ? `${ano}.2` : `${ano + 1}.1`
}

/** Semestre corrente em Brasília: até junho é .1, depois .2. */
export function periodoAtual(hoje = hojeISO()): string {
  const [ano, mes] = hoje.split("-").map(Number)
  return `${ano}.${mes <= 6 ? 1 : 2}`
}

/* --- permissão ------------------------------------------------------------
 * Espelha a policy de 019, que por sua vez reaproveita a forma de 011:
 * diretoria escreve em tudo; quem tem cargo escreve na própria frente; o
 * registro geral (frente nula) é só da diretoria.
 *
 * Isto é conveniência de tela. A barreira é a RLS — e as duas precisam dizer
 * a mesma coisa, ou a interface promete o que o banco recusa.
 */
export function podeEditarMetrica(
  metrica: Pick<MetricaPeriodo, "frente" | "status">,
  perfil: { frente?: string | null; cargo?: string | null } | null,
  eDiretoria: boolean,
): boolean {
  // Período fechado é histórico: ninguém reescreve, nem a diretoria.
  if (metrica.status === "Fechado") return false
  if (eDiretoria) return true
  if (!perfil?.cargo?.trim()) return false
  if (!metrica.frente) return false
  return perfil.frente?.trim() === metrica.frente
}

/** Número em pt-BR sem casas decimais. */
export const inteiro = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n))

/** Reais, sem centavos — valores de patrimônio e patrocínio são estimativas. */
export const reais = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n)
