import assert from "node:assert/strict"
import { hrefDoSprint } from "../lib/administracao.ts"
import { agruparMetas, eventoVisivel, maisDias, ordenarSprints, prazosDaSemana } from "../lib/hoje.ts"

// maisDias atravessa mês e ano.
assert.equal(maisDias("2026-10-21", 7), "2026-10-28")
assert.equal(maisDias("2026-12-30", 3), "2027-01-02")
assert.equal(maisDias("2026-03-01", -1), "2026-02-28")

// Bloqueado antes de Em andamento antes de Planejado; empate por updated_at mais recente.
const sprints = [
  { id: "a", status: "Planejado", updated_at: "2026-10-01T10:00:00Z" },
  { id: "b", status: "Em andamento", updated_at: "2026-10-02T10:00:00Z" },
  { id: "c", status: "Bloqueado", updated_at: "2026-09-01T10:00:00Z" },
  { id: "d", status: "Em andamento", updated_at: "2026-10-05T10:00:00Z" },
]
assert.deepEqual(ordenarSprints(sprints).map((s) => s.id), ["c", "d", "b", "a"])
// Não muta a entrada.
assert.equal(sprints[0].id, "a")

const item = (id, origem, dia, hora = null) => ({ id, origem, titulo: id, dia, hora, href: "/x", detalhe: "" })
const itens = [
  item("meta-atrasada", "meta", "2026-10-15"),
  item("evento-passado", "evento", "2026-10-10", "09:00"),
  item("meta-hoje", "meta", "2026-10-21"),
  item("evento-hoje", "evento", "2026-10-21", "14:00"),
  item("evento-amanha", "evento", "2026-10-22", "08:00"),
  item("meta-longe", "meta", "2026-11-30"),
]
const { atrasados, proximos } = prazosDaSemana(itens, "2026-10-21", "2026-10-28")
// Só meta conta como atrasada; evento passado some.
assert.deepEqual(atrasados.map((i) => i.id), ["meta-atrasada"])
// Dentro do dia, evento antes de meta; fora da janela não entra.
assert.deepEqual(proximos.map((i) => i.id), ["evento-hoje", "meta-hoje", "evento-amanha"])

// Entrada vazia não quebra.
assert.deepEqual(prazosDaSemana([], "2026-10-21", "2026-10-28"), { atrasados: [], proximos: [] })

// Metas agrupadas.
const metas = [
  { id: 1, prazo: "2026-10-01", concluida: false },
  { id: 2, prazo: "2026-10-01", concluida: true },
  { id: 3, prazo: "2026-10-25", concluida: false },
  { id: 4, prazo: "2026-12-01", concluida: false },
]
const g = agruparMetas(metas, "2026-10-21")
assert.deepEqual(g.atrasadas.map((m) => m.id), [1])
assert.deepEqual(g.semana.map((m) => m.id), [3])
assert.deepEqual(g.depois.map((m) => m.id), [4])
assert.deepEqual(g.concluidas.map((m) => m.id), [2])

// Achado do revisor: o link de um sprint leva à frente DO SPRINT, não à do perfil.
assert.equal(hrefDoSprint("Pesquisa", "abc"), "/membros/sprints/pesquisa#sprint-abc")
assert.equal(hrefDoSprint("Projetos", "x"), "/membros/sprints/projetos#sprint-x")
assert.equal(hrefDoSprint("Competição", "y"), "/membros/sprints/competicao#sprint-y")
// Frente desconhecida ou vazia cai no seletor, nunca em Competição por acidente.
assert.equal(hrefDoSprint(null, "x"), "/membros/frente")
assert.equal(hrefDoSprint("Outra", "x"), "/membros/frente")

// Quem não tem frente (diretoria) vê eventos de todas as frentes; quem tem, só os seus e os gerais.
assert.equal(eventoVisivel(null, "Pesquisa"), true)
assert.equal(eventoVisivel("Pesquisa", null), true)
assert.equal(eventoVisivel("Pesquisa", "Pesquisa"), true)
assert.equal(eventoVisivel("Competição", "Pesquisa"), false)

console.log("hoje: ok")
