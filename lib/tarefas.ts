/**
 * Tarefas (sprint_tarefas, 042): o que a tela precisa saber para mostrar só os
 * botões que o banco vai aceitar. Quem decide de verdade são as funções
 * enviar_tarefa_para_revisao() e revisar_tarefa(); isto é o espelho.
 */

import type { QuemVe } from "@/lib/administracao"

export type { QuemVe }

/** Espelha o CHECK de sprint_tarefas.estado (042), na ordem do fluxo. */
export const ESTADOS_TAREFA = ["Aberta", "Em andamento", "Em revisão", "Ajustes", "Concluída"] as const
export type EstadoTarefa = (typeof ESTADOS_TAREFA)[number]

export type Tarefa = {
  id: string
  sprint_id: string | null
  titulo: string
  prazo: string | null
  estado: EstadoTarefa
  pronto_quando: string | null
  evidencia_url: string | null
  comentario_revisao: string | null
  rodadas_ajustes: number
  enviada_revisao_em: string | null
  responsavel_id: string | null
  criado_por: string | null
  responsavel: { id: string; nome_completo: string | null } | null
  revisor: { nome_completo: string | null } | null
  sprint: { id: string; titulo: string; frente: string } | null
  /** 044 */
  tipo: "principal" | "reserva" | null
  bloqueada: boolean
  motivo_bloqueio: string | null
  bloqueada_em: string | null
  roteiro: string | null
  nivel: string | null
  area: string | null
}

export const COLUNAS_TAREFA =
  "id, sprint_id, titulo, prazo, estado, pronto_quando, evidencia_url, comentario_revisao, rodadas_ajustes, " +
  "enviada_revisao_em, responsavel_id, criado_por, tipo, bloqueada, motivo_bloqueio, bloqueada_em, roteiro, nivel, area, " +
  "responsavel:perfis!sprint_tarefas_responsavel_id_fkey (id, nome_completo), " +
  "revisor:perfis!sprint_tarefas_revisor_id_fkey (nome_completo), " +
  "sprint:sprints!sprint_tarefas_sprint_id_fkey (id, titulo, frente)"

/** Espelha pode_editar_tarefa() (042): quem criou, a diretoria, ou cargo na trilha do projeto. */
export function podeEditarTarefa(t: Pick<Tarefa, "criado_por" | "sprint">, q: QuemVe) {
  if (t.criado_por === q.usuarioId || q.diretoria) return true
  return Boolean(t.sprint && q.temCargo && q.frente === t.sprint.frente)
}

/** Os botões de fluxo que aparecem para quem está vendo. */
export function acoesDaTarefa(t: Pick<Tarefa, "estado" | "responsavel_id" | "criado_por" | "sprint"> & { bloqueada?: boolean }, q: QuemVe) {
  const dono = t.responsavel_id === q.usuarioId
  const andando = t.estado === "Em andamento" || t.estado === "Ajustes"
  return {
    // pauta aberta: qualquer membro assume, sem aprovação (044)
    assumir: t.responsavel_id === null && t.estado === "Aberta",
    bloquear: dono && andando && !t.bloqueada,
    desbloquear: Boolean(t.bloqueada) && (dono || podeEditarTarefa(t, q)),
    tipo: dono && t.estado !== "Concluída",
    enviar: dono && (t.estado === "Em andamento" || t.estado === "Ajustes"),
    // ninguém revisa o próprio trabalho
    revisar: t.estado === "Em revisão" && q.revisor && !dono,
    editar: podeEditarTarefa(t, q),
  }
}

/** Atrasada: passou do prazo e não está concluída. Datas ISO comparam como texto. */
export const atrasada = (t: Pick<Tarefa, "estado" | "prazo">, hoje: string) =>
  t.estado !== "Concluída" && t.prazo !== null && t.prazo < hoje

/** Tom da pílula por estado, com a mesma gramática dos sprints: âmbar cheio = precisa de alguém. */
export const TOM_DO_ESTADO: Record<EstadoTarefa, "neutro" | "ativo" | "alerta"> = {
  Aberta: "neutro",
  "Em andamento": "ativo",
  "Em revisão": "alerta",
  Ajustes: "alerta",
  Concluída: "neutro",
}
