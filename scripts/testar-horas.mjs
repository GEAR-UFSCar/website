// Roda com: node scripts/testar-horas.mjs
import assert from "node:assert/strict"
import { duracaoSugerida, formatarHoras, linhasDeHoras, somarHoras } from "../lib/horas.ts"

assert.equal(formatarHoras(1.5), "1h30")
assert.equal(formatarHoras(2), "2h")
assert.equal(formatarHoras(0.25), "0h15")
assert.equal(duracaoSugerida("2026-10-01T19:00:00Z", "2026-10-01T21:10:00Z"), 2)
assert.equal(duracaoSugerida("2026-10-01T19:00:00Z", null), 2)
assert.equal(duracaoSugerida("2026-10-01T19:00:00Z", "2026-10-01T19:10:00Z"), 0.5)
const linhas = linhasDeHoras(
  [{ evento_id: "e", dia: "2026-10-01", horas: "1.5", evento: { titulo: "Geral", tipo: "Reunião" } }],
  [{ id: "l", data: "2026-10-05", horas: "3", descricao: "Viagem" }],
)
assert.equal(linhas[0].chave, "l")
assert.equal(somarHoras(linhas), 4.5)
console.log("horas: ok")
