// Espelho na tela das regras de tarefa (042): os botões que aparecem têm de
// ser os que o banco aceita. O banco em si é testado em test:banco.
import assert from "node:assert/strict"
import { acoesDaTarefa, atrasada, podeEditarTarefa } from "../lib/tarefas.ts"
import { eRevisor, quemVe } from "../lib/administracao.ts"

const ANA = "ana", BIA = "bia"
// monta pelo mesmo quemVe() que as páginas usam
const membro = (id, { revisor = false, cargo = null, frente = null } = {}) =>
  quemVe(id, { aprovado: true, ativo: true, nivel_formacao: revisor ? "Principal" : "Fundamental", cargo, frente })
const tarefa = (extra = {}) => ({ estado: "Em andamento", responsavel_id: ANA, criado_por: ANA, sprint: null, ...extra })

// só o responsável envia, e só de Em andamento ou Ajustes
assert.equal(acoesDaTarefa(tarefa(), membro(ANA)).enviar, true)
assert.equal(acoesDaTarefa(tarefa({ estado: "Ajustes" }), membro(ANA)).enviar, true)
assert.equal(acoesDaTarefa(tarefa(), membro(BIA)).enviar, false)
for (const estado of ["Aberta", "Em revisão", "Concluída"]) assert.equal(acoesDaTarefa(tarefa({ estado }), membro(ANA)).enviar, false)

// ninguém revisa o próprio trabalho; quem não é revisor não revisa
const emRevisao = tarefa({ estado: "Em revisão" })
assert.equal(acoesDaTarefa(emRevisao, membro(BIA, { revisor: true })).revisar, true)
assert.equal(acoesDaTarefa(emRevisao, membro(ANA, { revisor: true })).revisar, false)
assert.equal(acoesDaTarefa(emRevisao, membro(BIA)).revisar, false)
assert.equal(acoesDaTarefa(tarefa(), membro(BIA, { revisor: true })).revisar, false)

// editar: quem criou, diretoria, cargo na trilha do projeto
const doProjeto = tarefa({ criado_por: BIA, sprint: { id: "s", titulo: "Rover", frente: "Pesquisa" } })
assert.equal(podeEditarTarefa(doProjeto, membro(ANA)), false)
assert.equal(podeEditarTarefa(doProjeto, membro(BIA)), true)
assert.equal(podeEditarTarefa(doProjeto, membro(ANA, { cargo: "Presidente" })), true)
assert.equal(podeEditarTarefa(doProjeto, membro(ANA, { cargo: "Diretor de Pesquisa", frente: "Pesquisa" })), true)
assert.equal(podeEditarTarefa(doProjeto, membro(ANA, { cargo: "Diretor de Extensão", frente: "Extensão" })), false)
assert.equal(podeEditarTarefa(tarefa({ criado_por: BIA }), membro(ANA, { cargo: "Marketing" })), false)

// revisor: aprovado, ativo, Principal ou Avançada
assert.equal(eRevisor({ aprovado: true, ativo: true, nivel_formacao: "Principal" }), true)
assert.equal(eRevisor({ aprovado: true, ativo: true, nivel_formacao: "Avançada" }), true)
assert.equal(eRevisor({ aprovado: true, ativo: true, nivel_formacao: "Fundamental" }), false)
assert.equal(eRevisor({ aprovado: true, ativo: false, nivel_formacao: "Avançada" }), false)
assert.equal(eRevisor({ aprovado: false, ativo: true, nivel_formacao: "Avançada" }), false)
assert.equal(eRevisor(null), false)

// atrasada: passou do prazo e não está concluída
assert.equal(atrasada({ estado: "Em andamento", prazo: "2026-11-01" }, "2026-11-24"), true)
assert.equal(atrasada({ estado: "Concluída", prazo: "2026-11-01" }, "2026-11-24"), false)
assert.equal(atrasada({ estado: "Aberta", prazo: "2026-11-24" }, "2026-11-24"), false)
assert.equal(atrasada({ estado: "Aberta", prazo: null }, "2026-11-24"), false)

// 044: assumir só pauta aberta sem dono; bloquear só o dono, em andamento
assert.equal(acoesDaTarefa(tarefa({ estado: "Aberta", responsavel_id: null }), membro(BIA)).assumir, true)
assert.equal(acoesDaTarefa(tarefa(), membro(BIA)).assumir, false)
assert.equal(acoesDaTarefa(tarefa(), membro(ANA)).bloquear, true)
assert.equal(acoesDaTarefa(tarefa({ bloqueada: true }), membro(ANA)).bloquear, false)
assert.equal(acoesDaTarefa(tarefa(), membro(BIA)).bloquear, false)
assert.equal(acoesDaTarefa(tarefa({ estado: "Em revisão" }), membro(ANA)).bloquear, false)
assert.equal(acoesDaTarefa(tarefa({ bloqueada: true }), membro(ANA)).desbloquear, true)
assert.equal(acoesDaTarefa(tarefa({ bloqueada: true, criado_por: "caio" }), membro(BIA)).desbloquear, false)

console.log("tarefas: ok")
