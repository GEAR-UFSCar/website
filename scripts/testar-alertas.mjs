// Quem vê cada alerta (044) e pontos do ciclo. A view em si é testada em test:banco.
import assert from "node:assert/strict"
import { alertasDe, pontosNoCiclo } from "../lib/alertas.ts"

const a = (extra) => ({ tipo: "x", titulo: "x", detalhe: null, href: "/", pessoa_id: null, grupo: null, desde: null, ...extra })
const lista = [a({ tipo: "meu", pessoa_id: "ana" }), a({ tipo: "dela", pessoa_id: "bia" }), a({ tipo: "fila", grupo: "revisores" }), a({ tipo: "gasto", pessoa_id: "bia", grupo: "financeiro" })]
const tipos = (q) => alertasDe(lista, q).map((x) => x.tipo).join(",")

assert.equal(tipos({ usuarioId: "ana", revisor: false, financeiro: false }), "meu")
assert.equal(tipos({ usuarioId: "ana", revisor: true, financeiro: false }), "meu,fila")
assert.equal(tipos({ usuarioId: "ana", revisor: false, financeiro: true }), "meu,gasto")
// quem gastou vê o próprio gasto aguardando, mesmo sem ser do financeiro
assert.equal(tipos({ usuarioId: "bia", revisor: false, financeiro: false }), "dela,gasto")

const ciclo = { inicio: "2026-11-17", fim: "2026-11-30" }
const aprovadas = [
  { concluido_em: "2026-11-16T23:00:00Z", pontos: 5 }, // antes
  { concluido_em: "2026-11-17T10:00:00Z", pontos: 10 },
  { concluido_em: "2026-11-30T20:00:00Z", pontos: 20 },
  { concluido_em: null, pontos: 99 }, // não aprovada não conta
]
assert.equal(pontosNoCiclo(aprovadas, ciclo), 30)
assert.equal(pontosNoCiclo(aprovadas, null), 0)

console.log("alertas: ok")
