/**
 * Documentação institucional: o que a página e os formulários precisam
 * concordar.
 *
 * Até aqui a tabela `documentos` e o bucket existiam desde a migração 006 —
 * com policies de escrita para quem tem cargo — e nenhuma tela usava isso.
 * Anexar o Regimento exigia subir o arquivo à mão no painel do Supabase e
 * rodar um UPDATE colando o caminho. Este módulo é a base da interface que
 * fecha essa lacuna.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

/** Espelha o CHECK de supabase/006_documentos.sql. */
export const CATEGORIAS = ["Governança", "Técnico", "Marca", "Financeiro", "Segurança"] as const
export type Categoria = (typeof CATEGORIAS)[number]

/** Bucket privado: o link só existe assinado, e por uma hora. */
export const BUCKET = "documentos"
export const VALIDADE_LINK = 60 * 60

export type Documento = {
  id: string
  titulo: string
  categoria: string
  arquivo_url: string | null
  versao: string | null
  atualizado_em: string
}

export const COLUNAS_DOCUMENTO = "id, titulo, categoria, arquivo_url, versao, atualizado_em"

/** arquivo_url aceita caminho no bucket OU url externa; isto separa os dois. */
export const eExterno = (valor: string) => /^https?:\/\//i.test(valor)

/*
 * Teto de 20 MB. O limite do Supabase é maior, mas documento institucional
 * que passa disso é quase sempre digitalização mal exportada — e o membro que
 * espera dois minutos por um PDF na rede da universidade não volta.
 */
export const TAMANHO_MAXIMO = 20 * 1024 * 1024

/*
 * Lista curta de propósito. PDF é o formato do que está no seed (regimento,
 * manuais); imagem entra por causa da categoria Marca; as duas planilhas e o
 * texto cobrem o financeiro. Qualquer outra coisa é sinal de que o arquivo
 * errado foi selecionado.
 */
export const TIPOS_ACEITOS = [".pdf", ".png", ".jpg", ".jpeg", ".svg", ".odt", ".ods", ".docx", ".xlsx"]

/**
 * Extensão em minúsculas, sem ponto — e vazia quando não há extensão.
 * `split(".").pop()` sozinho devolve o nome INTEIRO num arquivo sem ponto, e
 * "Ata" + "arquivo" virava o caminho "ata.arquivo".
 */
function extensaoDe(nome: string) {
  const ponto = nome.lastIndexOf(".")
  if (ponto <= 0 || ponto === nome.length - 1) return ""
  return nome.slice(ponto + 1).toLowerCase()
}

/**
 * Nome do objeto no bucket, derivado do título. `titulo` é UNIQUE na tabela,
 * então dois documentos não colidem — e substituir o arquivo de um documento
 * reaproveita o mesmo caminho, em vez de deixar órfão no bucket a cada troca.
 *
 * Renomear o documento depois muda o caminho e deixa o objeto antigo para
 * trás. É o custo aceito: limpar o bucket exige policy de DELETE, que a 006
 * deliberadamente não criou.
 */
export function caminhoNoBucket(titulo: string, nomeDoArquivo: string) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  const ext = extensaoDe(nomeDoArquivo)
  return ext ? `${base || "documento"}.${ext}` : base || "documento"
}

/** Frase de recusa, ou null quando o arquivo serve. */
export function validarArquivo(arquivo: File): string | null {
  if (arquivo.size === 0) return "O arquivo selecionado está vazio."
  if (arquivo.size > TAMANHO_MAXIMO) {
    return `O arquivo tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB e o limite é 20 MB.`
  }
  const ext = `.${extensaoDe(arquivo.name)}`
  if (!TIPOS_ACEITOS.includes(ext)) {
    return `Formato ${ext || "desconhecido"} não aceito. Use ${TIPOS_ACEITOS.join(", ")}.`
  }
  return null
}

/**
 * Sobe o arquivo e devolve o caminho a gravar em `arquivo_url`.
 *
 * `upsert: true` porque substituir é o caso comum — versão nova do mesmo
 * documento. A policy de UPDATE em storage.objects (006) cobre isso; sem o
 * upsert, o segundo envio falharia com "already exists" e a pessoa não teria
 * como trocar o arquivo pela interface.
 */
export async function enviarArquivo(
  supabase: SupabaseClient,
  arquivo: File,
  titulo: string,
): Promise<{ caminho: string | null; erro: { message: string; code?: string } | null }> {
  const caminho = caminhoNoBucket(titulo, arquivo.name)

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    upsert: true,
    contentType: arquivo.type || undefined,
  })

  if (error) return { caminho: null, erro: error }
  return { caminho, erro: null }
}
