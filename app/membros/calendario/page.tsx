import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { EventoForm } from "@/components/evento-form"
import { EventoPainel, PainelCasca } from "@/components/evento-painel"
import { CalendarioAssinatura } from "@/components/calendario-assinatura"
import { CalendarioClean, type Prazo } from "@/components/calendario-clean"
import { Surge } from "@/components/surge"
import { PageHeader } from "@/components/membros/page-header"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { FRENTES, TIPOS_EVENTO, temCargo } from "@/lib/administracao"
import { botaoSecundario, paginaMembrosLarga } from "@/lib/ui"
import { hojeISO, saudacao } from "@/lib/datas"
import { SITE_URL } from "@/lib/site"
import { COLUNAS_META, estaVencida, type Meta } from "@/lib/metas"
import {
  camadasEscondidas,
  chaveDeDiaValida,
  chaveDeMesValida,
  comEstado,
  intervaloDaGrade,
  mesDaChave,
  visaoValida,
  type EstadoCalendario,
} from "@/lib/agenda"
import {
  ehDiaValido,
  ocorrenciaEm,
  ocorrencias,
  partesGear,
  respostaValida,
  somarDias,
  type EventoCal,
  type Ocorrencia,
  type RespostaPresenca,
} from "@/lib/calendario"
import {
  buscarEventos,
  buscarPresencas,
  filtrarItens,
  itensDeEventos,
  itensDeMetas,
  itensDeModulos,
  itensDeSprints,
  ordenarItens,
} from "@/lib/calendario-dados"

export const metadata: Metadata = {
  title: "Calendário | GEAR",
  robots: { index: false, follow: false },
}

/** Quantos cards de prazo cabem no topo. Três é uma linha no desktop. */
const PRAZOS_NO_TOPO = 3
/** Até onde, à frente de hoje, os cards de prazo olham. */
const HORIZONTE_DOS_PRAZOS = 90
/** Quantos dias a visão Agenda cobre quando não há busca. */
const DIAS_DA_AGENDA = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Busca = {
  visao?: string
  mes?: string
  dia?: string
  frente?: string
  tipo?: string
  q?: string
  meu?: string
  sem?: string
  evento?: string
  ocorrencia?: string
  novo?: string
  editar?: string
}

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<Busca> }) {
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
  const tipo = (TIPOS_EVENTO as readonly string[]).includes(params.tipo ?? "") ? (params.tipo as string) : null
  const q = (params.q ?? "").trim().slice(0, 80)
  const meu = params.meu === "1"
  const sem = camadasEscondidas(params.sem)

  let dia = chaveDeDiaValida(params.dia, hoje)
  if (visao === "mes" && params.mes) {
    const mesPedido = chaveDeMesValida(params.mes, mesDaChave(hoje))
    dia = mesDaChave(hoje) === mesPedido ? hoje : `${mesPedido}-01`
  }
  const mes = mesDaChave(dia)

  const estado: EstadoCalendario = { visao, dia, frente, tipo, q: q || null, meu, sem }
  const href = comEstado(estado)

  /*
   * A janela é o que a tela desenha. Semana, Dia e Mês olham a GRADE do mês de
   * `dia` (a primeira e a última semana trazem dias do mês vizinho, e eles são
   * células reais). A Agenda olha para a frente; com busca, olha 3 meses para
   * trás e um ano para a frente, porque quem procura "assembleia" não quer
   * saber em que semana ela estava.
   */
  const grade = intervaloDaGrade(mes)
  const janela =
    visao === "agenda"
      ? q
        ? { de: somarDias(dia, -90), ate: somarDias(dia, 365) }
        : { de: dia, ate: somarDias(dia, DIAS_DA_AGENDA - 1) }
      : { de: grade.primeira, ate: grade.ultima }

  // Os cards de prazo olham a partir de hoje, seja qual for o período na tela.
  const deBusca = janela.de < hoje ? janela.de : hoje
  const prazoAte = somarDias(hoje, HORIZONTE_DOS_PRAZOS)
  const ateBusca = janela.ate > prazoAte ? janela.ate : prazoAte

  const supabase = await createClient()

  /*
   * Consultas independentes, nenhum join — o mesmo motivo do mural e de
   * /membros/metas: a FK aponta para auth.users, não para perfis, e o PostgREST
   * não tem relação para embutir.
   *
   * Em `metas` não há filtro de dono: a RLS da 017 já devolve exatamente as
   * minhas (privadas inclusive) mais as públicas dos outros. Repetir a regra
   * aqui seria uma segunda definição do mesmo acesso, livre para divergir.
   *
   * Sprints, Academia e assinatura são complementos: se a tabela não existe,
   * a camada some e o resto do calendário segue de pé.
   */
  const [
    resultadoEventos,
    resultadoPresencas,
    { data: metasData, error: erroMetas },
    { data: pessoas },
    { data: prazosMetasData },
    { data: sprintsData },
    { data: modulosData },
    { data: progressoData },
    assinaturaR,
  ] = await Promise.all([
    buscarEventos(supabase, deBusca, ateBusca),
    buscarPresencas(supabase, deBusca, ateBusca),
    supabase.from("metas").select(COLUNAS_META).gte("prazo", janela.de).lte("prazo", janela.ate).order("prazo", { ascending: true }),
    supabase.from("perfis").select("id, nome_completo"),
    supabase
      .from("metas")
      .select("id, titulo, prazo, frente_vinculada")
      .eq("usuario_id", user.id)
      .eq("concluida", false)
      .gte("prazo", hoje)
      .order("prazo", { ascending: true })
      .limit(PRAZOS_NO_TOPO * 3),
    supabase
      .from("sprints")
      .select("id, frente, titulo, status, data_inicio, data_fim, responsavel_id")
      .or("data_inicio.not.is.null,data_fim.not.is.null"),
    supabase.from("modulos").select("id, nivel, titulo, prazo_conclusao").not("prazo_conclusao", "is", null),
    supabase.from("progresso").select("modulo_id, concluido_em").eq("usuario_id", user.id),
    supabase.from("calendario_assinaturas").select("token").eq("usuario_id", user.id).maybeSingle(),
  ])

  const { eventos, migrado, erro: erroEventos } = resultadoEventos
  const metas = (metasData ?? []) as Meta[]

  const nomes = new Map(
    ((pessoas ?? []) as { id: string; nome_completo: string | null }[])
      .filter((p) => p.nome_completo?.trim())
      .map((p) => [p.id, p.nome_completo as string]),
  )
  /** Primeiro nome basta na etiqueta: o painel é estreito e o dia tem dono. */
  const primeiroNome = (id: string) => (nomes.get(id) ?? "Membro").split(" ")[0]

  const concluidos = new Set(
    ((progressoData ?? []) as { modulo_id: string; concluido_em: string | null }[])
      .filter((p) => p.concluido_em)
      .map((p) => p.modulo_id),
  )

  const ctx = { de: janela.de, ate: janela.ate, meuId: user.id }
  const todos = [
    ...itensDeEventos(eventos, resultadoPresencas.presencas, ctx),
    ...itensDeMetas(metas, { meuId: user.id, vencida: estaVencida, nomeDe: primeiroNome }),
    ...itensDeSprints((sprintsData ?? []) as Parameters<typeof itensDeSprints>[0], ctx),
    ...itensDeModulos((modulosData ?? []) as Parameters<typeof itensDeModulos>[0], concluidos, ctx),
  ]
  const itens = ordenarItens(filtrarItens(todos, { frente, tipo, q, meu, sem }))
  // Pontinhos do mini-calendário: só os dias do mês mostrado.
  const marcados = new Set(itens.filter((i) => mesDaChave(i.dia) === mes).map((i) => i.dia))

  /*
   * Cards de prazo: os próximos Prazos da entidade e as MINHAS metas abertas,
   * independentes do período na tela — o prazo de sexta que vem tem de
   * aparecer mesmo com a semana passada aberta. As metas públicas dos outros
   * ficam de fora: já estão na grade, e aqui virariam ruído sobre o que é seu
   * para entregar. Item geral (sem frente) passa em qualquer filtro de frente.
   */
  const daFrente = (f: string | null) => !frente || !f || f === frente
  type LinhaPrazoMeta = { id: string; titulo: string; prazo: string; frente_vinculada: string | null }
  const prazos: Prazo[] = [
    ...itensDeEventos(
      eventos.filter((e) => e.tipo === "Prazo"),
      resultadoPresencas.presencas,
      { de: hoje, ate: prazoAte, meuId: user.id },
    ).map((i) => ({
      id: i.id,
      titulo: i.titulo,
      dia: i.dia,
      rotulo: "Prazo do GEAR",
      frente: i.frente,
      href: href({ visao: visao === "mes" ? "dia" : visao, dia: i.dia, evento: i.eventoId, ocorrencia: i.ocorrencia }),
    })),
    ...((prazosMetasData ?? []) as LinhaPrazoMeta[]).map((m) => ({
      id: `meta-${m.id}`,
      titulo: m.titulo,
      dia: m.prazo.slice(0, 10),
      rotulo: "Sua meta",
      frente: m.frente_vinculada,
      href: "/membros/metas",
    })),
  ]
    .filter((p) => daFrente(p.frente))
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .slice(0, PRAZOS_NO_TOPO)

  // ------------------------------------------------------------------ Painel
  let selecionado: Ocorrencia | null = null
  let presencasDoEvento: { usuario_id: string; resposta: RespostaPresenca }[] | null = null

  const eventoId = params.evento && UUID.test(params.evento) ? params.evento : null
  if (eventoId) {
    let evento: EventoCal | undefined = eventos.find((e) => e.id === eventoId)
    // Link antigo ou de outro período: o evento pode estar fora do que foi buscado.
    if (!evento) {
      const { data } = await supabase.from("eventos").select("*").eq("id", eventoId).maybeSingle()
      evento = (data as EventoCal | null) ?? undefined
    }
    if (evento) {
      const base = partesGear(evento.data_inicio).dia
      const pedida = ehDiaValido(params.ocorrencia) ? params.ocorrencia : base
      // Só vale como ocorrência o dia em que o evento REALMENTE começa; qualquer outro volta à primeira.
      selecionado = ocorrencias(evento, pedida, pedida).find((o) => o.dia === pedida) ?? ocorrenciaEm(evento, base)

      const { data, error } = await supabase
        .from("eventos_presencas")
        .select("usuario_id, resposta")
        .eq("evento_id", evento.id)
        .eq("dia", selecionado.dia)
      presencasDoEvento = error
        ? null
        : ((data ?? []) as { usuario_id: string; resposta: string }[])
            .map((p) => ({ usuario_id: p.usuario_id, resposta: respostaValida(p.resposta) }))
            .filter((p): p is { usuario_id: string; resposta: RespostaPresenca } => p.resposta !== null)
    }
  }

  const abrirNovo = params.novo === "1" && podeEscrever
  const abrirEdicao = params.editar === "1" && podeEscrever && selecionado !== null

  // Em edição o painel é do formulário; os links de volta levam ao evento.
  const estadoDoPainel: EstadoCalendario = {
    ...estado,
    evento: selecionado?.evento.id ?? null,
    ocorrencia: selecionado?.dia ?? null,
  }

  let painel: React.ReactNode = null
  if (abrirNovo) {
    painel = (
      <PainelCasca estado={estado} rotulo="Novo evento">
        <EventoForm usuarioId={user.id} estado={estado} diaPadrao={dia} migrado={migrado} />
      </PainelCasca>
    )
  } else if (selecionado && abrirEdicao) {
    painel = (
      <PainelCasca estado={estadoDoPainel} rotulo="Editar evento">
        <EventoForm
          usuarioId={user.id}
          estado={estadoDoPainel}
          diaPadrao={selecionado.dia}
          inicial={selecionado.evento}
          migrado={migrado}
        />
      </PainelCasca>
    )
  } else if (selecionado) {
    painel = (
      <EventoPainel
        ocorrencia={selecionado}
        estado={estado}
        usuarioId={user.id}
        podeEscrever={podeEscrever}
        presencas={migrado ? presencasDoEvento : null}
        nomes={nomes}
        criadoPor={selecionado.evento.criado_por ? (nomes.get(selecionado.evento.criado_por) ?? null) : null}
      />
    )
  }

  // ------------------------------------------------------------ Assinatura
  const cabecalhos = await headers()
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host")
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  const origem = host ? `${protocolo}://${host}` : SITE_URL
  const token = (assinaturaR.data as { token: string } | null)?.token ?? null

  return (
    <section className={paginaMembrosLarga}>
      <PageHeader titulo="Calendário">
        Reuniões, sprints, prazos e metas do GEAR num lugar só, por semana, dia, mês ou lista. Diga se vai a cada
        evento, busque o que já passou e assine a agenda no seu próprio calendário. Para registrar uma obrigação sua,
        crie uma meta; criar evento da entidade é de quem tem cargo.
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

      {/* Quem pode agir sobre a migração é quem tem cargo; para os demais o aviso só atrapalharia. */}
      {!migrado && !erroEventos && podeEscrever && (
        <p className="mt-6 max-w-2xl border border-linha p-4 font-sans text-sm font-light text-muted-foreground">
          O calendário está rodando sem os recursos novos (local, link, dia inteiro, repetição, presença e assinatura).
          Para ligá-los, rode <code>supabase/027_calendario_completo.sql</code> no SQL Editor do painel.
        </p>
      )}

      <Surge className="mt-12">
        <CalendarioClean
          estado={estado}
          hoje={hoje}
          itens={itens}
          marcados={marcados}
          prazos={prazos}
          saudacao={`${saudacao()}, ${perfil?.nome_completo?.trim().split(" ")[0] || "membro"}`}
          podeCriarEvento={podeEscrever}
          painelAberto={painel !== null}
          diasDaAgenda={DIAS_DA_AGENDA}
          assinatura={
            <CalendarioAssinatura
              usuarioId={user.id}
              token={token}
              origem={origem}
              indisponivel={Boolean(assinaturaR.error)}
            />
          }
        />
      </Surge>

      {/* Fora do <Surge>: o transform da animação de entrada prenderia o position: fixed da gaveta. */}
      {painel}

      <div className="mt-16 flex flex-wrap gap-5">
        <Link href="/membros/metas" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Minhas metas
        </Link>
      </div>
    </section>
  )
}
