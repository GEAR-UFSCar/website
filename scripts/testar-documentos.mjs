/**
 * Teste das regras puras do catálogo de documentos (lib/documentos-catalogo.ts)
 * e da consistência do JSON de origem com o SQL gerado. Sem rede e sem banco.
 *
 *   npm run test:documentos
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  ATALHOS,
  categoriaDoCatalogo,
  eListadoNoPublico,
  eVisivelAoPublico,
  filtrar,
  normalizar,
  rotuloPublico,
} from "../lib/documentos-catalogo.ts"

// --- publicação: a regra que decide o que um visitante recebe -----------------
assert.equal(eVisivelAoPublico({ publico: true, status: "vigente" }), true)
// rascunho marcado como público NÃO entrega arquivo
assert.equal(eVisivelAoPublico({ publico: true, status: "rascunho" }), false)
assert.equal(eVisivelAoPublico({ publico: true, status: "em_aprovacao" }), false)
assert.equal(eVisivelAoPublico({ publico: true, status: "arquivado" }), false)
// vigente mas interno nunca é público
assert.equal(eVisivelAoPublico({ publico: false, status: "vigente" }), false)
assert.equal(eVisivelAoPublico({ publico: null, status: "vigente" }), false)
assert.equal(eVisivelAoPublico({}), false)

// listado: aparece na vitrine, com rótulo, sem arquivo enquanto não for vigente
assert.equal(eListadoNoPublico({ publico: true, status: "rascunho" }), true)
assert.equal(eListadoNoPublico({ publico: true, status: "em_aprovacao" }), true)
assert.equal(eListadoNoPublico({ publico: true, status: "vigente" }), true)
assert.equal(eListadoNoPublico({ publico: true, status: "arquivado" }), false)
assert.equal(eListadoNoPublico({ publico: false, status: "vigente" }), false)
assert.equal(eListadoNoPublico({ publico: true }), false)

// aberto implica listado, nunca o contrário
for (const publico of [true, false, null])
  for (const status of ["rascunho", "em_aprovacao", "vigente", "arquivado", undefined]) {
    const d = { publico, status }
    if (eVisivelAoPublico(d)) assert.ok(eListadoNoPublico(d), JSON.stringify(d))
  }

assert.equal(rotuloPublico("vigente"), "Vigente")
assert.equal(rotuloPublico("rascunho"), "Em aprovação")
assert.equal(rotuloPublico(null), "Em aprovação")

// --- busca ---------------------------------------------------------------------
const doc = (o) => ({
  titulo: "", resumo: null, quando: null, codigo: null, tags: [], pacote: 1, status: "rascunho", ...o,
})
const lista = [
  doc({ codigo: "08", titulo: "Protocolo de Voo", resumo: "Checagens para aeronaves", tags: ["seguranca"], pacote: 2 }),
  doc({ codigo: "06", titulo: "Termo de Empréstimo", quando: "Quando alguém levar um item", tags: ["patrimonio"], pacote: 2 }),
  doc({ codigo: "RI", titulo: "Regimento Interno", tags: ["governanca"], pacote: 0 }),
  doc({ codigo: "99", titulo: "Antigo", status: "arquivado", pacote: 0 }),
]
const titulos = (f) => filtrar(lista, f).map((d) => d.titulo)

assert.equal(normalizar("  Empréstimo "), "emprestimo")
assert.deepEqual(titulos({ busca: "emprestimo" }), ["Termo de Empréstimo"]) // sem acento
assert.deepEqual(titulos({ busca: "EMPRÉSTIMO" }), ["Termo de Empréstimo"]) // maiúsculas
assert.deepEqual(titulos({ busca: "aeronaves voo" }), ["Protocolo de Voo"]) // todos os termos
assert.deepEqual(titulos({ busca: "voo regimento" }), []) // E, não OU
assert.deepEqual(titulos({ busca: "08" }), ["Protocolo de Voo"]) // por código
assert.deepEqual(titulos({ busca: "levar item" }), ["Termo de Empréstimo"]) // em "quando usar"
assert.deepEqual(titulos({ tag: "patrimonio" }), ["Termo de Empréstimo"])
assert.deepEqual(titulos({ pacote: 2 }), ["Protocolo de Voo", "Termo de Empréstimo"])
assert.deepEqual(titulos({ pacote: 0 }), ["Regimento Interno"]) // pacote 0 é válido, não "sem filtro"
// arquivado só com pedido explícito
assert.ok(!titulos({}).includes("Antigo"))
assert.ok(titulos({ arquivados: true }).includes("Antigo"))
// tags nulas não quebram
assert.doesNotThrow(() => filtrar([doc({ tags: null, titulo: "x" })], { busca: "x", tag: "y" }))

// todo atalho aponta para uma tag que existe no catálogo
const catalogo = JSON.parse(readFileSync(new URL("../supabase/seed/documentos.json", import.meta.url), "utf8"))
const tagsDoCatalogo = new Set(catalogo.documentos.flatMap((d) => d.tags))
for (const a of ATALHOS) assert.ok(tagsDoCatalogo.has(a.tag), `atalho "${a.rotulo}" usa tag inexistente: ${a.tag}`)

// --- catálogo de origem --------------------------------------------------------
const CATEGORIAS = ["Governança", "Técnico", "Marca", "Financeiro", "Segurança"]
const ids = catalogo.documentos.map((d) => d.id)
const titulosCat = catalogo.documentos.map((d) => d.titulo)
assert.equal(new Set(ids).size, ids.length, "códigos duplicados")
assert.equal(new Set(titulosCat).size, titulosCat.length, "títulos duplicados (titulo é UNIQUE)")
for (const d of catalogo.documentos) {
  assert.ok(CATEGORIAS.includes(categoriaDoCatalogo(d)), `categoria fora do CHECK: ${d.id}`)
  assert.ok(d.titulo.length <= 200, `título longo: ${d.id}`)
  assert.ok((d.resumo ?? "").length <= 600, `resumo > 600: ${d.id}`)
  assert.ok((d.quando ?? "").length <= 400, `quando > 400: ${d.id}`)
  assert.ok((d.quem ?? "").length <= 200, `quem > 200: ${d.id}`)
  assert.equal(d.status, "rascunho", `${d.id} deve entrar como rascunho`)
  assert.ok(!("pdf" in d), `${d.id}: caminho de PDF não pertence ao repositório`)
}

// O SQL commitado precisa ser o que o gerador produziria agora.
const sql = readFileSync(new URL("../supabase/026_catalogo_inicial.sql", import.meta.url), "utf8")
assert.equal((sql.match(/^  \('/gm) ?? []).length, catalogo.documentos.length, "026 desatualizado: rode npm run catalogo:sql")
for (const d of catalogo.documentos)
  assert.ok(sql.includes(`('${d.id}', '${d.titulo.replace(/'/g, "''")}'`), `026 sem ${d.id}`)
// nada de status/publico/arquivo_url no UPDATE de reaplicação
const bloco = sql.slice(sql.indexOf("do update set"), sql.indexOf("-- Os cinco"))
for (const proibido of ["arquivo_url", "versao", "publico", "status"])
  assert.ok(!new RegExp(`\\b${proibido}\\b\\s*=`).test(bloco), `reaplicação sobrescreve ${proibido}`)

console.log("documentos: ok")
