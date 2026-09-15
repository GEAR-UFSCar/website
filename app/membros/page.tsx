import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { dataDoDia, dataHora, hojeISO, inicioDeHoje } from "@/lib/datas"
import { rotaDaFrente, temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { prazoRelativo } from "@/lib/metas"
import { ErroDados } from "@/components/erro-dados"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Membros | GEAR",
  robots: { index: false, follow: false },
}

/** Quantos itens cabem em cada bloco do painel antes do "ver todos". */
const PREVIA = 3

type AvisoPrevia = { id: string; titulo: string; fixado: boolean; created_at: string }
type EventoPrevia = {
  id: string
  titulo: string
  tipo: string
  data_inicio: string
  frente_vinculada: string | null
}
type MetaPrevia = {
  id: string
  titulo: string
  prazo: string
  frente_vinculada: string | null
}

export default async function MembrosPage() {
  const user = await exigirUsuario()
  const { perfil, erro } = await getPerfil()

  /*
   * Gate do primeiro acesso: sem nome_completo, não entra na área.
   * Só redireciona se a consulta funcionou — se a tabela ainda não existe,
   * `erro` vem preenchido e o aviso abaixo explica o que fazer, em vez de
   * mandar a pessoa para um formulário que também não teria onde gravar.
   */
  if (!erro && !perfil?.nome_completo?.trim()) {
    redirect("/membros/completar-perfil")
  }

  /*
   * Segundo portão: conta existe, perfil preenchido, mas a diretoria ainda não
   * validou o vínculo. Espelha e_membro() (014) — sem aprovação a RLS já
   * devolveria tudo vazio, e um painel de blocos vazios não explicaria por quê.
   */
  if (!erro && !perfil?.aprovado) {
    redirect("/membros/aguardando")
  }

  const frente = perfil?.frente?.trim() || null
  const cargo = perfil?.cargo?.trim() || null
  const comCargo = temCargo(cargo)

  /*
   * Os três blocos são independentes e nenhum deles é essencial ao painel:
   * se 008 (avisos/eventos) ou 017 (metas) ainda não rodou, cada bloco mostra
   * o próprio aviso e o resto da página continua de pé.
   */
  const supabase = await createClient()
  const [
    { data: avisosData, error: erroAvisos },
    { data: eventosData, error: erroEventos },
    { data: metasData, error: erroMetas },
  ] = await Promise.all([
    supabase
      .from("avisos")
      .select("id, titulo, fixado, created_at")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PREVIA),
    supabase
      .from("eventos")
      .select("id, titulo, tipo, data_inicio, frente_vinculada")
      .gte("data_inicio", inicioDeHoje())
      .order("data_inicio", { ascending: true })
      .limit(PREVIA),
    /*
     * Só as que ainda dá para cumprir: em aberto e com prazo de hoje em
     * diante. Meta vencida existe e aparece em /membros/metas com o
     * destaque devido — o bloco do painel é sobre o que vem, não sobre o
     * que passou, e a lista das três mais próximas não é lugar para
     * cobrança. `hojeISO()` porque `prazo` é `date`: comparar com o ISO
     * completo de inicioDeHoje() faria o PostgREST recusar o filtro.
     */
    supabase
      .from("metas")
      .select("id, titulo, prazo, frente_vinculada")
      .eq("usuario_id", user.id)
      .eq("concluida", false)
      .gte("prazo", hojeISO())
      .order("prazo", { ascending: true })
      .limit(PREVIA),
  ])

  const avisos = (avisosData ?? []) as AvisoPrevia[]
  const eventos = (eventosData ?? []) as EventoPrevia[]
  const metas = (metasData ?? []) as MetaPrevia[]

  const membroDesde = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  const ficha = [
    { label: "E-mail", valor: user.email ?? "—" },
    { label: "Curso", valor: perfil?.curso?.trim() || "não informado" },
    // frente null = ainda não escolheu; é um estado válido, não um erro
    { label: "Frente", valor: frente || "a definir" },
    ...(cargo ? [{ label: "Cargo", valor: cargo }] : []),
    ...(membroDesde ? [{ label: "Membro desde", valor: membroDesde }] : []),
  ]

  /*
   * Atalhos. As frentes são visíveis a todo mundo — o atalho só abre direto
   * na frente de quem está vendo, quando há uma; sem frente, cai na primeira
   * aba e as outras duas ficam a um clique. Administração continua exigindo
   * cargo, que é a única condição real de acesso aqui.
   */
  const atalhos = [
    {
      href: "/membros/aprendizagem",
      nome: "Aprendizagem",
      texto: "Seus módulos da Academia GEAR e o progresso na formação.",
    },
    {
      href: "/membros/metas",
      nome: "Metas",
      texto: "Suas metas pessoais e as que a equipe tornou públicas.",
    },
    {
      href: "/membros/diretorio",
      nome: "Diretório",
      texto: "Quem está na GEAR, por frente, com curso e cargo.",
    },
    {
      href: "/membros/calendario",
      nome: "Calendário",
      texto: "Reuniões, sprints e prazos da entidade.",
    },
    {
      href: "/membros/mural",
      nome: "Mural",
      texto: "Comunicados da diretoria, fixados primeiro.",
    },
    {
      href: "/membros/documentacao",
      nome: "Documentação",
      texto: "Regimento, manuais e normas institucionais.",
    },
    {
      href: rotaDaFrente(frente),
      nome: frente ? `Frente ${frente}` : "Frentes",
      texto: frente
        ? "Os sprints da sua frente e onde cada um está."
        : "Sprints das três frentes: Competição, Pesquisa e Projetos.",
    },
    ...(comCargo
      ? [
          {
            href: "/membros/administracao",
            nome: "Administração",
            texto: "Patrimônio, atas e cargos da entidade.",
          },
        ]
      : []),
  ]

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      {/* Topo: saudação */}
      <Surge>
      <h2 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
        Bem-vindo(a),
        <br />
        <span className="italic break-words">{perfil?.nome_completo ?? user.email}</span>
      </h2>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="border border-[var(--gear-amber)] px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
          {frente ? `Frente ${frente}` : "Frente a definir"}
        </span>
        {cargo && (
          <span className="border border-white/20 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {cargo}
          </span>
        )}
      </div>
      </Surge>

      {/* A tabela pode não existir ainda, ou o trigger não ter rodado. */}
      {erro ? (
        <ErroDados titulo="PERFIL NÃO ENCONTRADO" erro={erro} className="mt-10 max-w-2xl">
          Rode <code>supabase/001_perfis.sql</code> no SQL Editor do painel — ele cria a tabela,
          as políticas e preenche quem já se cadastrou.
        </ErroDados>
      ) : (
        !perfil && (
          <Aviso titulo="PERFIL NÃO ENCONTRADO" tom="neutro" className="mt-10 max-w-2xl">
            Sua conta existe, mas não há linha correspondente em <code>perfis</code>. Avise a
            diretoria: o cadastro precisa ser refeito no painel.
          </Aviso>
        )
      )}

      {/*
        Metas vêm antes de avisos e eventos, e ocupam a largura inteira.
        É o único bloco do painel sobre compromisso que a própria pessoa
        assumiu — se ficasse depois da grade, só apareceria para quem
        rolasse, e uma meta que só aparece a quem procura não lembra
        ninguém de nada.
      */}
      <Surge as="section" className="mt-16 border-t border-white/10 pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-sans text-2xl md:text-3xl font-light italic">
            Minhas próximas metas
          </h2>
          <Link
            href="/membros/metas"
            data-cursor-hover
            className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
          >
            VER TODAS →
          </Link>
        </div>

        <div className="mt-6">
          {erroMetas ? (
            <p className="font-sans text-sm font-light text-muted-foreground">
              Metas indisponíveis: {mensagemSegura(erroMetas)}
            </p>
          ) : metas.length === 0 ? (
            <p className="font-sans text-sm font-light text-muted-foreground">
              Nenhuma meta em aberto para os próximos dias.{" "}
              <Link
                href="/membros/metas"
                data-cursor-hover
                className="text-[var(--gear-amber)] hover:underline"
              >
                Registrar a primeira
              </Link>
              .
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
              {metas.map((meta) => (
                <li key={meta.id} className="bg-[var(--gear-ink)] p-5">
                  <Link href="/membros/metas" data-cursor-hover className="group block">
                    <p className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
                      {prazoRelativo(meta.prazo)}
                    </p>
                    <p className="mt-2 font-sans text-base font-light leading-snug transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                      {meta.titulo}
                    </p>
                    <p className="mt-2 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                      {dataDoDia(meta.prazo)}
                      {meta.frente_vinculada ? ` · ${meta.frente_vinculada}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Surge>

      {/* Dois blocos de prévia, lado a lado no desktop */}
      <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Avisos recentes */}
        <Surge as="section" className="border-t border-white/10 pt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-sans text-2xl md:text-3xl font-light italic">Avisos recentes</h2>
            <Link
              href="/membros/mural"
              data-cursor-hover
              className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
            >
              VER TODOS →
            </Link>
          </div>

          <div className="mt-6">
            {erroAvisos ? (
              <p className="font-sans text-sm font-light text-muted-foreground">
                Mural indisponível: {mensagemSegura(erroAvisos)}
              </p>
            ) : avisos.length === 0 ? (
              <p className="font-sans text-sm font-light text-muted-foreground">
                Nenhum aviso publicado ainda.
              </p>
            ) : (
              <ul>
                {avisos.map((aviso) => (
                  <li key={aviso.id} className="border-t border-white/10 py-4">
                    <Link href="/membros/mural" data-cursor-hover className="group block">
                      <div className="flex items-baseline gap-3">
                        {aviso.fixado && (
                          <span className="shrink-0 font-mono text-[10px] md:text-[9px] tracking-[0.2em] text-[var(--gear-amber)]">
                            FIXADO
                          </span>
                        )}
                        <p className="font-sans text-base font-light leading-snug transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                          {aviso.titulo}
                        </p>
                      </div>
                      <p className="mt-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                        {dataHora(aviso.created_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Surge>

        {/* Próximos eventos */}
        <Surge as="section" delay={0.1} className="border-t border-white/10 pt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-sans text-2xl md:text-3xl font-light italic">Próximos eventos</h2>
            <Link
              href="/membros/calendario"
              data-cursor-hover
              className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
            >
              VER CALENDÁRIO →
            </Link>
          </div>

          <div className="mt-6">
            {erroEventos ? (
              <p className="font-sans text-sm font-light text-muted-foreground">
                Calendário indisponível: {mensagemSegura(erroEventos)}
              </p>
            ) : eventos.length === 0 ? (
              <p className="font-sans text-sm font-light text-muted-foreground">
                Nenhum evento marcado daqui para frente.
              </p>
            ) : (
              <ul>
                {eventos.map((evento) => (
                  <li key={evento.id} className="border-t border-white/10 py-4">
                    <Link href="/membros/calendario" data-cursor-hover className="group block">
                      <div className="flex items-baseline gap-3">
                        <span className="shrink-0 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          {evento.frente_vinculada ?? "Geral"}
                        </span>
                        <p className="font-sans text-base font-light leading-snug transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                          {evento.titulo}
                        </p>
                      </div>
                      <p className="mt-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                        {dataHora(evento.data_inicio)} · {evento.tipo}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Surge>
      </div>

      {/* Grid de atalhos */}
      <section className="mt-20">
        <div className="border-t border-white/10 pt-8">
          <h2 className="font-sans text-2xl md:text-3xl font-light italic">Atalhos</h2>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {atalhos.map((atalho, i) => (
            <Surge key={atalho.href} index={i} className="h-full">
            <Link
              href={atalho.href}
              data-cursor-hover
              className="block h-full border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
            >
              <h3 className="font-sans text-xl md:text-2xl font-light tracking-tight">
                {atalho.nome}
              </h3>
              <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {atalho.texto}
              </p>
              <span className="mt-5 inline-block font-mono text-[10px] tracking-[0.25em] text-[var(--gear-amber)]">
                ABRIR →
              </span>
            </Link>
            </Surge>
          ))}
        </div>
      </section>

      {/* Ficha do perfil e sessão */}
      <Surge as="section" className="mt-20">
        <div className="border-t border-white/10 pt-8">
          <h2 className="font-sans text-2xl md:text-3xl font-light italic">Seu perfil</h2>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-10 lg:gap-16">
          <div className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">FICHA</p>
            <dl className="mt-4 space-y-4">
              {ficha.map((linha) => (
                <div key={linha.label}>
                  <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="font-mono text-[11px] text-foreground mt-1 break-words">
                    {linha.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-5 lg:self-start">
            <Link
              href="/membros/completar-perfil"
              data-cursor-hover
              className={`text-center ${botaoSecundario}`}
            >
              Editar perfil
            </Link>

          </div>
        </div>
      </Surge>
    </section>
  )
}
