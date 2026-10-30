import assert from "node:assert/strict"
import { frequencia } from "../lib/horas.ts"

const sessao = (chave, dia, frente, ...presentes) => ({ chave, dia, frente, presentes: new Set(presentes) })
const sessoes = [
  sessao("r1", "2026-10-01", null, "ana", "bia"),
  sessao("r2", "2026-10-08", null, "bia"),
  sessao("c1", "2026-10-10", "Competição", "bia"),
  sessao("r3", "2026-10-15", null, "bia"),
  sessao("r4", "2026-10-22", null, "bia"),
  sessao("p1", "2026-10-23", "Pesquisa", "bia"),
]
const ana = { id: "ana", frente: "Competição", desde: "2026-09-01" }

// Ana: espera r1–r4 e c1 (não p1); veio só em r1; avisou em r3.
const f = frequencia(ana, sessoes, new Set(["r3|ana"]))
assert.deepEqual(f, { esperadas: 5, faltas: 4, avisadas: 1, seguidas: 3, alerta: true })

// Presença recente fecha a sequência.
const comPresenca = [...sessoes, sessao("r5", "2026-10-29", null, "ana")]
assert.equal(frequencia(ana, comPresenca, new Set()).seguidas, 0)
// ...mas 4 de 6 ainda passa dos 25%.
assert.equal(frequencia(ana, comPresenca, new Set()).alerta, true)

// Quem entrou depois não deve as sessões anteriores.
const nova = { id: "cris", frente: "Pesquisa", desde: "2026-10-20" }
assert.deepEqual(frequencia(nova, sessoes, new Set()), { esperadas: 2, faltas: 2, avisadas: 0, seguidas: 2, alerta: true })

// Sem sessões esperadas não há alerta.
assert.equal(frequencia({ id: "x", frente: null, desde: "2027-01-01" }, sessoes, new Set()).alerta, false)

console.log("frequencia: ok")
