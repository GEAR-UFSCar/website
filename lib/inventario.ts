/**
 * Inventário: regras puras, sem React e sem Supabase.
 *
 * Mora fora dos componentes por três motivos: a tela de Patrimônio e o
 * formulário usam as mesmas listas; o teste (scripts/testar-inventario.mjs)
 * importa este arquivo direto no Node; e o gerador do SQL de importação
 * (scripts/gerar-sql-inventario.mjs) também. Nada aqui pode importar do
 * projeto por alias "@/".
 *
 * A PLANILHA E O SITE
 * O grupo começou com uma planilha (Inventario_GEAR). Desde a migração 029 a
 * fonte da verdade é a tabela `patrimonio`, e a planilha vira cópia: o site
 * exporta um CSV com as mesmas colunas, na mesma ordem, e este arquivo sabe
 * ler esse CSV de volta. A importação SÓ ACRESCENTA códigos que ainda não
 * existem e nunca sobrescreve — reimportar uma planilha velha por cima do que
 * foi editado no site apagaria localização e responsável sem avisar.
 */

// ---------------------------------------------------------------------------
// Listas fechadas. Espelham os CHECKs de supabase/029_inventario.sql; o teste
// compara os dois lados, então mudar uma sem a outra quebra o `npm run test`.
// ---------------------------------------------------------------------------

/** As nove categorias da aba "Listas" da planilha, mais "Outros" para o que não couber. */
export const CATEGORIAS = [
  "Componentes eletromecânicos",
  "Componentes eletrônicos",
  "Ferramentas",
  "Instrumentos de medição e teste",
  "Livro",
  "Materiais",
  "Módulos eletrônicos",
  "Placas de desenvolvimento",
  "Robôs e kits robóticos",
  "Outros",
] as const

/** Conservação do item. NÃO é o status: "Usado" diz como está, "Emprestado" diz onde está. */
export const ESTADOS = ["Novo", "Seminovo", "Usado", "Com defeito", "Em manutenção"] as const

/** Onde o item está agora. Espelha o CHECK de patrimonio.status (003). */
export const STATUS = ["Disponível", "Emprestado", "Em manutenção", "Danificado", "Baixado"] as const

export type Categoria = (typeof CATEGORIAS)[number]
export type Estado = (typeof ESTADOS)[number]
export type StatusItem = (typeof STATUS)[number]

/** Limites de tamanho. Espelham patrimonio_*_tam em 015 e 029. */
export const LIMITES = {
  item: 200,
  subcategoria: 120,
  fabricante: 120,
  modelo: 200,
  part_number: 120,
  descricao: 5000,
  datasheet_url: 2000,
  origem: 80,
  localizacao: 200,
  responsavel_atual: 150,
  observacoes: 5000,
} as const

/** Colunas lidas da tabela, na ordem em que o tipo as declara. */
export const COLUNAS_ITEM =
  "id, codigo, item, categoria, subcategoria, fabricante, modelo, part_number, descricao, datasheet_url, " +
  "quantidade, valor_estimado, estado, status, observacoes, origem, localizacao, responsavel_atual, frente_vinculada"

export type ItemInventario = {
  id: string
  codigo: string
  item: string
  categoria: string
  subcategoria: string | null
  fabricante: string | null
  modelo: string | null
  part_number: string | null
  descricao: string | null
  datasheet_url: string | null
  quantidade: number
  valor_estimado: number | null
  estado: string | null
  status: string
  observacoes: string | null
  origem: string | null
  localizacao: string | null
  responsavel_atual: string | null
  frente_vinculada: string | null
}

/** O que a importação grava: tudo menos o que o banco decide (id) e o que a planilha não tem (valor). */
export type ItemParaImportar = Omit<ItemInventario, "id" | "valor_estimado" | "frente_vinculada">

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Minúsculas e sem acento: "Módulo" casa com "modulo". */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

/**
 * Só devolve o endereço se for http(s). A tela desenha isto num <a href>, e um
 * `javascript:` ali executaria no clique. O banco já recusa (CHECK em 029); esta
 * checagem é a segunda trava, para quando o dado vier de outro lugar.
 */
export function urlSegura(valor: string | null | undefined): string | null {
  const texto = valor?.trim()
  if (!texto || /\s/.test(texto) || !/^https?:\/\//i.test(texto)) return null
  try {
    const url = new URL(texto)
    return url.protocol === "http:" || url.protocol === "https:" ? texto : null
  } catch {
    return null
  }
}

/** GEAR-002 antes de GEAR-010, e GEAR-999 antes de GEAR-1000 (texto puro erraria os dois). */
export function compararCodigo(a: string, b: string): number {
  const na = Number(/(\d+)$/.exec(a)?.[1] ?? NaN)
  const nb = Number(/(\d+)$/.exec(b)?.[1] ?? NaN)
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
  return a.localeCompare(b)
}

// ---------------------------------------------------------------------------
// Busca e totais
// ---------------------------------------------------------------------------

/** Valor do filtro de estado que casa com os itens ainda sem estado preenchido. */
export const SEM_ESTADO = "__sem_estado__"

export type Filtros = {
  /** Busca livre. Cada palavra precisa aparecer em algum campo (E, não OU). */
  q: string
  categoria: string
  estado: string
  status: string
}

export const SEM_FILTROS: Filtros = { q: "", categoria: "", estado: "", status: "" }

/** Tudo que a busca livre enxerga num item, já sem acento e em minúsculas. */
function palheiro(i: ItemInventario): string {
  return semAcento(
    [
      i.codigo, i.item, i.categoria, i.subcategoria, i.fabricante, i.modelo, i.part_number,
      i.descricao, i.origem, i.localizacao, i.responsavel_atual, i.observacoes, i.frente_vinculada,
    ]
      .filter(Boolean)
      .join(" \n "),
  )
}

export function filtrarItens(itens: ItemInventario[], f: Filtros): ItemInventario[] {
  const palavras = semAcento(f.q).split(/\s+/).filter(Boolean)
  return itens.filter((i) => {
    if (f.categoria && i.categoria !== f.categoria) return false
    if (f.estado === SEM_ESTADO) {
      if (i.estado) return false
    } else if (f.estado && i.estado !== f.estado) return false
    if (f.status && i.status !== f.status) return false
    if (palavras.length === 0) return true
    const texto = palheiro(i)
    return palavras.every((p) => texto.includes(p))
  })
}

export type Resumo = {
  itens: number
  unidades: number
  semEstado: number
  porCategoria: { categoria: string; itens: number; unidades: number }[]
}

/**
 * Totais do que foi passado — a tela chama com a lista inteira, e o teste
 * confere com a aba "Resumo" da planilha (66 itens, 7.260 unidades).
 * Categorias na ordem de CATEGORIAS; as que não têm item ficam de fora.
 */
export function resumir(itens: Pick<ItemInventario, "categoria" | "quantidade" | "estado">[]): Resumo {
  const mapa = new Map<string, { itens: number; unidades: number }>()
  for (const i of itens) {
    const atual = mapa.get(i.categoria) ?? { itens: 0, unidades: 0 }
    atual.itens += 1
    atual.unidades += i.quantidade
    mapa.set(i.categoria, atual)
  }
  const ordem = (c: string) => {
    const n = (CATEGORIAS as readonly string[]).indexOf(c)
    return n === -1 ? CATEGORIAS.length : n
  }
  return {
    itens: itens.length,
    unidades: itens.reduce((s, i) => s + i.quantidade, 0),
    semEstado: itens.filter((i) => !i.estado).length,
    porCategoria: [...mapa.entries()]
      .map(([categoria, v]) => ({ categoria, ...v }))
      .sort((a, b) => ordem(a.categoria) - ordem(b.categoria) || a.categoria.localeCompare(b.categoria)),
  }
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180, o que o Google Planilhas e o Excel exportam e leem)
// ---------------------------------------------------------------------------

/**
 * Lê CSV em linhas de células. Aspas duplas protegem vírgula e quebra de linha
 * dentro da célula; "" dentro de aspas é uma aspa. Aceita BOM, CRLF, LF e CR.
 * Linhas totalmente em branco são descartadas.
 */
export function lerCsv(texto: string): string[][] {
  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto
  const linhas: string[][] = []
  let linha: string[] = []
  let celula = ""
  let entreAspas = false

  const fechaCelula = () => {
    linha.push(celula)
    celula = ""
  }
  const fechaLinha = () => {
    fechaCelula()
    if (linha.some((c) => c.trim() !== "")) linhas.push(linha)
    linha = []
  }

  for (let n = 0; n < t.length; n++) {
    const c = t[n]
    if (entreAspas) {
      if (c === '"') {
        if (t[n + 1] === '"') {
          celula += '"'
          n++
        } else entreAspas = false
      } else celula += c
    } else if (c === '"' && celula === "") {
      entreAspas = true
    } else if (c === ",") {
      fechaCelula()
    } else if (c === "\r") {
      if (t[n + 1] === "\n") n++
      fechaLinha()
    } else if (c === "\n") {
      fechaLinha()
    } else celula += c
  }
  if (celula !== "" || linha.length > 0) fechaLinha()
  return linhas
}

/**
 * Impede que uma célula vire fórmula quando o CSV for aberto no Excel ou no
 * Planilhas: texto que começa com = + - @ (ou tab/CR) ganha uma aspa simples na
 * frente. Um nome de item ou uma observação digitada no site é conteúdo de
 * usuário, e "=HYPERLINK(...)" ali viraria um ataque no computador de quem
 * abre a exportação.
 */
export function celulaSegura(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
}

function celulaCsv(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

/** Cabeçalhos na ordem da planilha original, mais Status e Frente, que ela não tinha. */
export const CABECALHO_CSV = [
  "ID", "Nome", "Categoria", "Subcategoria", "Fabricante", "Modelo", "Part-number", "Descrição",
  "Datasheet", "Quantidade", "Estado", "Observações", "Origem", "Localização", "Responsável",
  "Status", "Frente",
] as const

/** CSV com BOM (o Excel só reconhece UTF-8 com ele) e quebras CRLF. */
export function itensParaCsv(itens: ItemInventario[]): string {
  const texto = (v: string | null | undefined) => celulaCsv(celulaSegura(v ?? ""))
  const linhas = [CABECALHO_CSV.join(",")]
  for (const i of [...itens].sort((a, b) => compararCodigo(a.codigo, b.codigo))) {
    linhas.push(
      [
        texto(i.codigo), texto(i.item), texto(i.categoria), texto(i.subcategoria), texto(i.fabricante),
        texto(i.modelo), texto(i.part_number), texto(i.descricao), texto(i.datasheet_url),
        String(i.quantidade), texto(i.estado), texto(i.observacoes), texto(i.origem),
        texto(i.localizacao), texto(i.responsavel_atual), texto(i.status), texto(i.frente_vinculada),
      ].join(","),
    )
  }
  return `﻿${linhas.join("\r\n")}\r\n`
}

// ---------------------------------------------------------------------------
// Importação da planilha
// ---------------------------------------------------------------------------

/** "Part-number" → "part_number", "Descrição" → "descricao": cabeçalho comparável. */
function chave(cabecalho: string): string {
  return semAcento(cabecalho).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

export type ResultadoImportacao = {
  itens: ItemParaImportar[]
  /** Coisas que não impedem a importação mas merecem olhar (ex.: link de datasheet perdido). */
  avisos: string[]
  /** Linhas recusadas. Se houver qualquer uma, nada deve ser importado. */
  erros: string[]
}

/** Lê o CSV da aba "Inventário" e devolve itens prontos, avisos e erros por linha. */
export function lerPlanilha(csv: string): ResultadoImportacao {
  const itens: ItemParaImportar[] = []
  const avisos: string[] = []
  const erros: string[] = []

  const linhas = lerCsv(csv)
  const iCab = linhas.findIndex((l) => {
    const chaves = l.map(chave)
    return chaves.includes("id") && chaves.includes("nome")
  })
  if (iCab === -1) {
    return { itens, avisos, erros: ['Não achei a linha de cabeçalho (precisa ter as colunas "ID" e "Nome").'] }
  }
  const cabecalho = linhas[iCab].map(chave)

  const codigos = new Set<string>()
  linhas.slice(iCab + 1).forEach((cels, n) => {
    const onde = `item nº ${n + 1} depois do cabeçalho`
    // Desfaz a aspa que itensParaCsv põe na frente de "=…", "-…" etc., para que
    // exportar e importar de volta não vá acumulando aspas.
    const valor = (campo: string) => (cels[cabecalho.indexOf(campo)] ?? "").trim().replace(/^'(?=[=+\-@\t\r])/, "")
    const ou = (campo: string) => valor(campo) || null
    const problemas: string[] = []

    const codigo = valor("id").toUpperCase()
    if (!/^GEAR-\d{3,6}$/.test(codigo)) problemas.push(`ID "${valor("id")}" fora do formato GEAR-001`)
    else if (codigos.has(codigo)) problemas.push(`ID ${codigo} repetido`)
    codigos.add(codigo)

    const item = valor("nome")
    if (!item) problemas.push("sem nome")

    const categoria = valor("categoria")
    if (!(CATEGORIAS as readonly string[]).includes(categoria)) problemas.push(`categoria "${categoria}" não existe na lista`)

    const quantidade = /^\d+$/.test(valor("quantidade")) ? Number(valor("quantidade")) : NaN
    if (!Number.isSafeInteger(quantidade)) problemas.push(`quantidade "${valor("quantidade")}" não é um número inteiro`)

    const estado = ou("estado")
    if (estado && !(ESTADOS as readonly string[]).includes(estado)) problemas.push(`estado "${estado}" não existe na lista`)

    let datasheet = ou("datasheet")
    if (datasheet && !urlSegura(datasheet)) {
      // A planilha mostra "Abrir" e guarda o endereço no hiperlink da célula, que o CSV não leva.
      avisos.push(`${codigo || onde}: o datasheet ("${datasheet}") não é um endereço http(s) — o link não veio no CSV`)
      datasheet = null
    }

    const texto = {
      subcategoria: ou("subcategoria"), fabricante: ou("fabricante"), modelo: ou("modelo"),
      part_number: ou("part_number"), descricao: ou("descricao"), observacoes: ou("observacoes"),
      origem: ou("origem"), localizacao: ou("localizacao"), responsavel_atual: ou("responsavel"),
    }
    for (const [campo, v] of Object.entries(texto)) {
      const limite = LIMITES[campo as keyof typeof LIMITES]
      if (v && limite && v.length > limite) problemas.push(`${campo} passa de ${limite} caracteres`)
    }
    if (item.length > LIMITES.item) problemas.push(`nome passa de ${LIMITES.item} caracteres`)

    if (problemas.length > 0) {
      erros.push(`${codigo || onde}: ${problemas.join("; ")}`)
      return
    }
    itens.push({
      codigo, item, categoria, quantidade, estado, datasheet_url: datasheet, status: "Disponível", ...texto,
    })
  })

  if (itens.length === 0 && erros.length === 0) erros.push("O arquivo não tem nenhuma linha de item.")
  return { itens, avisos, erros }
}

/** Literal SQL de texto: aspas simples dobradas. Sem NUL, que o Postgres não aceita em texto. */
function sqlTexto(v: string | null): string {
  return v === null ? "null" : `'${v.replace(/\u0000/g, "").replace(/'/g, "''")}'`
}

/**
 * UM comando INSERT (atômico: entra tudo ou nada) com `on conflict (codigo) do
 * nothing`. Reaplicar não duplica nem sobrescreve — o que foi editado no site
 * depois da primeira importação fica como está.
 */
export function sqlDeImportacao(itens: ItemParaImportar[]): string {
  const colunas = [
    "codigo", "item", "categoria", "subcategoria", "fabricante", "modelo", "part_number", "descricao",
    "datasheet_url", "quantidade", "estado", "status", "observacoes", "origem", "localizacao", "responsavel_atual",
  ] as const
  const linhas = itens.map(
    (i) => `  (${colunas.map((c) => (c === "quantidade" ? String(i[c]) : sqlTexto(i[c]))).join(", ")})`,
  )
  return (
    `insert into public.patrimonio (${colunas.join(", ")}) values\n` +
    `${linhas.join(",\n")}\n` +
    `on conflict (codigo) do nothing;\n`
  )
}
