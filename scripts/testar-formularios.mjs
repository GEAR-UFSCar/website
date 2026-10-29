// Roda com: node scripts/testar-formularios.mjs
import assert from "node:assert/strict"
import { GRUPOS_FORMULARIO, MODELOS, faltando, modeloPorId, nivelDeRisco } from "../lib/formularios.ts"
import { alcada } from "../lib/administracao.ts"

// o banco (035) só aceita modelo em minúsculas e sublinhado, até 40 caracteres
const ids = MODELOS.map((m) => m.id)
assert.equal(new Set(ids).size, ids.length, "id de modelo repetido")
for (const m of MODELOS) {
  assert.match(m.id, /^[a-z0-9_]{2,40}$/, m.id)
  assert.ok(GRUPOS_FORMULARIO.includes(m.grupo), `${m.id}: grupo desconhecido`)
  const campos = m.secoes.flatMap((s) => s.campos.map((c) => c.id))
  assert.equal(new Set(campos).size, campos.length, `${m.id}: campo repetido`)
}
// denúncia só pode ser lida pela diretoria
assert.equal(modeloPorId("denuncia").visibilidade, "denuncia")

const incidente = modeloPorId("incidente")
assert.ok(faltando(incidente, {}).length > 0)
assert.deepEqual(
  faltando(incidente, { classe: "Quase-acidente (sem dano)", atividade: "Bancada", quando: "hoje 14h", local: "Lab", fatos: "caiu" }),
  [],
)
// checklist obrigatório exige todos os itens marcados
const viagem = modeloPorId("termo_viagem")
const compromissos = viagem.secoes[0].campos.find((c) => c.id === "compromissos")
assert.ok(faltando(viagem, { compromissos: compromissos.itens.slice(1) }).some((r) => r === compromissos.rotulo))

assert.deepEqual(nivelDeRisco("2", "3"), { valor: 6, faixa: "aceitável com controles" })
assert.equal(nivelDeRisco("3", "5").faixa, "não voa")
assert.equal(nivelDeRisco("", "5"), null)

assert.match(alcada(200), /Operações/)
assert.match(alcada(200.01), /Diretoria/)
assert.match(alcada(5000), /Assembleia/)
console.log(`formularios: ok (${MODELOS.length} modelos)`)
