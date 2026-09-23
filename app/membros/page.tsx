import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { FUSO_GEAR, agoraISO, dataHora, saudacao } from "@/lib/datas"
import { iniciais, primeiroNome, rotaDaFrente, temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { ErroDados } from "@/components/erro-dados"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Membros | GEAR",
  robots: { index: false, follow: false },
}

/**
 * Quantos sprints cabem no cartão de execução. Três é o teto: o cartão é
 * recorte do que está em andamento agora, não a lista — a lista inteira mora
 * na página da frente, a um clique.
 */
const DESTAQUES = 3

/** Quantos avatares aparecem antes do "+N". Doze preenche três fileiras de quatro. */
const AVATARES = 12

/**
 * Casca dos cartões. Navy sobre o ink da página: #0B2138 é mais claro que
 * #081726, então o bloco se destaca sem sombra — o mesmo recurso da casca em
 * components/membros-shell.tsx.
 */
const cartao = "flex h-full flex-col bg-[var(--gear-navy)] p-7 md:p-8"

/** Rótulo mono no topo de cada cartão. */
const rotulo = "font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gear-amber)]"

/** Link de saída, sempre no rodapé do cartão. */
const saida =
  "mt-auto pt-6 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline"

type EventoPrevia = {
  id: string
  titulo: string
  tipo: string
  data_inicio: string
  frente_vinculada: string | null
}

/**
 * `responsavel` é o embed da FK criada em 020 — por isso a FK aponta para
 * `perfis` e não para `auth.users`, que o PostgREST não expõe.
 */
type SprintDestaque = {
  id: string
  frente: string
  titulo: string
  proximo_passo: string | null
  responsavel: { nome_completo: string | null } | null
}

type MembroPrevia = { id: string; nome_completo: string | null }

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
   * Os quatro cartões são independentes e nenhum deles é essencial ao painel:
   * se 008 (eventos/sprints) ou 020 (responsável e próximo passo) ainda não
   * rodou, cada cartão mostra o próprio aviso e o resto da página continua de
   * pé.
   *
   * CORTE NO RELÓGIO, NÃO NO DIA. `agoraISO()` e não `inicioDeHoje()`: o
   * cartão se chama PRÓXIMO COMPROMISSO, e compromisso que já começou não é o
   * próximo. O preço é conhecido e vale registrar — a reunião das 14h some do
   * painel às 14h01, no dia dela. Quem quiser a reunião em curso ainda na tela
   * troca as duas ocorrências abaixo por `inicioDeHoje()`.
   */
  const agora = agoraISO()
  const supabase = await createClient()
  const [
    { data: eventoData, error: erroEvento },
    { count: reunioes, error: erroReunioes },
    { data: sprintsData, count: emAndamento, error: erroSprints },
    { data: membrosData, count: totalMembros, error: erroMembros },
  ] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, data_inicio, frente_vinculada")
      .gte("data_inicio", agora)
      .order("data_inicio", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // head: true — a tela quer o número, não as linhas.
    supabase
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "Reunião")
      .gte("data_inicio", agora),
    /*
     * Uma consulta serve aos dois cartões: `count: "exact"` devolve o total de
     * sprints em andamento (o número do pulso) junto das três primeiras linhas
     * (o cartão de execução). Separar em duas consultas custaria uma ida à
     * rede para contar o que esta já contou.
     */
    supabase
      .from("sprints")
      .select(
        "id, frente, titulo, proximo_passo, responsavel:perfis!sprints_responsavel_id_fkey (nome_completo)",
        { count: "exact" },
      )
      .eq("status", "Em andamento")
      .order("updated_at", { ascending: false })
      .limit(DESTAQUES),
    /*
     * Mesmo recurso: `count` é o total de membros ativos, as linhas são só os
     * doze avatares. "Ativo" é `aprovado` — quem ainda espera validação da
     * diretoria tem conta, não vínculo, e não deve inflar a contagem do time.
     */
    supabase
      .from("perfis")
      .select("id, nome_completo", { count: "exact" })
      .eq("aprovado", true)
      .order("nome_completo", { nullsFirst: false })
      .limit(AVATARES),
  ])

  const evento = (eventoData ?? null) as EventoPrevia | null
  // O embed vem tipado como array pelo cliente; a FK é para-um e devolve objeto.
  const sprints = (sprintsData ?? []) as unknown as SprintDestaque[]
  const membros = (membrosData ?? []) as MembroPrevia[]
  const restantes = Math.max((totalMembros ?? 0) - membros.length, 0)

  const membroDesde = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: FUSO_GEAR })
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
      href: "/membros/metricas",
      nome: "Métricas",
      texto: "Insumos, atividades, resultados e impacto do semestre.",
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
      {/*
        Primeiro nome e não o nome completo: a saudação é fala direta, e
        ninguém é cumprimentado pelo nome de registro. `saudacao()` fixa o fuso
        de Brasília (lib/datas.ts) — sem isso, este Server Component leria o
        relógio UTC da Vercel e diria "Boa noite" às 18h de Sorocaba.
      */}
      <h2 className="font-sans text-3xl md:text-4xl font-light tracking-tight text-balance">
        {saudacao()},{" "}
        <span className="italic break-words">
          {primeiroNome(perfil?.nome_completo ?? user.email)}
        </span>
        .
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
        Os quatro cartões. A grade é de três colunas e a assimetria é
        intencional: compromisso e execução ocupam duas, pulso e pessoas uma.
        O que exige leitura ganha largura; o que é número ou avatar, não.
      */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-px bg-white/10">
        {/* 01 — PRÓXIMO COMPROMISSO */}
        <Surge as="section" className="h-full lg:col-span-2">
          <div className={cartao}>
            <p className={rotulo}>Próximo compromisso</p>

            {erroEvento ? (
              <ErroDados titulo="CALENDÁRIO INDISPONÍVEL" erro={erroEvento} className="mt-5">
                Se a tabela não existe, rode <code>supabase/008_eventos_avisos_sprints.sql</code>{" "}
                no SQL Editor do painel.
              </ErroDados>
            ) : evento ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="border border-white/20 px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {evento.tipo}
                  </span>
                  <span className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {evento.frente_vinculada ?? "Geral"}
                  </span>
                </div>

                <h3 className="mt-4 font-sans text-2xl md:text-3xl font-light italic leading-snug text-balance">
                  {evento.titulo}
                </h3>

                <p className="mt-3 font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--gear-amber)]">
                  {dataHora(evento.data_inicio)}
                </p>
              </div>
            ) : (
              <p className="mt-5 font-sans text-base font-light leading-relaxed text-muted-foreground">
                Nenhuma reunião futura cadastrada. Abra o calendário.
              </p>
            )}

            <Link href="/membros/calendario" data-cursor-hover className={saida}>
              Ver calendário →
            </Link>
          </div>
        </Surge>

        {/*
          02 — PULSO. Único bloco em âmbar cheio da área de membros, e é assim
          de propósito: dois números que resumem a entidade não competem com
          nada em volta. Texto em ink porque âmbar sobre navy não tem contraste
          para leitura.
        */}
        <Surge as="section" delay={0.1} className="h-full">
          <div className="flex h-full flex-col bg-[var(--gear-amber)] p-7 text-[var(--gear-ink)] md:p-8">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase">
              Pulso da entidade — GEAR
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <dd className="font-sans text-5xl md:text-6xl font-light leading-none tabular-nums">
                  {/* erro vira travessão: número errado é pior que número ausente */}
                  {erroSprints ? "—" : (emAndamento ?? 0)}
                </dd>
                <dt className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-ink)]/70">
                  Projetos ativos
                </dt>
              </div>
              <div>
                <dd className="font-sans text-5xl md:text-6xl font-light leading-none tabular-nums">
                  {erroReunioes ? "—" : (reunioes ?? 0)}
                </dd>
                <dt className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-ink)]/70">
                  Próximas reuniões
                </dt>
              </div>
            </dl>

            <p className="mt-auto pt-8 font-mono text-[10px] leading-relaxed tracking-[0.1em] uppercase text-[var(--gear-ink)]/70">
              Sprints em andamento e reuniões marcadas daqui para frente.
            </p>
          </div>
        </Surge>

        {/* 03 — EXECUÇÃO */}
        <Surge as="section" delay={0.2} className="h-full lg:col-span-2">
          <div className={cartao}>
            <p className={rotulo}>Execução — Projetos em andamento</p>

            {erroSprints ? (
              <ErroDados titulo="SPRINTS INDISPONÍVEIS" erro={erroSprints} className="mt-5">
                Se a tabela não existe, rode <code>supabase/008_eventos_avisos_sprints.sql</code>.
                Se o erro fala em <code>responsavel_id</code>, <code>proximo_passo</code> ou em
                relação não encontrada, falta rodar{" "}
                <code>supabase/020_sprints_responsavel_e_proximo_passo.sql</code> — é ele que cria
                as duas colunas e a FK para <code>perfis</code>.
              </ErroDados>
            ) : sprints.length === 0 ? (
              <p className="mt-5 font-sans text-base font-light leading-relaxed text-muted-foreground">
                Nenhum sprint em andamento. Os que estão planejados ficam na página da frente.
              </p>
            ) : (
              <ul className="mt-5">
                {sprints.map((sprint) => (
                  <li key={sprint.id} className="border-t border-white/10 py-5 first:border-t-0 first:pt-0">
                    <Link href={rotaDaFrente(sprint.frente)} data-cursor-hover className="group block">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          {sprint.frente}
                        </span>
                        <span className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          {/* sem responsável é estado real (020), e a tela diz isso */}
                          {sprint.responsavel?.nome_completo?.trim() || "sem responsável"}
                        </span>
                      </div>

                      <p className="mt-2 font-sans text-lg md:text-xl font-light leading-snug transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                        {sprint.titulo}
                      </p>

                      <p className="mt-3 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
                        Próximo passo
                      </p>
                      <p className="mt-1 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                        {sprint.proximo_passo?.trim() || "Ainda não declarado."}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link href={rotaDaFrente(frente)} data-cursor-hover className={saida}>
              Todos os projetos →
            </Link>
          </div>
        </Surge>

        {/* 04 — PESSOAS */}
        <Surge as="section" delay={0.3} className="h-full">
          <div className={cartao}>
            <p className={rotulo}>Pessoas — Nosso time</p>

            {erroMembros ? (
              <ErroDados titulo="TIME INDISPONÍVEL" erro={erroMembros} className="mt-5">
                Se só você aparece, falta rodar <code>supabase/009_diretorio.sql</code> — é ele que
                libera a leitura dos perfis para todos os membros.
              </ErroDados>
            ) : membros.length === 0 ? (
              <p className="mt-5 font-sans text-base font-light leading-relaxed text-muted-foreground">
                Nenhum membro aprovado ainda.
              </p>
            ) : (
              <>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {membros.map((membro) => (
                    <li
                      key={membro.id}
                      /*
                        `title` e não só as iniciais: duas letras não
                        identificam ninguém, e o diretório fica a um clique
                        para quem precisar do nome inteiro.
                      */
                      title={membro.nome_completo?.trim() || "Sem nome preenchido"}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 font-mono text-[11px] tracking-[0.05em] text-muted-foreground"
                    >
                      {iniciais(membro.nome_completo)}
                    </li>
                  ))}
                  {restantes > 0 && (
                    <li className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gear-amber)] font-mono text-[11px] text-[var(--gear-amber)]">
                      +{restantes}
                    </li>
                  )}
                </ul>

                <p className="mt-6 font-sans text-3xl font-light leading-none tabular-nums">
                  {totalMembros ?? membros.length}
                </p>
                <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Membros ativos
                </p>
              </>
            )}

            <Link href="/membros/diretorio" data-cursor-hover className={saida}>
              Ver time →
            </Link>
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
