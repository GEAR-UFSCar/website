import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { PageHeader } from "@/components/membros/page-header"
import { PainelOrganizacao } from "@/components/painel-organizacao"
import {
  BlocoAcademia,
  BlocoAgora,
  BlocoAvisos,
  BlocoPedeResposta,
  BlocoPendencias,
  BlocoPrimeirosPassos,
  BlocoPrazos,
  FaixaNumeros,
  ProximaAcaoCard,
  type AvisoResumo,
  type ModuloAtual,
} from "@/components/membros/hoje"
import { detalheTecnico, mensagemSegura } from "@/lib/erros"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import Link from "next/link"

import { Secao } from "@/components/membros/secao"
import { dataDoDia, diaGear, hojeISO, saudacao } from "@/lib/datas"
import { eFinanceiro, hrefDoSprint, primeiroNome, rotaDaFrente, temCargo } from "@/lib/administracao"
import { eventoVisivel, maisDias, ordenarSprints, pedidosDeResposta, prazosDaSemana, primeirosPassos, proximaAcao, type ItemPrazo } from "@/lib/hoje"
import { MODELOS } from "@/lib/formularios"
import { COLUNAS_SPRINT, type Sprint } from "@/lib/sprints"
import { COLUNAS_META, type Meta } from "@/lib/metas"
import { buscarEventos, itensDeEventos } from "@/lib/calendario-dados"
import { continuarEstudo, diasEstudados, ordenarLicoes, sequenciaDias } from "@/lib/academia"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Hoje | GEAR",
  robots: { index: false, follow: false },
}

export default async function HojePage() {
  const user = await exigirUsuario()
  const { perfil, erro } = await getPerfil()

  // Portões: mesma régua de app/membros/layout.tsx.
  if (!erro && !perfil?.nome_completo?.trim()) redirect("/membros/completar-perfil")
  if (!erro && !perfil?.aprovado) redirect("/membros/aguardando")

  if (erro) {
    // Vai para os logs da Vercel; na tela só a frase segura.
    console.error("[membros] getPerfil falhou", erro.code, erro.message)
    return (
      <section className={paginaMembros}>
        <Aviso titulo="PERFIL INDISPONÍVEL">
          {mensagemSegura(erro)}
          {detalheTecnico(erro) && <code className="mt-2 block break-words">{detalheTecnico(erro)}</code>}
        </Aviso>
      </section>
    )
  }

  const frente = perfil?.frente?.trim() || null
  const comCargo = temCargo(perfil?.cargo)
  // Sem frente definida, o atalho abre o seletor em vez de cair em Competição.
  const rotaFrente = frente ? rotaDaFrente(frente) : "/membros/frente"

  const hoje = hojeISO()
  const ate = maisDias(hoje, 7)

  const supabase = await createClient()
  const agora = new Date().toISOString()
  const decideCompras = eFinanceiro(perfil?.cargo)
  const [
    sprintsR, eventosR, metasR, avisosR, modulosR, progressoR, aprovacoesR, bloqueadosR, tarefasR,
    pesquisasR, respondiR, devolvidosR, emprestimosR, registrosR, comprasR, termoR, diarioR, licoesR, feitasR,
  ] = await Promise.all([
    // Os meus e os da minha trilha: desde a 040 quem é da trilha escreve em todos eles.
    // `frente` vem do CHECK de perfis (três valores fixos); as aspas cobrem o "ç".
    supabase
      .from("sprints")
      .select(COLUNAS_SPRINT)
      .or(frente ? `responsavel_id.eq.${user.id},frente.eq."${frente}"` : `responsavel_id.eq.${user.id}`)
      .neq("status", "Concluído"),
    // Já expande a repetição: a reunião semanal de toda quarta aparece sem estar "na janela" no banco.
    buscarEventos(supabase, hoje, ate),
    supabase.from("metas").select(COLUNAS_META).eq("usuario_id", user.id).eq("concluida", false).lte("prazo", ate),
    supabase
      .from("avisos")
      .select("id, titulo, conteudo, fixado")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("modulos").select("id, titulo"),
    supabase.from("progresso").select("concluido_em, enviada_em").eq("usuario_id", user.id),
    comCargo
      ? supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false).not("nome_completo", "is", null)
      : Promise.resolve({ count: null, error: null }),
    comCargo
      ? supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "Bloqueado")
      : Promise.resolve({ count: null, error: null }),
    // 033: tarefas de sprint atribuídas a mim e ainda abertas
    supabase
      .from("sprint_tarefas")
      .select("id, titulo, prazo, sprint:sprints(id, titulo, frente)")
      .eq("responsavel_id", user.id)
      .eq("feita", false)
      .order("prazo", { nullsFirst: false })
      .limit(8),
    // 035: o que espera uma resposta minha. Sem a migração, cada consulta erra e o item some.
    supabase.from("pesquisas").select("id, abre_em, fecha_em").gt("fecha_em", agora),
    supabase.from("pesquisa_participacao").select("pesquisa_id").eq("usuario_id", user.id),
    supabase.from("registros").select("id", { count: "exact", head: true }).eq("autor_id", user.id).eq("status", "devolvido"),
    supabase.from("emprestimos").select("prazo").eq("usuario_id", user.id).is("devolvido_em", null),
    // aprovar é de outra pessoa: o que eu enviei não conta na minha fila (mesma régua de /membros/formularios)
    comCargo
      ? supabase
          .from("registros")
          .select("id", { count: "exact", head: true })
          .eq("status", "enviado")
          .neq("autor_id", user.id)
          .in("modelo", MODELOS.filter((m) => m.aprovacao).map((m) => m.id))
      : Promise.resolve({ count: null, error: null }),
    decideCompras
      ? supabase.from("pedidos_compra").select("id", { count: "exact", head: true }).eq("status", "Aguardando aprovação")
      : Promise.resolve({ count: null, error: null }),
    // Primeiros passos: Termo enviado e primeiro registro no diário de um sprint.
    supabase
      .from("registros")
      .select("id", { count: "exact", head: true })
      .eq("autor_id", user.id)
      .eq("modelo", "termo_compromisso")
      .neq("status", "rascunho"),
    supabase.from("sprint_atualizacoes").select("id", { count: "exact", head: true }).eq("autor_id", user.id),
    // 047: lições, para o "continuar" e a sequência de dias
    supabase.from("licoes").select("id, modulo_id, ordem, titulo"),
    supabase.from("licoes_feitas").select("licao_id, feita_em").eq("usuario_id", user.id).order("feita_em", { ascending: false }),
  ])
  const pedidos = pedidosDeResposta({
    agora: Date.parse(agora),
    hoje,
    pesquisas: pesquisasR.error ? null : (pesquisasR.data ?? []),
    respondi: (respondiR.data ?? []).map((p) => p.pesquisa_id),
    devolvidos: devolvidosR.error ? null : devolvidosR.count,
    emprestimos: emprestimosR.error ? null : (emprestimosR.data ?? []),
  })
  const minhasTarefas = (tarefasR.data ?? []) as unknown as {
    id: string
    titulo: string
    prazo: string | null
    sprint: { id: string; titulo: string; frente: string } | null
  }[]

  const sprintsAbertos = ordenarSprints((sprintsR.data ?? []) as unknown as Sprint[])
  // A próxima ação só cobra o que é meu; os da trilha aparecem em Agora sem cobrança.
  const sprints = sprintsAbertos.filter((s) => s.responsavel?.id === user.id)

  // Evento da minha frente ou sem frente; as metas já são só minhas.
  const itens: ItemPrazo[] = [
    ...itensDeEventos(eventosR.eventos, [], { de: hoje, ate, meuId: user.id })
      .filter((e) => eventoVisivel(e.frente, frente))
      .map((e) => ({
        id: e.id,
        origem: "evento" as const,
        titulo: e.titulo,
        dia: e.dia,
        hora: e.hora,
        // Abre o painel do evento, no dia dele, e não só a tela do calendário.
        href: `/membros/calendario?visao=dia&dia=${e.dia}&evento=${e.eventoId}&ocorrencia=${e.ocorrencia}`,
        detalhe: e.tipo ?? e.rotulo,
      })),
    ...((metasR.data ?? []) as Meta[]).map((m) => ({
      id: `meta-${m.id}`,
      origem: "meta" as const,
      titulo: m.titulo,
      dia: m.prazo.slice(0, 10),
      hora: null,
      href: "/membros/metas",
      detalhe: "Sua meta",
    })),
  ]
  const { atrasados, proximos } = prazosDaSemana(itens, hoje, ate)

  const errosPrazos = [
    ...(eventosR.erro
      ? [{ titulo: "EVENTOS INDISPONÍVEIS", erro: eventosR.erro, dica: "Rode supabase/008_eventos_avisos_sprints.sql." }]
      : []),
    ...(metasR.error ? [{ titulo: "METAS INDISPONÍVEIS", erro: metasR.error, dica: "Rode supabase/017_metas.sql." }] : []),
  ]

  // Academia (047): a próxima lição de onde a pessoa parou, a mesma da página da Academia.
  let moduloAtual: ModuloAtual | null = null
  if (!licoesR.error && !feitasR.error && !modulosR.error) {
    const licoes = (licoesR.data ?? []).sort(ordenarLicoes)
    const seguir = continuarEstudo(licoes, feitasR.data ?? [])
    if (seguir) {
      const doModulo = licoes.filter((l) => l.modulo_id === seguir.moduloId)
      const ids = new Set((feitasR.data ?? []).map((f) => f.licao_id))
      moduloAtual = {
        competencia: (modulosR.data ?? []).find((m) => m.id === seguir.moduloId)?.titulo ?? "Competência",
        licao: seguir.licao.titulo,
        href: seguir.href,
        feitas: doModulo.filter((l) => ids.has(l.id)).length,
        total: doModulo.length,
      }
    }
  }
  // Sem as consultas, "0 dias" seria dado errado: o número vira "—".
  const sequencia = feitasR.error || progressoR.error
    ? null
    : sequenciaDias(diasEstudados([...(feitasR.data ?? []).map((f) => f.feita_em), ...(progressoR.data ?? []).map((p) => p.enviada_em)], diaGear), hoje)

  const hrefSprint = (id: string) => {
    const sprint = sprintsAbertos.find((x) => x.id === id)
    return hrefDoSprint(sprint?.frente, id)
  }
  const acao = proximaAcao({
    sprints,
    atrasados,
    proximos,
    hoje,
    moduloAtual: moduloAtual ? { titulo: `${moduloAtual.competencia} · ${moduloAtual.licao}`, href: moduloAtual.href } : null,
  })

  const passos = primeirosPassos({
    temFrente: Boolean(frente),
    termo: termoR.error ? null : (termoR.count ?? 0),
    modulosConcluidos: progressoR.error ? null : (progressoR.data ?? []).filter((p) => p.concluido_em).length,
    registrouNoSprint: diarioR.error ? null : (diarioR.count ?? 0),
  })

  const numeros = [
    { rotulo: frente ? "Sprints da trilha" : "Sprints abertos", valor: String(sprintsAbertos.length), href: rotaFrente },
    { rotulo: "Prazos em 7 dias", valor: String(proximos.length), href: "/membros/calendario" },
    { rotulo: "Atrasados", valor: String(atrasados.length), href: "/membros/metas", alerta: atrasados.length > 0 },
    { rotulo: "Dias estudando", valor: sequencia === null ? "—" : String(sequencia), href: "/membros/aprendizagem" },
  ]

  return (
    <section className={paginaMembros}>
      <PageHeader titulo={`${saudacao()}, ${primeiroNome(perfil?.nome_completo)}`}>
        {frente ? `Trilha ${frente}.` : "Você ainda não tem uma trilha definida."} O que pede a sua atenção agora.
      </PageHeader>

      {/* 044: principal, reserva, Academia no ciclo e alertas que me envolvem. */}
      <PainelOrganizacao usuarioId={user.id} perfil={perfil} />

      {/* Primeiro a resposta; depois o contexto. */}
      <ProximaAcaoCard acao={acao} hoje={hoje} hrefSprint={hrefSprint} rotaFrente={rotaFrente} />
      <FaixaNumeros itens={numeros} />

      <div className="mt-2 grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <BlocoAgora sprints={sprintsAbertos} meuId={user.id} frente={frente} erro={sprintsR.error} rotaFrente={rotaFrente} />
          {minhasTarefas.length > 0 && (
            <Secao titulo="Minhas tarefas">
              <ul className="border border-linha">
                {minhasTarefas.map((t) => (
                  <li key={t.id} className="border-b border-linha last:border-b-0">
                    <Link
                      href={t.sprint ? hrefDoSprint(t.sprint.frente, t.sprint.id) : rotaFrente}
                      className="flex flex-wrap items-baseline gap-x-3 px-5 py-3 hover:bg-[var(--gear-navy)]"
                    >
                      <span className="flex-1 font-sans text-sm">{t.titulo}</span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
                          t.prazo && t.prazo < hoje ? "text-[var(--gear-amber)]" : "text-muted-foreground"
                        }`}
                      >
                        {t.sprint?.titulo}
                        {t.prazo && ` · ${dataDoDia(t.prazo)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Secao>
          )}
          <BlocoPrazos atrasados={atrasados} proximos={proximos} hoje={hoje} erros={errosPrazos} />
        </div>
        <div>
          <BlocoPrimeirosPassos passos={passos} />
          <BlocoPedeResposta pedidos={pedidos} />
          <BlocoAvisos avisos={(avisosR.data ?? []) as unknown as AvisoResumo[]} erro={avisosR.error} />
          {moduloAtual && <BlocoAcademia atual={moduloAtual} />}
          {comCargo && (
            <BlocoPendencias
              aprovacoes={aprovacoesR.error ? null : (aprovacoesR.count ?? 0)}
              bloqueados={bloqueadosR.error ? null : (bloqueadosR.count ?? 0)}
              registros={registrosR.error ? null : (registrosR.count ?? 0)}
              compras={decideCompras ? (comprasR.error ? null : (comprasR.count ?? 0)) : undefined}
            />
          )}
        </div>
      </div>
    </section>
  )
}
