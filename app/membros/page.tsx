import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { PageHeader } from "@/components/membros/page-header"
import {
  BlocoAcademia,
  BlocoAgora,
  BlocoAvisos,
  BlocoPendencias,
  BlocoPrazos,
  type AvisoResumo,
  type ModuloAtual,
} from "@/components/membros/hoje"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { diaGear, hojeISO, horaGear, inicioDoDiaGear, saudacao } from "@/lib/datas"
import { primeiroNome, rotaDaFrente, temCargo } from "@/lib/administracao"
import { maisDias, ordenarSprints, prazosDaSemana, type ItemPrazo } from "@/lib/hoje"
import { COLUNAS_SPRINT, type Sprint } from "@/lib/sprints"
import { COLUNAS_META, type Meta } from "@/lib/metas"
import { COLUNAS_MODULO, montarEstagios, type Modulo, type Progresso } from "@/lib/academia"

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
    return (
      <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
        <Aviso titulo="PERFIL INDISPONÍVEL">
          Não foi possível ler o seu perfil. Se a tabela não existe, rode <code>supabase/001_perfis.sql</code>.
        </Aviso>
      </section>
    )
  }

  const frente = perfil?.frente?.trim() || null
  const comCargo = temCargo(perfil?.cargo)
  const rotaFrente = rotaDaFrente(frente)

  const hoje = hojeISO()
  const ate = maisDias(hoje, 7)
  const inicioJanela = inicioDoDiaGear(hoje)
  const fimJanela = inicioDoDiaGear(maisDias(ate, 1))

  const supabase = await createClient()
  const [sprintsR, eventosR, metasR, avisosR, modulosR, progressoR, aprovacoesR, bloqueadosR] = await Promise.all([
    supabase.from("sprints").select(COLUNAS_SPRINT).eq("responsavel_id", user.id).neq("status", "Concluído"),
    supabase
      .from("eventos")
      .select("id, titulo, tipo, data_inicio, frente_vinculada")
      .gte("data_inicio", inicioJanela)
      .lt("data_inicio", fimJanela)
      .order("data_inicio", { ascending: true }),
    supabase.from("metas").select(COLUNAS_META).eq("usuario_id", user.id).eq("concluida", false).lte("prazo", ate),
    supabase
      .from("avisos")
      .select("id, titulo, conteudo, fixado")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("modulos").select(COLUNAS_MODULO).order("ordem"),
    supabase.from("progresso").select("modulo_id, concluido_em").eq("usuario_id", user.id),
    comCargo
      ? supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false).not("nome_completo", "is", null)
      : Promise.resolve({ count: null, error: null }),
    comCargo
      ? supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "Bloqueado")
      : Promise.resolve({ count: null, error: null }),
  ])

  const sprints = ordenarSprints((sprintsR.data ?? []) as unknown as Sprint[])

  // Evento da minha frente ou sem frente; as metas já são só minhas.
  const itens: ItemPrazo[] = [
    ...((eventosR.data ?? []) as { id: string; titulo: string; tipo: string; data_inicio: string; frente_vinculada: string | null }[])
      .filter((e) => !e.frente_vinculada || e.frente_vinculada === frente)
      .map((e) => ({
        id: `evento-${e.id}`,
        origem: "evento" as const,
        titulo: e.titulo,
        dia: diaGear(e.data_inicio),
        hora: horaGear(e.data_inicio),
        href: "/membros/calendario",
        detalhe: e.tipo,
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
    ...(eventosR.error
      ? [{ titulo: "EVENTOS INDISPONÍVEIS", erro: eventosR.error, dica: "Rode supabase/008_eventos_avisos_sprints.sql." }]
      : []),
    ...(metasR.error ? [{ titulo: "METAS INDISPONÍVEIS", erro: metasR.error, dica: "Rode supabase/017_metas.sql." }] : []),
  ]

  // Academia: primeiro módulo não concluído da trilha, na ordem da formação.
  let moduloAtual: ModuloAtual | null = null
  if (!modulosR.error) {
    const lista = (modulosR.data ?? []) as Modulo[]
    const concluidos = new Set(
      ((progressoR.data ?? []) as Progresso[]).filter((p) => p.concluido_em).map((p) => p.modulo_id),
    )
    const estagios = montarEstagios(lista, concluidos).filter((e) => e.total > 0)
    const trilha = estagios.flatMap((e) => e.modulos)
    const pendente = trilha.find((m) => !concluidos.has(m.id))
    if (pendente) {
      const estagio = estagios.find((e) => e.nivel === pendente.nivel)
      const posicao = (estagio?.modulos.findIndex((m) => m.id === pendente.id) ?? 0) + 1
      const feitos = trilha.filter((m) => concluidos.has(m.id)).length
      moduloAtual = {
        titulo: pendente.titulo,
        nivel: pendente.nivel,
        posicao: `${posicao} de ${estagio?.total ?? 0}`,
        prazo: estagio?.prazo ?? null,
        duracao: pendente.duracao_estimada,
        percentual: trilha.length ? Math.round((feitos / trilha.length) * 100) : 0,
      }
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
      <PageHeader titulo={`${saudacao()}, ${primeiroNome(perfil?.nome_completo)}`}>
        {frente ? `Frente ${frente}.` : "Você ainda não tem uma frente definida."} O que pede a sua atenção agora.
      </PageHeader>

      <BlocoAgora sprints={sprints} erro={sprintsR.error} rotaFrente={rotaFrente} />
      <BlocoPrazos atrasados={atrasados} proximos={proximos} hoje={hoje} erros={errosPrazos} />
      <BlocoAvisos avisos={(avisosR.data ?? []) as unknown as AvisoResumo[]} erro={avisosR.error} />
      {moduloAtual && <BlocoAcademia atual={moduloAtual} />}
      {comCargo && (
        <BlocoPendencias
          aprovacoes={aprovacoesR.error ? null : (aprovacoesR.count ?? 0)}
          bloqueados={bloqueadosR.error ? null : (bloqueadosR.count ?? 0)}
        />
      )}
    </section>
  )
}
