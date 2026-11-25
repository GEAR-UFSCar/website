// Lógica pura da Academia (047): quiz em texto, vídeo, sequência, próxima lição.
import assert from "node:assert/strict"
import { continuarEstudo, embedDoVideo, escreverQuiz, lerQuiz, proximaLicao, sequenciaDias } from "../lib/academia.ts"

const texto = `? Qual comando lista os tópicos?
- ros2 node list
* ros2 topic list
> topic, não node.

? 2 + 2?
* 4
- 5`
const q = lerQuiz(texto)
assert.deepEqual(q, { questoes: [
  { pergunta: "Qual comando lista os tópicos?", opcoes: ["ros2 node list", "ros2 topic list"], correta: 1, explicacao: "topic, não node." },
  { pergunta: "2 + 2?", opcoes: ["4", "5"], correta: 0 },
] })
assert.deepEqual(lerQuiz(escreverQuiz(q.questoes)), q, "ida e volta")
assert.match(lerQuiz("? a\n- x\n- y").erro, /exatamente uma/)
assert.match(lerQuiz("? a\n* x\n* y").erro, /exatamente uma/)
assert.match(lerQuiz("? a\n* x").erro, /duas opções/)
assert.match(lerQuiz("- x").erro, /Comece/)
assert.match(lerQuiz("").erro, /pelo menos uma/)

const emb = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
assert.equal(embedDoVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), emb)
assert.equal(embedDoVideo("https://youtu.be/dQw4w9WgXcQ"), emb)
assert.equal(embedDoVideo("https://youtube.com/shorts/dQw4w9WgXcQ"), emb)
assert.equal(embedDoVideo("https://vimeo.com/123"), null)
assert.equal(embedDoVideo("https://youtube.com/watch?v=<script>"), null)
assert.equal(embedDoVideo("lixo"), null)

assert.equal(sequenciaDias([], "2026-11-25"), 0)
assert.equal(sequenciaDias(["2026-11-25", "2026-11-24", "2026-11-23"], "2026-11-25"), 3)
assert.equal(sequenciaDias(["2026-11-24", "2026-11-23"], "2026-11-25"), 2, "ontem ainda vale")
assert.equal(sequenciaDias(["2026-11-23"], "2026-11-25"), 0, "pulou um dia, zera")
assert.equal(sequenciaDias(["2026-03-01", "2026-02-28"], "2026-03-01"), 2, "virada de mês")

const ls = [{ id: "a" }, { id: "b" }, { id: "c" }]
assert.equal(proximaLicao(ls, new Set(["a"]))?.id, "b")
assert.equal(proximaLicao(ls, new Set(["a", "c"]))?.id, "b")
assert.equal(proximaLicao(ls, new Set(["a", "b", "c"])), null)

const lc = [{ id: "a1", modulo_id: "A" }, { id: "a2", modulo_id: "A" }, { id: "b1", modulo_id: "B" }, { id: "b2", modulo_id: "B" }]
assert.equal(continuarEstudo(lc, []), null, "sem nada feito, nada a continuar")
assert.deepEqual(continuarEstudo(lc, [{ licao_id: "b1" }, { licao_id: "a1" }]), { moduloId: "B", licao: lc[3], href: "/membros/aprendizagem/B?licao=b2" }, "a mais recente manda")
assert.equal(continuarEstudo(lc, [{ licao_id: "b2" }, { licao_id: "b1" }, { licao_id: "a1" }])?.licao.id, "a2", "B terminada, volta para A")
assert.equal(continuarEstudo(lc, lc.map((l) => ({ licao_id: l.id }))), null, "tudo feito")

console.log("academia: ok")
