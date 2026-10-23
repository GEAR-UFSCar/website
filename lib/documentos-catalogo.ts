/**
 * Catálogo de documentos: regras puras, sem React e sem Supabase.
 *
 * Fica separado de lib/documentos.ts (upload e bucket) por dois motivos: o
 * teste em scripts/testar-documentos.mjs importa este arquivo direto no Node,
 * e o gerador do SQL do catálogo também. Nada aqui pode importar do projeto
 * por alias "@/".
 */

export type Status = "rascunho" | "em_aprovacao" | "vigente" | "arquivado"

export const ROTULO_STATUS: Record<Status, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  vigente: "Vigente",
  arquivado: "Arquivado",
}

/** Forma mínima do que a regra de publicação precisa saber. */
export type Publicavel = { publico?: boolean | null; status?: string | null }

/**
 * LISTADO na vitrine: marcado como público e não arquivado. Aparece com o
 * rótulo do status, mas sem arquivo se ainda não for vigente.
 * Espelha a cláusula `where` da view `documentos_publicos` (supabase/025).
 */
export function eListadoNoPublico(d: Publicavel): boolean {
  return d.publico === true && d.status != null && d.status !== "arquivado"
}

/**
 * ABERTO ao público: o visitante também recebe o arquivo. Exige público E
 * vigente — rascunho marcado como público NUNCA entrega arquivo. Espelha o
 * `case` da view e a função `documento_e_publico` (supabase/025).
 */
export function eVisivelAoPublico(d: Publicavel): boolean {
  return d.publico === true && d.status === "vigente"
}

/**
 * Rótulo honesto para a vitrine: o visitante nunca vê "Vigente" num texto que
 * ainda não foi aprovado, e nunca vê um link que não existe.
 */
export function rotuloPublico(status: string | null | undefined): string {
  return status === "vigente" ? "Vigente" : "Em aprovação"
}

/** Item do catálogo como vem do JSON de origem (supabase/seed/documentos.json). */
export type ItemDoCatalogo = { id: string; pacote: number; publico?: boolean }

/*
 * `categoria` na tabela é um CHECK de cinco valores (006) que o formulário de
 * cadastro também usa; o catálogo tem oito pacotes. Em vez de quebrar o
 * formulário, cada pacote cai na categoria mais próxima, com exceções por
 * documento. O agrupamento fino da biblioteca usa `pacote_nome`, não isto.
 */
const POR_PACOTE: Record<number, string> = {
  0: "Governança",
  1: "Governança",
  2: "Segurança",
  3: "Financeiro",
  4: "Governança",
  5: "Técnico",
  6: "Governança",
  7: "Governança",
}

const EXCECOES: Record<string, string> = {
  "07": "Segurança",
  "08": "Segurança",
  "09": "Segurança",
  "14": "Governança",
  "18": "Marca",
  "26": "Financeiro",
  "27": "Marca",
  "33": "Segurança",
  "39": "Financeiro",
  "44": "Marca",
}

export function categoriaDoCatalogo(d: ItemDoCatalogo): string {
  return EXCECOES[d.id] ?? POR_PACOTE[d.pacote] ?? "Governança"
}

/** Atalhos "Preciso de…" da biblioteca: cada um é uma busca por tag. */
export const ATALHOS: { rotulo: string; tag: string }[] = [
  { rotulo: "Voar com drone", tag: "seguranca" },
  { rotulo: "Emprestar equipamento", tag: "patrimonio" },
  { rotulo: "Fechar parceria", tag: "parcerias" },
  { rotulo: "Entrar na entidade", tag: "academia" },
  { rotulo: "Registrar reunião", tag: "governanca" },
  { rotulo: "Falar em nome do GEAR", tag: "comunicacao" },
]

export type Filtros = { busca?: string; pacote?: number | null; tag?: string | null; arquivados?: boolean }

type Pesquisavel = {
  titulo: string
  resumo: string | null
  quando: string | null
  codigo: string | null
  tags: string[] | null
  pacote: number | null
  status: string
}

/** Sem acento e em minúsculas: "Responsável" casa com "responsavel". */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/** Filtra a lista da biblioteca. Arquivados só entram quando pedidos. */
export function filtrar<T extends Pesquisavel>(docs: T[], f: Filtros): T[] {
  const termos = normalizar(f.busca ?? "").split(/\s+/).filter(Boolean)
  return docs.filter((d) => {
    if (d.status === "arquivado" && !f.arquivados) return false
    if (f.pacote != null && d.pacote !== f.pacote) return false
    if (f.tag && !(d.tags ?? []).includes(f.tag)) return false
    if (termos.length === 0) return true
    const palheiro = normalizar(
      [d.titulo, d.resumo, d.quando, d.codigo, ...(d.tags ?? [])].filter(Boolean).join(" "),
    )
    return termos.every((t) => palheiro.includes(t))
  })
}
