// Roda com: node scripts/testar-votacoes.mjs
import assert from "node:assert/strict"
import { apurar } from "../lib/votacoes.ts"

const fca = (f, c, a) => [{ opcao: "Favorável", votos: f }, { opcao: "Contrário", votos: c }, { opcao: "Abstenção", votos: a }]

// 10 aptos: quórum é 6
assert.equal(apurar(fca(3, 1, 1), 5, 10, "simples").quorum, false)
assert.match(apurar(fca(3, 2, 1), 6, 10, "simples").resultado, /^Favorável/)
// abstenção não conta: 2 a 2 é empate mesmo com 3 abstenções
assert.equal(apurar(fca(2, 2, 3), 7, 10, "simples").empate, true)
// dois terços de 10 = 7 favoráveis, contra os membros com voto e não os presentes
assert.match(apurar(fca(6, 0, 0), 6, 10, "dois_tercos").resultado, /^Rejeitada/)
assert.match(apurar(fca(7, 1, 0), 8, 10, "dois_tercos").resultado, /^Aprovada/)
// eleição: candidatos, branco fora dos válidos
assert.match(apurar([{ opcao: "Ana", votos: 4 }, { opcao: "Bia", votos: 3 }, { opcao: "Branco", votos: 5 }], 12, 12, "simples").resultado, /^Ana/)
console.log("votacoes: ok")

// pesquisa de clima: média, proporção de 1–2 e alerta abaixo de 3,5
const { resumirEscala } = await import("../lib/pesquisas.ts")
const r = resumirEscala([{ a: 5 }, { a: 1 }, { a: 2 }, { a: "4" }, {}], "a")
assert.equal(r.n, 4)
assert.equal(r.media, 3)
assert.equal(r.baixas, 0.5)
assert.equal(r.atencao, true)
assert.equal(resumirEscala([], "a"), null)
console.log("pesquisas: ok")
