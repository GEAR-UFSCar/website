import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { EventoForm } from "@/components/evento-form"
import { CalendarioClean, type Prazo } from "@/components/calendario-clean"
import { Surge } from "@/components/surge"
import { PageHeader } from "@/components/membros/page-header"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { FRENTES, temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { hojeISO, horaGear, inicioDeHoje, inicioDoDiaGear, saudacao } from "@/lib/datas"
import { COLUNAS_META, estaVencida, type Meta } from "@/lib/metas"
import {
  chaveDeDiaValida,
  chaveDeMesValida,
  chaveDoTimestamp,
  intervaloDaGrade,
  mesDaChave,
  visaoValida,
  type ItemAgenda,
} from "@/lib/agenda"
import { paginaMembrosLarga } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Calendário | GEAR",
  robots: { index: false, follow: false },
}

type Evento = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  data_inicio: string
  data_fim: string | null
  frente_vinculada: string | null
}

/** Quantos cards de prazo cabem no topo. Três é uma linha no desktop. */
const PRAZOS_NO_TOPO = 3

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; mes?: string; dia?: string; frente?: string }>
}) {
  const { user, perfil } = await exigirMembroAprovado()
  // Portão só da tela; a RLS de 008 é quem barra de fato.
  const podeEscrever = temCargo(perfil?.cargo)

  const params = await searchParams
  const hoje = hojeISO()

  /*
   * Estado da tela inteiro na URL. Sem `visao`, um link antigo com `?mes=`
   * continua abrindo o mês, como sempre abriu; sem nada, abre a semana — que
   * é a pergunta mais comum ("o que tem essa semana?").
   */
  const visao = visaoValida(params.visao, params.mes ? "mes" : "semana")
  const frente = (FRENTES as readonly string[]).includes(params.frente ?? "") ? (params.frente as string) : null

  let dia = chaveDeDiaValida(params.dia, hoje)
  if (visao === "mes" && params.mes) {
    const mesPedido = chaveDeMesValida(params.mes, mesDaChave(hoje))
    dia = mesDaChave(hoje) === mesPedido ? hoje : `${mesPedido}-01`
  }
  const mes = mesDaChave(dia)

  /*
   * A consulta cobre sempre a GRADE do mês de `dia`, qualquer que seja a
   * visão: o mini-calendário da lateral marca os dias com compromisso, e a
   * semana e o dia de referência estão sempre dentro dessa grade. A grade, e
   * não o mês, porque a primeira e a última semana trazem dias do mês
   * vizinho, e eles são células reais da tela.
   */
  const { primeira, ultima } = intervaloDaGrade(mes)
  // Limites em Brasília: meia-noite local do servidor (UTC) cortaria os
  // eventos das 21h em diante na última noite da grade.
  const inicio = inicioDoDiaGear(primeira)
  const fimExclusivo = new Date(Date.parse(inicioDoDiaGear(ultima)) + 24 * 60 * 60 * 1000).toISOString()

  const supabase = await createClient()

  /*
   * Três consultas, nenhum join — o mesmo motivo do mural e de /membros/metas:
   * a FK aponta para auth.users, não para perfis, e o PostgREST não tem
   * relação para embutir.
   *
   * Em `metas` não há filtro de dono: a RLS da 017 já devolve exatamente as
   * minhas (privadas inclusive) mais as públicas dos outros. Repetir a regra
   * aqui seria uma segunda definição do mesmo acesso, livre para divergir.
   */
  const [
    { data: eventosData, error: erroEventos },
    { data: metasData, error: erroMetas },
    { data: pessoas },
    { data: prazosEventosData },
    { data: prazosMetasData },
  ] = await Promise.all([
      supabase
        .from("eventos")
        .select("id, titulo, descricao, tipo, data_inicio, data_fim, frente_vinculada")
        .gte("data_inicio", inicio)
        .lt("data_inicio", fimExclusivo)
        .order("data_inicio", { ascending: true }),
      supabase
        .from("metas")
        .select(COLUNAS_META)
        .gte("prazo", primeira)
        .lte("prazo", ultima)
        .order("prazo", { ascending: true }),
      supabase.from("perfis").select("id, nome_completo"),
      /*
       * Cards de prazo: os próximos da entidade e as MINHAS metas abertas,
       * independentes do período na tela — o prazo de sexta que vem tem de
       * aparecer mesmo com a semana passada aberta. Pede-se um pouco mais que
       * o necessário porque o filtro de frente corta depois, em memória.
       * As metas públicas dos outros ficam de fora: já estão na grade, e aqui
       * virariam ruído sobre o que é seu para entregar.
       */
      supabase
        .from("eventos")
        .select("id, titulo, data_inicio, frente_vinculada")
        .eq("tipo", "Prazo")
        .gte("data_inicio", inicioDeHoje())
        .order("data_inicio", { ascending: true })
        .limit(PRAZOS_NO_TOPO * 3),
      supabase
        .from("metas")
        .select("id, titulo, prazo, frente_vinculada")
        .eq("usuario_id", user.id)
        .eq("concluida", false)
        .gte("prazo", hoje)
        .order("prazo", { ascending: true })
        .limit(PRAZOS_NO_TOPO * 3),
    ])

  const eventos = (eventosData ?? []) as Evento[]
  const metas = (metasData ?? []) as Meta[]

  const nomes = new Map(
    ((pessoas ?? []) as { id: string; nome_completo: string | null }[])
      .filter((p) => p.nome_completo?.trim())
      .map((p) => [p.id, p.nome_completo as string]),
  )

  /** Primeiro nome basta na etiqueta: o painel é estreito e o dia tem dono. */
  const primeiroNome = (id: string) => (nomes.get(id) ?? "Membro").split(" ")[0]

  const itens: ItemAgenda[] = [
    ...eventos.map((e) => ({
      id: `evento-${e.id}`,
      origem: "evento" as const,
      titulo: e.titulo,
      dia: chaveDoTimestamp(e.data_inicio),
      hora: horaGear(e.data_inicio),
      descricao: e.descricao,
      rotulo: e.tipo,
      frente: e.frente_vinculada,
    })),
    ...metas.map((m) => ({
      id: `meta-${m.id}`,
      origem: "meta" as const,
      titulo: m.titulo,
      dia: m.prazo.slice(0, 10),
      hora: null,
      descricao: m.descricao,
      rotulo: m.usuario_id === user.id ? "Sua meta" : `Meta de ${primeiroNome(m.usuario_id)}`,
      frente: m.frente_vinculada,
      atrasada: estaVencida(m),
      concluida: m.concluida,
    })),
  ].sort((a, b) => {
    // Dentro do dia: evento antes de meta (evento tem hora marcada, meta é
    // prazo do dia inteiro), e evento por horário.
    if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
    if (a.origem !== b.origem) return a.origem === "evento" ? -1 : 1
    return (a.hora ?? "").localeCompare(b.hora ?? "")
  })

  /*
   * Filtro de frente em memória: o volume de uma grade é pequeno, e fazer
   * aqui mantém UMA regra para eventos, metas e prazos. Item geral (sem
   * frente) passa sempre — reunião geral é da entidade inteira.
   */
  const daFrente = (f: string | null) => !frente || !f || f === frente
  const visiveis = itens.filter((i) => daFrente(i.frente))

  type LinhaPrazoEvento = { id: string; titulo: string; data_inicio: string; frente_vinculada: string | null }
  type LinhaPrazoMeta = { id: string; titulo: string; prazo: string; frente_vinculada: string | null }

  const prazos: Prazo[] = [
    ...((prazosEventosData ?? []) as LinhaPrazoEvento[]).map((e) => ({
      id: `evento-${e.id}`,
      titulo: e.titulo,
      dia: chaveDoTimestamp(e.data_inicio),
      rotulo: "Prazo da GEAR",
      frente: e.frente_vinculada,
    })),
    ...((prazosMetasData ?? []) as LinhaPrazoMeta[]).map((m) => ({
      id: `meta-${m.id}`,
      titulo: m.titulo,
      dia: m.prazo.slice(0, 10),
      rotulo: "Sua meta",
      frente: m.frente_vinculada,
    })),
  ]
    .filter((p) => daFrente(p.frente))
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .slice(0, PRAZOS_NO_TOPO)

  return (
    <section className={paginaMembrosLarga}>
      <PageHeader titulo="Calendário">
        Reuniões, sprints e prazos da GEAR junto com as suas metas e as que a equipe tornou
        públicas, por semana, dia ou mês. Para registrar uma obrigação sua, crie uma meta; criar
        evento da entidade é de quem tem cargo.
      </PageHeader>

      {erroEventos && (
        <ErroDados titulo="CALENDÁRIO INDISPONÍVEL" erro={erroEventos} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/008_eventos_avisos_sprints.sql</code> no
          SQL Editor do painel.
        </ErroDados>
      )}

      {/* Metas são complemento: sem a 017, a grade continua de pé só com eventos. */}
      {erroMetas && (
        <ErroDados titulo="METAS FORA DA GRADE" erro={erroMetas} className="mt-6 max-w-2xl">
          A grade segue mostrando os eventos. Para as metas, rode{" "}
          <code>supabase/017_metas.sql</code>.
        </ErroDados>
      )}

      <Surge className="mt-12">
        <CalendarioClean
          visao={visao}
          dia={dia}
          hoje={hoje}
          frente={frente}
          itens={visiveis}
          prazos={prazos}
          saudacao={`${saudacao()}, ${perfil?.nome_completo?.trim().split(" ")[0] || "membro"}`}
          podeCriarEvento={podeEscrever}
        />
      </Surge>

      {podeEscrever && (
        <div id="novo-evento" className="mt-20 max-w-4xl scroll-mt-28">
          <EventoForm usuarioId={user.id} />
        </div>
      )}

      <div className="mt-16 flex flex-wrap gap-5">
        <Link
          href="/membros/metas"
          data-cursor-hover
          className={`inline-block ${botaoSecundario}`}
        >
          Minhas metas
        </Link>
      </div>
    </section>
  )
}
