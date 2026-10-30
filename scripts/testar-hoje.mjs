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

// --- proximaAcao: a única coisa em destaque ------------------------------------
{
  const { proximaAcao } = await import("../lib/hoje.ts")
  const sp = (id, status) => ({ id, titulo: `sprint ${id}`, status, proximo_passo: null })
  const it = (id, dia, origem = "meta") => ({ id, origem, titulo: id, dia, hora: null, href: "/x", detalhe: "" })
  const base = { sprints: [], atrasados: [], proximos: [], hoje: "2026-10-23", moduloAtual: null }
  const tipo = (o) => proximaAcao({ ...base, ...o }).tipo

  assert.equal(tipo({}), "nada")
  assert.equal(tipo({ moduloAtual: "ROS" }), "modulo")
  assert.equal(tipo({ moduloAtual: "ROS", proximos: [it("a", "2026-10-25")] }), "proximo")
  assert.equal(tipo({ proximos: [it("a", "2026-10-25")], sprints: [sp(1, "Em andamento")] }), "andamento")
  assert.equal(tipo({ sprints: [sp(1, "Em andamento")], proximos: [it("h", "2026-10-23")] }), "hoje")
  assert.equal(tipo({ proximos: [it("h", "2026-10-23")], atrasados: [it("v", "2026-10-20")] }), "atrasada")
  assert.equal(tipo({ atrasados: [it("v", "2026-10-20")], sprints: [sp(1, "Bloqueado")] }), "bloqueado")
  // planejado sozinho não é destaque: ninguém começou
  assert.equal(tipo({ sprints: [sp(1, "Planejado")] }), "nada")
  // o bloqueado vem mesmo atrás de um em andamento na lista
  const r = proximaAcao({ ...base, sprints: [sp(1, "Em andamento"), sp(2, "Bloqueado")] })
  assert.equal(r.tipo === "bloqueado" && r.sprint.id, 2)
  console.log("proximaAcao: ok")
}

// pedidosDeResposta: só janela aberta, sem o que já fiz, e voto só para quem vota.
{
  const { pedidosDeResposta } = await import("../lib/hoje.ts")
  const agora = Date.parse("2026-10-29T12:00:00Z")
  const j = (id, abre, fecha) => ({ id, abre_em: abre, fecha_em: fecha })
  const votacoes = [
    j("aberta", "2026-10-28T00:00:00+00:00", "2026-10-30T00:00:00+00:00"),
    j("votada", "2026-10-28T00:00:00+00:00", "2026-10-30T00:00:00+00:00"),
    j("futura", "2026-11-01T00:00:00+00:00", "2026-11-02T00:00:00+00:00"),
    j("fechada", "2026-10-01T00:00:00+00:00", "2026-10-29T12:00:00+00:00"),
  ]
  const base = { agora, hoje: "2026-10-29", comVoto: true, votacoes, votei: ["votada"], pesquisas: votacoes, respondi: [], devolvidos: 2, emprestimos: [{ prazo: "2026-10-28" }, { prazo: null }] }
  const r = pedidosDeResposta(base)
  assert.deepEqual(r.map((p) => [p.id, p.quantos]), [["votar", 1], ["pesquisa", 2], ["devolvido", 2], ["emprestimo", 2]])
  assert.equal(r.find((p) => p.id === "emprestimo").alerta, true)
  // sem direito a voto, votação não cobra; lista indisponível não vira item
  const s = pedidosDeResposta({ ...base, comVoto: false, pesquisas: null, devolvidos: null, emprestimos: [{ prazo: "2026-11-30" }] })
  assert.deepEqual(s.map((p) => [p.id, p.quantos, p.alerta]), [["emprestimo", 1, false]])
  assert.deepEqual(pedidosDeResposta({ ...base, votacoes: [], pesquisas: [], devolvidos: 0, emprestimos: null }), [])
  console.log("pedidosDeResposta: ok")
}
