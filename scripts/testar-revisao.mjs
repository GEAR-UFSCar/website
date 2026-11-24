// Espelho na tela das regras da fila (043). O banco é testado em test:banco.
import assert from "node:assert/strict"
import { atrasadoNaFila, horasNaFila, podeRevisar } from "../lib/revisao.ts"

const agora = Date.parse("2026-11-24T12:00:00Z")
const ha = (h) => new Date(agora - h * 3_600_000).toISOString()
const item = (extra = {}) => ({ autor_id: "ana", revisor_id: null, enviada_em: ha(2), ...extra })

assert.equal(horasNaFila(ha(5), agora), 5)
assert.equal(horasNaFila(null, agora), 0)
assert.equal(atrasadoNaFila({ enviada_em: ha(47) }, agora), false)
assert.equal(atrasadoNaFila({ enviada_em: ha(48) }, agora), true)

// ninguém revisa o próprio trabalho, nem passadas 48 h
assert.equal(podeRevisar(item(), "ana", true, agora), false)
assert.equal(podeRevisar(item({ enviada_em: ha(100) }), "ana", true, agora), false)
// quem não é revisor não pega
assert.equal(podeRevisar(item(), "bia", false, agora), false)
// livre: qualquer revisor; pego por outro: só depois de 48 h; pego por mim: sempre
assert.equal(podeRevisar(item(), "bia", true, agora), true)
assert.equal(podeRevisar(item({ revisor_id: "caio" }), "bia", true, agora), false)
assert.equal(podeRevisar(item({ revisor_id: "caio", enviada_em: ha(49) }), "bia", true, agora), true)
assert.equal(podeRevisar(item({ revisor_id: "bia" }), "bia", true, agora), true)

console.log("revisao: ok")
