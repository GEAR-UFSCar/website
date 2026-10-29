import type { SupabaseClient } from "@supabase/supabase-js"

import { diasAtrasISO } from "@/lib/datas"

/**
 * Novidades da área de membros (033): o que apareceu desde a última visita à
 * página de novidades. Não há tabela de notificação; cada item é lido da sua
 * própria tabela, então nada fica dessincronizado e não há o que limpar.
 * ponytail: sem e-mail nem push. Para isso, um cron que leia esta mesma lista.
 */
export type Novidade = { chave: string; quando: string; tipo: string; titulo: string; href: string }

/** Janela da página e do contador: o último mês, nunca tudo desde sempre. */
export const umMesAtras = () => diasAtrasISO(30)

/** O contador do sino conta a partir da última visita, dentro do último mês. */
export const desdeDe = (vistoEm: string | null) => {
  const mes = umMesAtras()
  return vistoEm && vistoEm > mes ? vistoEm : mes
}

export async function buscarNovidades(
  supabase: SupabaseClient,
  { usuarioId, desde, comCargo, financeiro }: { usuarioId: string; desde: string; comCargo: boolean; financeiro: boolean },
): Promise<Novidade[]> {
  const [avisos, eventos, tarefas, pedidos, candidatos, pedidosNovos] = await Promise.all([
    supabase.from("avisos").select("id, titulo, created_at").gt("created_at", desde).or(`autor_id.is.null,autor_id.neq.${usuarioId}`).limit(20),
    supabase.from("eventos").select("id, titulo, created_at").gt("created_at", desde).or(`criado_por.is.null,criado_por.neq.${usuarioId}`).limit(20),
    supabase
      .from("sprint_tarefas")
      .select("id, titulo, created_at")
      .eq("responsavel_id", usuarioId)
      .gt("created_at", desde)
      .or(`criado_por.is.null,criado_por.neq.${usuarioId}`)
      .limit(20),
    supabase.from("pedidos_compra").select("id, item, status, decidido_em").eq("solicitante_id", usuarioId).gt("decidido_em", desde).limit(20),
    comCargo
      ? supabase.from("perfis").select("id, nome_completo, created_at").eq("aprovado", false).not("nome_completo", "is", null).gt("created_at", desde).limit(20)
      : null,
    financeiro ? supabase.from("pedidos_compra").select("id, item, created_at").eq("status", "Pendente").gt("created_at", desde).limit(20) : null,
  ])

  // Erro em uma fonte (tabela ainda não migrada) some com ela, não com a lista toda.
  return [
    ...(avisos.data ?? []).map((a) => ({ chave: `a${a.id}`, quando: a.created_at, tipo: "Aviso", titulo: a.titulo, href: "/membros/mural" })),
    ...(eventos.data ?? []).map((e) => ({ chave: `e${e.id}`, quando: e.created_at, tipo: "Evento", titulo: e.titulo, href: "/membros/calendario" })),
    ...(tarefas.data ?? []).map((t) => ({ chave: `t${t.id}`, quando: t.created_at, tipo: "Tarefa para você", titulo: t.titulo, href: "/membros" })),
    ...(pedidos.data ?? []).map((p) => ({
      chave: `p${p.id}${p.status}`,
      quando: p.decidido_em as string,
      tipo: `Pedido ${p.status.toLowerCase()}`,
      titulo: p.item,
      href: "/membros/compras",
    })),
    ...(candidatos?.data ?? []).map((c) => ({
      chave: `c${c.id}`,
      quando: c.created_at,
      tipo: "Novo candidato",
      titulo: c.nome_completo ?? "",
      href: "/membros/administracao/selecao",
    })),
    ...(pedidosNovos?.data ?? []).map((p) => ({ chave: `n${p.id}`, quando: p.created_at, tipo: "Pedido de compra", titulo: p.item, href: "/membros/administracao/caixa" })),
  ].sort((a, b) => b.quando.localeCompare(a.quando))
}
