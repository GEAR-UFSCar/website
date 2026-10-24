/**
 * Do banco para a grade: busca os eventos (com a repetição já expandida) e
 * transforma eventos, metas, sprints e módulos da Academia numa lista única de
 * itens por dia.
 *
 * Só TIPOS vêm de bibliotecas externas. A busca recebe o cliente já criado
 * pela página, que é quem decide a sessão — este arquivo não sabe de cookie.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import type { ItemAgenda, Camada } from "@/lib/agenda"
import {
  combinaBusca,
  instanteGear,
  ocorrencias,
  recorrenciaValida,
  respostaValida,
  rotuloDeMinutos,
  rotuloDoHorario,
  segmentos,
  somarDias,
  numeroDoDia,
  diaDoNumero,
  type EventoCal,
  type RespostaPresenca,
} from "@/lib/calendario"
import { hrefDoSprint } from "@/lib/administracao"

// -----------------------------------------------------------------------------
// Busca
// -----------------------------------------------------------------------------

export type ResultadoEventos = {
  eventos: EventoCal[]
  /**
   * Falso quando a 027 ainda não rodou: a consulta com os campos novos falhou
   * e a tela caiu para as colunas antigas. Sem isto o calendário inteiro
   * ficaria fora do ar por causa de uma coluna.
   */
  migrado: boolean
  erro: PostgrestError | null
}

/**
 * Eventos que podem encostar em [de, ate]: os que começam na janela, os de
 * vários dias que começaram antes e terminam dentro dela, e TODOS os que se
 * repetem e começaram antes do fim dela (a repetição só se descobre expandindo).
 *
 * O banco devolve um pouco a mais; quem recorta é ocorrencias(). Por isso o
 * filtro daqui pode ser grosso sem errar a tela.
 */
export async function buscarEventos(supabase: SupabaseClient, de: string, ate: string): Promise<ResultadoEventos> {
  const inicio = instanteGear(de, 0)
  const fim = instanteGear(somarDias(ate, 1), 0)

  const atual = await supabase
    .from("eventos")
    .select("*")
    .or(
      `and(data_inicio.gte.${inicio},data_inicio.lt.${fim}),` +
        `and(data_fim.gte.${inicio},data_inicio.lt.${fim}),` +
        `and(recorrencia.not.is.null,data_inicio.lt.${fim})`,
    )
    .order("data_inicio", { ascending: true })

  if (!atual.error) return { eventos: (atual.data ?? []) as EventoCal[], migrado: true, erro: null }

  const antigo = await supabase
    .from("eventos")
    .select("id, titulo, descricao, tipo, data_inicio, data_fim, frente_vinculada, criado_por")
    .gte("data_inicio", inicio)
    .lt("data_inicio", fim)
    .order("data_inicio", { ascending: true })

  return {
    eventos: (antigo.data ?? []) as EventoCal[],
    migrado: false,
    erro: antigo.error,
  }
}

export type Presenca = { evento_id: string; usuario_id: string; dia: string; resposta: RespostaPresenca }

/** Presenças de [de, ate]. Tabela ausente (027 não rodou) = lista vazia + `indisponivel`. */
export async function buscarPresencas(supabase: SupabaseClient, de: string, ate: string) {
  const { data, error } = await supabase
    .from("eventos_presencas")
    .select("evento_id, usuario_id, dia, resposta")
    .gte("dia", de)
    .lte("dia", ate)

  const lista = ((data ?? []) as { evento_id: string; usuario_id: string; dia: string; resposta: string }[])
    .map((p) => ({ ...p, resposta: respostaValida(p.resposta) }))
    .filter((p): p is Presenca => p.resposta !== null)

  return { presencas: lista, indisponivel: Boolean(error) }
}

// -----------------------------------------------------------------------------
// Itens
// -----------------------------------------------------------------------------

type Contexto = { de: string; ate: string; meuId: string }

/** Um item por dia e por ocorrência. */
export function itensDeEventos(eventos: EventoCal[], presencas: Presenca[], ctx: Contexto): ItemAgenda[] {
  const minhas = new Map(
    presencas.filter((p) => p.usuario_id === ctx.meuId).map((p) => [`${p.evento_id}|${p.dia}`, p.resposta]),
  )

  return eventos.flatMap((e) =>
    ocorrencias(e, ctx.de, ctx.ate).flatMap((o) =>
      segmentos(o, ctx.de, ctx.ate).map<ItemAgenda>((seg) => ({
        id: `evento-${e.id}-${o.dia}-${seg.dia}`,
        origem: "evento",
        titulo: e.titulo,
        dia: seg.dia,
        hora: seg.inicioMin == null ? null : rotuloDeMinutos(seg.inicioMin),
        descricao: e.descricao,
        rotulo: e.tipo,
        frente: e.frente_vinculada,
        tipo: e.tipo,
        eventoId: e.id,
        ocorrencia: o.dia,
        horario: rotuloDoHorario(o),
        local: e.local ?? null,
        repete: recorrenciaValida(e.recorrencia) !== null,
        inicioMin: seg.inicioMin,
        fimMin: seg.fimMin,
        semFim: seg.semFim,
        continuaDeOntem: seg.continuaDeOntem,
        continuaAmanha: seg.continuaAmanha,
        resposta: minhas.get(`${e.id}|${o.dia}`) ?? null,
      })),
    ),
  )
}

type LinhaMeta = {
  id: string
  usuario_id: string
  titulo: string
  descricao: string | null
  prazo: string
  concluida: boolean
  frente_vinculada: string | null
}

export function itensDeMetas(
  metas: LinhaMeta[],
  { meuId, vencida, nomeDe }: { meuId: string; vencida: (m: LinhaMeta) => boolean; nomeDe: (id: string) => string },
): ItemAgenda[] {
  return metas.map((m) => ({
    id: `meta-${m.id}`,
    origem: "meta" as const,
    titulo: m.titulo,
    dia: m.prazo.slice(0, 10),
    hora: null,
    descricao: m.descricao,
    rotulo: m.usuario_id === meuId ? "Sua meta" : `Meta de ${nomeDe(m.usuario_id)}`,
    frente: m.frente_vinculada,
    atrasada: vencida(m),
    concluida: m.concluida,
    href: "/membros/metas",
    meu: m.usuario_id === meuId,
    inicioMin: null,
    fimMin: null,
  }))
}

type LinhaSprint = {
  id: string
  frente: string
  titulo: string
  status: string
  data_inicio: string | null
  data_fim: string | null
  responsavel_id: string | null
}

/**
 * Sprint não vira barra de vários dias: um sprint de oito semanas repetiria o
 * mesmo chip em 56 células. O que se age em cima são as duas pontas — quando
 * começa e quando entrega — e é só nelas que o sprint aparece.
 */
export function itensDeSprints(sprints: LinhaSprint[], ctx: Contexto): ItemAgenda[] {
  const dentro = (d: string) => d >= ctx.de && d <= ctx.ate
  return sprints.flatMap((sp) => {
    const inicio = sp.data_inicio?.slice(0, 10) ?? null
    const fim = sp.data_fim?.slice(0, 10) ?? null
    const pontas: { dia: string; quando: string }[] = []
    if (inicio && fim && inicio === fim) pontas.push({ dia: inicio, quando: "início e entrega" })
    else {
      if (inicio) pontas.push({ dia: inicio, quando: "início" })
      if (fim) pontas.push({ dia: fim, quando: "entrega" })
    }
    return pontas
      .filter((p) => dentro(p.dia))
      .map<ItemAgenda>((p) => ({
        id: `sprint-${sp.id}-${p.quando}`,
        origem: "sprint",
        titulo: sp.titulo,
        dia: p.dia,
        hora: null,
        descricao: null,
        rotulo: `Sprint · ${p.quando} · ${sp.status}`,
        frente: sp.frente,
        concluida: sp.status === "Concluído",
        href: hrefDoSprint(sp.frente, sp.id),
        meu: sp.responsavel_id === ctx.meuId,
        inicioMin: null,
        fimMin: null,
      }))
  })
}

type LinhaModulo = { id: string; nivel: string; titulo: string; prazo_conclusao: string | null }

export function itensDeModulos(modulos: LinhaModulo[], concluidos: Set<string>, ctx: Contexto): ItemAgenda[] {
  return modulos
    .filter((m) => m.prazo_conclusao && m.prazo_conclusao.slice(0, 10) >= ctx.de && m.prazo_conclusao.slice(0, 10) <= ctx.ate)
    .map<ItemAgenda>((m) => ({
      id: `modulo-${m.id}`,
      origem: "modulo",
      titulo: m.titulo,
      dia: (m.prazo_conclusao as string).slice(0, 10),
      hora: null,
      descricao: null,
      rotulo: `Academia · ${m.nivel}`,
      frente: null,
      concluida: concluidos.has(m.id),
      href: "/membros/aprendizagem",
      inicioMin: null,
      fimMin: null,
    }))
}

// -----------------------------------------------------------------------------
// Filtro e ordem
// -----------------------------------------------------------------------------

export type Filtros = {
  frente: string | null
  tipo: string | null
  q: string
  meu: boolean
  sem: Camada[]
}

const ORIGEM_DA_CAMADA: Record<Camada, ItemAgenda["origem"]> = { metas: "meta", sprints: "sprint", academia: "modulo" }
const PESO_DA_ORIGEM: Record<ItemAgenda["origem"], number> = { evento: 0, meta: 1, sprint: 2, modulo: 3 }

export function filtrarItens(itens: ItemAgenda[], f: Filtros) {
  const escondidas = new Set(f.sem.map((c) => ORIGEM_DA_CAMADA[c]))

  return itens.filter((i) => {
    if (escondidas.has(i.origem)) return false
    // Item sem frente é da entidade inteira e passa em todo filtro de frente.
    if (f.frente && i.frente && i.frente !== f.frente) return false
    // Filtrar por tipo é pedir só aquele tipo de EVENTO: meta e sprint saem.
    if (f.tipo && (i.origem !== "evento" || i.tipo !== f.tipo)) return false
    if (f.q && !combinaBusca([i.titulo, i.descricao, i.local, i.rotulo, i.frente], f.q)) return false
    // "Só o meu": evento a que eu respondi vou/talvez, meta minha, sprint em que sou responsável.
    // Módulo da Academia é de todos os membros, então fica.
    if (f.meu) {
      if (i.origem === "evento") return i.resposta === "vou" || i.resposta === "talvez"
      if (i.origem === "meta" || i.origem === "sprint") return Boolean(i.meu)
    }
    return true
  })
}

/** Por dia; no dia, o que não tem hora primeiro, depois por horário; empate pela origem e pelo título. */
export function ordenarItens(itens: ItemAgenda[]) {
  return [...itens].sort(
    (a, b) =>
      a.dia.localeCompare(b.dia) ||
      Number(a.inicioMin != null) - Number(b.inicioMin != null) ||
      (a.inicioMin ?? 0) - (b.inicioMin ?? 0) ||
      PESO_DA_ORIGEM[a.origem] - PESO_DA_ORIGEM[b.origem] ||
      a.titulo.localeCompare(b.titulo, "pt-BR"),
  )
}

/** Dias de [de, ate] inclusive, como chaves. */
export function diasDoIntervalo(de: string, ate: string) {
  const dias: string[] = []
  for (let n = numeroDoDia(de); n <= numeroDoDia(ate); n++) dias.push(diaDoNumero(n))
  return dias
}
