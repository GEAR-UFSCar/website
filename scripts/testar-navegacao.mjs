import assert from "node:assert/strict"
import { GRUPOS, abaAtual, destinosDaPaleta, grupoAtual, gruposVisiveis, titulo } from "../lib/navegacao.ts"

const id = (p, g = GRUPOS) => grupoAtual(p, g)?.id

// Hoje só casa com /membros exato: não engole as outras rotas.
assert.equal(id("/membros"), "hoje")
assert.equal(id("/membros/mural"), "equipe")

// Minha frente cobre as três frentes, a rota de redirecionamento e as metas.
assert.equal(id("/membros/frente"), "frente")
assert.equal(id("/membros/sprints/competicao"), "frente")
assert.equal(id("/membros/sprints/pesquisa"), "frente")
assert.equal(id("/membros/metas"), "frente")

assert.equal(id("/membros/aprendizagem"), "aprender")
assert.equal(id("/membros/calendario"), "equipe")
assert.equal(id("/membros/diretorio"), "equipe")
assert.equal(id("/membros/documentacao"), "equipe")
assert.equal(id("/membros/metricas"), "equipe")
assert.equal(id("/membros/administracao"), "gestao")
assert.equal(id("/membros/administracao/atas"), "gestao")

// Rota desconhecida sob /membros não devolve grupo errado nem lança.
assert.equal(id("/membros/algo-novo"), undefined)
assert.equal(id("/outro"), undefined)

// Sem cargo, Gestão não existe; com cargo, existe.
assert.ok(!gruposVisiveis(false).some((g) => g.id === "gestao"))
assert.ok(gruposVisiveis(true).some((g) => g.id === "gestao"))
// Sem cargo, a rota de gestão não resolve para grupo nenhum.
assert.equal(id("/membros/administracao/atas", gruposVisiveis(false)), undefined)

// Aba ativa: Sprints cobre as três frentes; Visão geral de Gestão é exata.
const frente = grupoAtual("/membros/sprints/projetos")
assert.equal(abaAtual("/membros/sprints/projetos", frente)?.rotulo, "Sprints")
assert.equal(abaAtual("/membros/metas", frente)?.rotulo, "Metas")
const gestao = grupoAtual("/membros/administracao")
assert.equal(abaAtual("/membros/administracao", gestao)?.rotulo, "Visão geral")
assert.equal(abaAtual("/membros/administracao/cargos", gestao)?.rotulo, "Cargos")

// Grupo sem abas devolve undefined, sem lançar.
assert.equal(abaAtual("/membros", grupoAtual("/membros")), undefined)

// Títulos.
assert.equal(titulo("/membros"), "Hoje")
assert.equal(titulo("/membros/diretorio"), "Pessoas")
assert.equal(titulo("/membros/administracao/cargos"), "Cargos e aprovação")
assert.equal(titulo("/membros/sprints/pesquisa"), "Pesquisa")
assert.equal(titulo("/membros/rota-nova"), "Área de membros")

// Paleta Ctrl+K: o que cada pessoa pode ver como destino.
const rotulos = (comCargo) => destinosDaPaleta(comCargo).map((d) => d.rotulo)
assert.ok(rotulos(false).includes("Hoje"))
assert.ok(rotulos(false).includes("Nova meta"))
assert.ok(!rotulos(false).includes("Novo aviso"))
assert.ok(!rotulos(false).includes("Atas"))
assert.ok(!rotulos(false).includes("Patrimônio"))
assert.ok(rotulos(true).includes("Novo aviso"))
assert.ok(rotulos(true).includes("Atas"))
// Nenhum destino repetido.
const hrefs = destinosDaPaleta(true).map((d) => `${d.rotulo}|${d.href}`)
assert.equal(new Set(hrefs).size, hrefs.length)

console.log("navegacao: ok")
