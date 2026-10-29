/**
 * Regras de "Hoje" que não dependem de React nem do Supabase. Sem imports,
 * para o teste (scripts/testar-hoje.mjs) rodar em Node. Todo dia chega como
 * "YYYY-MM-DD" já calculado em Brasília (hojeISO/diaGear de lib/datas.ts).
 */

/** "YYYY-MM-DD" deslocado em `n` dias. UTC puro: sem fuso, sem horário de verão. */
export function maisDias(chave: string, n: number): string {
  const [a, m, d] = chave.split("-").map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

const PESO_STATUS: Record<string, number> = { Bloqueado: 0, "Em andamento": 1, Planejado: 2 }

/** Bloqueado primeiro (pede ação), depois em andamento; empate: mexido por último. */
export function ordenarSprints<T extends { status: string; updated_at: string }>(sprints: T[]): T[] {
  return [...sprints].sort((a, b) => {
    const pa = PESO_STATUS[a.status] ?? 3
    const pb = PESO_STATUS[b.status] ?? 3
    if (pa !== pb) return pa - pb
    return b.updated_at.localeCompare(a.updated_at)
  })
}

/**
 * Evento aparece se é geral, se a pessoa não tem frente (diretoria enxerga
 * todas) ou se é da frente dela.
 */
export function eventoVisivel(frenteDoEvento: string | null, frenteDoUsuario: string | null): boolean {
  return !frenteDoEvento || !frenteDoUsuario || frenteDoEvento === frenteDoUsuario
}

export type ItemPrazo = {
  id: string
  origem: "evento" | "meta"
  titulo: string
  dia: string
  hora: string | null
  href: string
  detalhe: string
}

/**
 * Atrasados = metas (nunca eventos) com dia antes de hoje; quem chama já tirou
 * as concluídas. Próximos = hoje até `ate`, inclusive, por dia, evento antes de
 * meta dentro do dia, e por hora entre eventos.
 */
export function prazosDaSemana(itens: ItemPrazo[], hoje: string, ate: string) {
  const atrasados = itens
    .filter((i) => i.origem === "meta" && i.dia < hoje)
    .sort((a, b) => a.dia.localeCompare(b.dia))

  const proximos = itens
    .filter((i) => i.dia >= hoje && i.dia <= ate)
    .sort((a, b) => {
      if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
      if (a.origem !== b.origem) return a.origem === "evento" ? -1 : 1
      return (a.hora ?? "").localeCompare(b.hora ?? "")
    })

  return { atrasados, proximos }
}

/** Metas em quatro grupos; "semana" = de hoje até 7 dias, inclusive. */
export function agruparMetas<T extends { prazo: string; concluida: boolean }>(metas: T[], hoje: string) {
  const ate = maisDias(hoje, 7)
  const abertas = metas.filter((m) => !m.concluida)
  return {
    atrasadas: abertas.filter((m) => m.prazo < hoje),
    semana: abertas.filter((m) => m.prazo >= hoje && m.prazo <= ate),
    depois: abertas.filter((m) => m.prazo > ate),
    concluidas: metas.filter((m) => m.concluida),
  }
}

/** O mínimo de um sprint que a escolha da próxima ação precisa ler. */
export type SprintMinimo = { id: string; titulo: string; status: string; proximo_passo: string | null }

export type ProximaAcao =
  | { tipo: "bloqueado"; sprint: SprintMinimo }
  | { tipo: "atrasada"; item: ItemPrazo }
  | { tipo: "hoje"; item: ItemPrazo }
  | { tipo: "andamento"; sprint: SprintMinimo }
  | { tipo: "proximo"; item: ItemPrazo }
  | { tipo: "modulo"; titulo: string }
  | { tipo: "nada" }

/**
 * A UMA coisa que "Hoje" põe em destaque. A ordem é a do custo de esperar:
 *   1. sprint bloqueado — trava quem depende dele, e só o responsável destrava;
 *   2. meta atrasada — já passou, e fica pior a cada dia;
 *   3. o que vence hoje (evento ou meta);
 *   4. sprint em andamento — o trabalho em curso;
 *   5. o próximo prazo da semana;
 *   6. o módulo atual da Academia;
 *   7. nada — e a tela diz isso em vez de inventar tarefa.
 *
 * Recebe sprints já ordenados (ordenarSprints) e prazos já separados
 * (prazosDaSemana); não reordena nada.
 */
export function proximaAcao(entrada: {
  sprints: SprintMinimo[]
  atrasados: ItemPrazo[]
  proximos: ItemPrazo[]
  hoje: string
  moduloAtual: string | null
}): ProximaAcao {
  const { sprints, atrasados, proximos, hoje, moduloAtual } = entrada

  const bloqueado = sprints.find((s) => s.status === "Bloqueado")
  if (bloqueado) return { tipo: "bloqueado", sprint: bloqueado }

  if (atrasados[0]) return { tipo: "atrasada", item: atrasados[0] }

  const doDia = proximos.find((i) => i.dia === hoje)
  if (doDia) return { tipo: "hoje", item: doDia }

  const andamento = sprints.find((s) => s.status === "Em andamento")
  if (andamento) return { tipo: "andamento", sprint: andamento }

  if (proximos[0]) return { tipo: "proximo", item: proximos[0] }
  if (moduloAtual) return { tipo: "modulo", titulo: moduloAtual }
  return { tipo: "nada" }
}

export type PedidoDeResposta = { id: string; texto: string; href: string; quantos: number; alerta: boolean }

type Janela = { id: string; abre_em: string; fecha_em: string }
const aberta = (j: Janela, agora: number) => Date.parse(j.abre_em) <= agora && Date.parse(j.fecha_em) > agora

/**
 * O que espera uma resposta minha fora dos sprints (035 e 033): votar, responder
 * pesquisa, corrigir registro devolvido, devolver item. Só entra o que tem
 * quantidade; lista indisponível (null) some em vez de virar "0".
 */
export function pedidosDeResposta(e: {
  agora: number
  hoje: string
  comVoto: boolean
  votacoes: Janela[] | null
  votei: string[]
  pesquisas: Janela[] | null
  respondi: string[]
  devolvidos: number | null
  emprestimos: { prazo: string | null }[] | null
}): PedidoDeResposta[] {
  const votar = e.comVoto && e.votacoes ? e.votacoes.filter((v) => aberta(v, e.agora) && !e.votei.includes(v.id)).length : 0
  const responder = e.pesquisas ? e.pesquisas.filter((p) => aberta(p, e.agora) && !e.respondi.includes(p.id)).length : 0
  const atrasados = (e.emprestimos ?? []).filter((x) => x.prazo && x.prazo < e.hoje).length
  const comigo = e.emprestimos?.length ?? 0
  return [
    { id: "votar", texto: votar === 1 ? "Votação aberta sem o seu voto" : "Votações abertas sem o seu voto", href: "/membros/assembleia", quantos: votar, alerta: true },
    { id: "pesquisa", texto: responder === 1 ? "Pesquisa anônima para responder" : "Pesquisas anônimas para responder", href: "/membros/pesquisas", quantos: responder, alerta: false },
    { id: "devolvido", texto: "Registros devolvidos para você corrigir", href: "/membros/formularios", quantos: e.devolvidos ?? 0, alerta: true },
    {
      id: "emprestimo",
      texto: atrasados ? `Itens do inventário com você (${atrasados} com prazo vencido)` : "Itens do inventário com você",
      href: "/membros/inventario",
      quantos: comigo,
      alerta: atrasados > 0,
    },
  ].filter((p) => p.quantos > 0)
}
