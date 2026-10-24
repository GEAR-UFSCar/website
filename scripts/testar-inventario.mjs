/**
 * Teste das regras puras do inventário (lib/inventario.ts): CSV, importação da
 * planilha, exportação, busca e totais. Sem rede e sem banco — o que precisa do
 * Postgres (a importação gravando de verdade) está em `npm run test:banco`.
 *
 *   npm run test:inventario
 *
 * Também confere que as listas fechadas do TypeScript são as mesmas dos CHECKs
 * de supabase/003, 015 e 029: lista nova de um lado só é o tipo de erro que
 * passa despercebido até alguém tentar gravar.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  CABECALHO_CSV, CATEGORIAS, ESTADOS, LIMITES, SEM_ESTADO, SEM_FILTROS, STATUS,
  celulaSegura, compararCodigo, filtrarItens, itensParaCsv, lerCsv, lerPlanilha, resumir,
  semAcento, sqlDeImportacao, urlSegura,
} from "../lib/inventario.ts"

let n = 0
const ok = (nome, fn) => {
  fn()
  n++
  console.log(`  \x1b[32m✓\x1b[0m ${nome}`)
}
const secao = (t) => console.log(`\n${t}`)

const sql = (f) => readFileSync(new URL(`../supabase/${f}`, import.meta.url), "utf8")
const aspas = (bloco) => [...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1])

// ---------------------------------------------------------------------------
secao("1. LISTAS — o TypeScript e o banco falam a mesma língua")

const s003 = sql("003_administracao.sql")
const s015 = sql("015_limites_de_texto.sql")
const s029 = sql("029_inventario.sql")

ok("categorias = CHECK de patrimonio_categoria_check (029)", () => {
  const bloco = /patrimonio_categoria_check\s+check \(categoria in \(([^)]*)\)\)/.exec(s029)?.[1]
  assert.ok(bloco, "não achei o CHECK de categoria na 029")
  assert.deepEqual(aspas(bloco), [...CATEGORIAS])
})
ok("estados = CHECK de patrimonio_estado_check (029)", () => {
  const bloco = /patrimonio_estado_check\s+check \(estado is null or estado in \(([^)]*)\)\)/.exec(s029)?.[1]
  assert.ok(bloco, "não achei o CHECK de estado na 029")
  assert.deepEqual(aspas(bloco), [...ESTADOS])
})
ok("status = CHECK de patrimonio.status (003)", () => {
  const bloco = /status\s+text not null check \(status in \(([^)]*)\)\)/.exec(s003)?.[1]
  assert.ok(bloco, "não achei o CHECK de status na 003")
  assert.deepEqual(aspas(bloco), [...STATUS])
})
ok("a mesma lista de categorias na tradução da 029 (as antigas viram estas)", () => {
  const destinos = [...s029.matchAll(/then '([^']+)'/g)].map((m) => m[1])
  for (const d of destinos) assert.ok(CATEGORIAS.includes(d), `a 029 traduz para "${d}", que não está em CATEGORIAS`)
})
ok("limites de tamanho = os do banco", () => {
  const noBanco = {}
  for (const m of s029.matchAll(/length\((\w+)\)\s*<=\s*(\d+)/g)) noBanco[m[1]] = Number(m[2])
  noBanco.item = Number(/patrimonio_item_tam\s+check \(length\(item\) <= (\d+)\)/.exec(s015)?.[1])
  noBanco.observacoes = Number(
    /patrimonio_obs_tam\s+check \(observacoes is null or length\(observacoes\) <= (\d+)\)/.exec(s015)?.[1],
  )
  assert.deepEqual(noBanco, { ...LIMITES }, "LIMITES e os CHECKs de comprimento divergiram")
})

// ---------------------------------------------------------------------------
secao("2. CSV — o que o Planilhas e o Excel exportam")

ok("vírgula, aspas e quebra de linha dentro de aspas", () => {
  assert.deepEqual(lerCsv('a,"b,c","d ""e"" f","g\nh"\n'), [["a", "b,c", 'd "e" f', "g\nh"]])
})
ok("CRLF, LF e CR separam linhas; BOM é ignorado; linha em branco some", () => {
  assert.deepEqual(lerCsv("﻿a,b\r\nc,d\n\ne,f\rg,h"), [["a", "b"], ["c", "d"], ["e", "f"], ["g", "h"]])
})
ok("célula vazia no meio e no fim é preservada", () => {
  assert.deepEqual(lerCsv("a,,c,\n"), [["a", "", "c", ""]])
})
ok("sem quebra de linha no fim do arquivo", () => {
  assert.deepEqual(lerCsv("a,b"), [["a", "b"]])
  assert.deepEqual(lerCsv(""), [])
})
ok("aspa no meio de um texto sem aspas é só uma aspa", () => {
  assert.deepEqual(lerCsv('5" polegadas,x'), [['5" polegadas', "x"]])
})

// ---------------------------------------------------------------------------
secao("3. IMPORTAÇÃO — a planilha do grupo")

const CAB = "ID,Nome,Categoria,Subcategoria,Fabricante,Modelo,Part-number,Descrição,Datasheet,Quantidade,Estado,Observações,Origem,Localização,Responsável"
const planilha = (...linhas) => [CAB, ...linhas].join("\n")

ok("linha completa vira item, com status Disponível", () => {
  const r = lerPlanilha(
    planilha('gear-007,"Motor, 24 V",Componentes eletromecânicos,Motor DC,Acme,M-1,PN-9,"Motor ""forte""",https://exemplo.org/m.pdf,3,Usado,obs,Fulano,Armário 2,Ana'),
  )
  assert.deepEqual(r.erros, [])
  assert.deepEqual(r.itens[0], {
    codigo: "GEAR-007", item: "Motor, 24 V", categoria: "Componentes eletromecânicos", quantidade: 3,
    estado: "Usado", datasheet_url: "https://exemplo.org/m.pdf", status: "Disponível",
    subcategoria: "Motor DC", fabricante: "Acme", modelo: "M-1", part_number: "PN-9",
    descricao: 'Motor "forte"', observacoes: "obs", origem: "Fulano", localizacao: "Armário 2",
    responsavel_atual: "Ana",
  })
})
ok("linha CURTA (a planilha omite as colunas vazias do fim) funciona", () => {
  const r = lerPlanilha(planilha("GEAR-001,Kit,Robôs e kits robóticos,Carro robô,LAFVIN,Mod,,Descrição,,1,,,GEAR"))
  assert.deepEqual(r.erros, [])
  assert.equal(r.itens[0].estado, null)
  assert.equal(r.itens[0].localizacao, null)
  assert.equal(r.itens[0].origem, "GEAR")
})
ok("cabeçalho em outra ordem, com maiúsculas e acentos diferentes", () => {
  const r = lerPlanilha("quantidade,NOME,categoria,id,Descricao\n2,Livro X,Livro,GEAR-010,Sobre X")
  assert.deepEqual(r.erros, [])
  assert.equal(r.itens[0].descricao, "Sobre X")
  assert.equal(r.itens[0].quantidade, 2)
})
ok("colunas desconhecidas (Status, Frente da exportação do site) são ignoradas", () => {
  const r = lerPlanilha(`${CAB},Status,Frente\nGEAR-001,Kit,Livro,,,,,,,1,,,,,,Emprestado,Pesquisa`)
  assert.deepEqual(r.erros, [])
  assert.equal(r.itens[0].status, "Disponível", "a importação nunca decide o status")
})

for (const [rotulo, linha, trecho] of [
  ["ID fora do formato", "G-1,Kit,Livro,,,,,,,1", "fora do formato"],
  ["sem nome", "GEAR-001,,Livro,,,,,,,1", "sem nome"],
  ["categoria que não existe", "GEAR-001,Kit,Eletrônica,,,,,,,1", "categoria"],
  ["quantidade negativa", "GEAR-001,Kit,Livro,,,,,,,-1", "quantidade"],
  ["quantidade decimal", "GEAR-001,Kit,Livro,,,,,,,1.5", "quantidade"],
  ["quantidade em branco", "GEAR-001,Kit,Livro,,,,,,,", "quantidade"],
  ["quantidade em texto", "GEAR-001,Kit,Livro,,,,,,,dez", "quantidade"],
  ["estado que não existe", "GEAR-001,Kit,Livro,,,,,,,1,Quebrado", "estado"],
  ["campo acima do limite", `GEAR-001,Kit,Livro,,,${"x".repeat(201)},,,,1`, "passa de"],
]) {
  ok(`recusa: ${rotulo}`, () => {
    const r = lerPlanilha(planilha(linha))
    assert.equal(r.itens.length, 0)
    assert.equal(r.erros.length, 1, JSON.stringify(r.erros))
    assert.ok(r.erros[0].includes(trecho), r.erros[0])
  })
}
ok("recusa ID repetido e aponta qual", () => {
  const r = lerPlanilha(planilha("GEAR-001,A,Livro,,,,,,,1", "GEAR-001,B,Livro,,,,,,,1"))
  assert.ok(r.erros.some((e) => e.includes("repetido")), JSON.stringify(r.erros))
})
ok("uma linha ruim não impede de ver as outras: erros por linha", () => {
  const r = lerPlanilha(planilha("GEAR-001,A,Livro,,,,,,,1", "GEAR-002,,Livro,,,,,,,1", "GEAR-003,C,Livro,,,,,,,x"))
  assert.equal(r.itens.length, 1)
  assert.equal(r.erros.length, 2)
})
ok('datasheet "Abrir" (link perdido no CSV) vira aviso, não erro, e não é gravado', () => {
  const r = lerPlanilha(planilha("GEAR-006,Motor,Componentes eletromecânicos,,,,,,Abrir,10,Usado"))
  assert.deepEqual(r.erros, [])
  assert.equal(r.itens[0].datasheet_url, null)
  assert.equal(r.avisos.length, 1)
  assert.ok(r.avisos[0].includes("GEAR-006"))
})
ok("datasheet javascript: nunca chega ao item", () => {
  const r = lerPlanilha(planilha("GEAR-006,Motor,Componentes eletromecânicos,,,,,,javascript:alert(1),10,Usado"))
  assert.equal(r.itens[0].datasheet_url, null)
  assert.equal(r.avisos.length, 1)
})
ok("sem cabeçalho ou arquivo vazio: erro claro", () => {
  assert.equal(lerPlanilha("a,b\n1,2").erros.length, 1)
  assert.equal(lerPlanilha("").erros.length, 1)
  assert.equal(lerPlanilha(CAB).erros.length, 1)
})

// ---------------------------------------------------------------------------
secao("4. EXPORTAÇÃO — e a volta")

const item = (extra = {}) => ({
  id: "i", codigo: "GEAR-001", item: "Item", categoria: "Livro", subcategoria: null, fabricante: null, modelo: null,
  part_number: null, descricao: null, datasheet_url: null, quantidade: 1, valor_estimado: null, estado: null,
  status: "Disponível", observacoes: null, origem: null, localizacao: null, responsavel_atual: null,
  frente_vinculada: null, ...extra,
})

ok("o cabeçalho da exportação começa pelas 15 colunas da planilha, na ordem dela", () => {
  assert.deepEqual(
    CABECALHO_CSV.slice(0, 15),
    CAB.split(","),
  )
})
ok("começa com BOM e usa CRLF", () => {
  const csv = itensParaCsv([item()])
  assert.ok(csv.startsWith("﻿ID,Nome,"))
  assert.ok(csv.includes("\r\n"))
})
ok("exporta em ordem numérica de código (999 antes de 1000)", () => {
  const csv = itensParaCsv([item({ codigo: "GEAR-1000" }), item({ codigo: "GEAR-010" }), item({ codigo: "GEAR-002" })])
  const ids = lerCsv(csv).slice(1).map((l) => l[0])
  assert.deepEqual(ids, ["GEAR-002", "GEAR-010", "GEAR-1000"])
})
ok("fórmula digitada no site não vira fórmula na planilha", () => {
  for (const perigo of ['=HYPERLINK("http://x","y")', "+1+1", "-2+3", "@SUM(A1)", "\tTAB"]) {
    assert.ok(celulaSegura(perigo).startsWith("'"), perigo)
  }
  assert.equal(celulaSegura("Motor DC"), "Motor DC")
  const linhas = lerCsv(itensParaCsv([item({ item: '=HYPERLINK("http://x","y")' })]))
  assert.ok(linhas[1][1].startsWith("'="), linhas[1][1])
})
ok("exportar e importar devolve os mesmos itens (com texto difícil)", () => {
  const originais = [
    item({
      codigo: "GEAR-001", item: 'Motor, "forte"\nem duas linhas', categoria: "Componentes eletromecânicos",
      subcategoria: "Motor DC", fabricante: "Açaí & Cia", modelo: "RF-300CA 11440", part_number: "ç€ü",
      descricao: "Tensão 3–6 V; ~150 mA; eixo de 2 mm", datasheet_url: "https://exemplo.org/a.pdf?x=1&y=2",
      quantidade: 10, estado: "Usado", observacoes: "Danificado na lombada", origem: "Fulano",
      localizacao: "Armário 2", responsavel_atual: "Ana",
    }),
    item({ codigo: "GEAR-002", item: "Livro simples", categoria: "Livro", quantidade: 0 }),
  ]
  const volta = lerPlanilha(itensParaCsv(originais))
  assert.deepEqual(volta.erros, [])
  assert.equal(volta.itens.length, 2)
  for (const [o, v] of originais.map((o, i) => [o, volta.itens[i]])) {
    for (const campo of Object.keys(v)) {
      if (campo === "status") continue
      assert.equal(v[campo], o[campo], `${o.codigo}.${campo}`)
    }
  }
})
ok("a volta desfaz a aspa de proteção (senão cada ida e volta a acumularia)", () => {
  const volta = lerPlanilha(itensParaCsv([item({ item: "=1+1", observacoes: "-5 V" })]))
  assert.equal(volta.itens[0].item, "=1+1")
  assert.equal(volta.itens[0].observacoes, "-5 V")
})

// ---------------------------------------------------------------------------
secao("5. BUSCA E TOTAIS")

const estoque = [
  item({ id: "1", codigo: "GEAR-001", item: "Motor de Passo 28BYJ-48", categoria: "Componentes eletromecânicos", fabricante: "Panasonic", quantidade: 2, estado: "Novo", localizacao: "Armário 1" }),
  item({ id: "2", codigo: "GEAR-002", item: "Módulo ESP32", categoria: "Módulos eletrônicos", descricao: "Wi-Fi e Bluetooth", quantidade: 3, estado: null }),
  item({ id: "3", codigo: "GEAR-003", item: "Kit de Resistores", categoria: "Componentes eletrônicos", quantidade: 1350, estado: "Novo", status: "Emprestado", responsavel_atual: "João" }),
  item({ id: "4", codigo: "GEAR-004", item: "Arduino Cookbook", categoria: "Livro", quantidade: 1, estado: "Usado" }),
]
const ids = (r) => r.map((x) => x.id).join()
const busca = (q, extra = {}) => ids(filtrarItens(estoque, { ...SEM_FILTROS, q, ...extra }))

ok("sem filtro devolve tudo", () => assert.equal(busca(""), "1,2,3,4"))
ok("busca sem acento e sem diferenciar maiúsculas", () => {
  assert.equal(busca("modulo"), "2")
  assert.equal(busca("MÓDULO esp32"), "2")
  assert.equal(busca("passo"), "1")
})
ok("várias palavras: todas precisam aparecer (E)", () => {
  assert.equal(busca("motor panasonic"), "1")
  assert.equal(busca("motor wifi"), "")
})
ok("a busca olha descrição, fabricante, localização e responsável", () => {
  assert.equal(busca("bluetooth"), "2")
  assert.equal(busca("panasonic"), "1")
  assert.equal(busca("armario"), "1")
  assert.equal(busca("joao"), "3")
})
ok("a busca acha o código", () => assert.equal(busca("gear-004"), "4"))
ok("filtros de categoria, estado e status combinam", () => {
  assert.equal(busca("", { categoria: "Livro" }), "4")
  assert.equal(busca("", { estado: "Novo" }), "1,3")
  assert.equal(busca("", { estado: "Novo", status: "Emprestado" }), "3")
  assert.equal(busca("resistores", { categoria: "Livro" }), "")
})
ok("filtro 'sem estado' acha só quem ainda não tem", () => assert.equal(busca("", { estado: SEM_ESTADO }), "2"))

ok("resumo: itens, unidades, sem estado e categorias na ordem da lista", () => {
  const r = resumir(estoque)
  assert.equal(r.itens, 4)
  assert.equal(r.unidades, 2 + 3 + 1350 + 1)
  assert.equal(r.semEstado, 1)
  assert.deepEqual(r.porCategoria.map((c) => c.categoria), [
    "Componentes eletromecânicos", "Componentes eletrônicos", "Livro", "Módulos eletrônicos",
  ])
  assert.equal(r.porCategoria[1].unidades, 1350)
})
ok("urlSegura: só http(s), sem espaço", () => {
  assert.equal(urlSegura("https://exemplo.org/a.pdf"), "https://exemplo.org/a.pdf")
  assert.equal(urlSegura("  http://exemplo.org  "), "http://exemplo.org")
  for (const ruim of ["javascript:alert(1)", "data:text/html,x", "ftp://x.org/a", "//x.org", "exemplo.org", "https://a b.org", "", null, undefined, "https:evil", "Abrir"]) {
    assert.equal(urlSegura(ruim), null, String(ruim))
  }
})
ok("compararCodigo e semAcento", () => {
  assert.ok(compararCodigo("GEAR-999", "GEAR-1000") < 0)
  assert.ok(compararCodigo("GEAR-010", "GEAR-002") > 0)
  assert.equal(semAcento("Ação Ç Ü"), "acao c u")
})

// ---------------------------------------------------------------------------
secao("6. SQL DE IMPORTAÇÃO — um comando, atômico, que não sobrescreve")

ok("é um único INSERT com on conflict do nothing", () => {
  const r = lerPlanilha(planilha("GEAR-001,A,Livro,,,,,,,1", "GEAR-002,B,Livro,,,,,,,2"))
  const saida = sqlDeImportacao(r.itens)
  assert.equal((saida.match(/;/g) ?? []).length, 1, "mais de um comando")
  assert.ok(saida.startsWith("insert into public.patrimonio"))
  assert.ok(saida.trimEnd().endsWith("on conflict (codigo) do nothing;"))
})
ok("aspas simples, barra invertida e acentos saem escapados", () => {
  const r = lerPlanilha(planilha(`GEAR-001,"O'Reilly \\ Cookbook",Livro,,"D'Ávila",,,"it's ""x""",,1`))
  const saida = sqlDeImportacao(r.itens)
  assert.ok(saida.includes("'O''Reilly \\ Cookbook'"), saida)
  assert.ok(saida.includes("'D''Ávila'"), saida)
  assert.ok(saida.includes(`'it''s "x"'`), saida)
})

console.log(`\n${"─".repeat(60)}\n${n} verificações passaram\n\n\x1b[32mAs regras do inventário valem.\x1b[0m`)
