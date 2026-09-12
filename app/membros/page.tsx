import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { dataHora, inicioDeHoje } from "@/lib/datas"
import { rotaDaTrilha, temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"

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
  trilha_vinculada: string | null
}

/** Sai pelo servidor: limpa o cookie de sessão de verdade, não só no browser. */
async function sair() {
  "use server"

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
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

  const trilha = perfil?.trilha?.trim() || null
  const cargo = perfil?.cargo?.trim() || null
  const comCargo = temCargo(cargo)

  /*
   * Os dois blocos são independentes e nenhum deles é essencial ao painel:
   * se 008 ainda não rodou, cada bloco mostra o próprio aviso e o resto da
   * página continua de pé.
   */
  const supabase = await createClient()
  const [{ data: avisosData, error: erroAvisos }, { data: eventosData, error: erroEventos }] =
    await Promise.all([
      supabase
        .from("avisos")
        .select("id, titulo, fixado, created_at")
        .order("fixado", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PREVIA),
      supabase
        .from("eventos")
        .select("id, titulo, tipo, data_inicio, trilha_vinculada")
        .gte("data_inicio", inicioDeHoje())
        .order("data_inicio", { ascending: true })
        .limit(PREVIA),
    ])

  const avisos = (avisosData ?? []) as AvisoPrevia[]
  const eventos = (eventosData ?? []) as EventoPrevia[]

  const membroDesde = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  const ficha = [
    { label: "E-mail", valor: user.email ?? "—" },
    { label: "Curso", valor: perfil?.curso?.trim() || "não informado" },
    // trilha null = ainda não escolheu; é um estado válido, não um erro
    { label: "Trilha", valor: trilha || "a definir" },
    ...(cargo ? [{ label: "Cargo", valor: cargo }] : []),
    ...(membroDesde ? [{ label: "Membro desde", valor: membroDesde }] : []),
  ]

  /*
   * Atalhos. As trilhas são visíveis a todo mundo — o atalho só abre direto
   * na trilha de quem está vendo, quando há uma; sem trilha, cai na primeira
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
      href: "/membros/diretorio",
      nome: "Diretório",
      texto: "Quem está na GEAR, por trilha, com curso e cargo.",
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
      href: rotaDaTrilha(trilha),
      nome: trilha ? `Trilha ${trilha}` : "Trilhas",
      texto: trilha
        ? "Os sprints da sua trilha e onde cada um está."
        : "Sprints das três trilhas: Competição, Pesquisa e Projetos.",
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
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          {/* Topo: saudação */}
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Bem-vindo(a),
            <br />
            <span className="italic break-words">{perfil?.nome_completo ?? user.email}</span>
          </h1>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="border border-[var(--gear-amber)] px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
              {trilha ? `Trilha ${trilha}` : "Trilha a definir"}
            </span>
            {cargo && (
              <span className="border border-white/20 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {cargo}
              </span>
            )}
          </div>

          {/* A tabela pode não existir ainda, ou o trigger não ter rodado. */}
          {(erro || !perfil) && (
            <Aviso titulo="PERFIL NÃO ENCONTRADO" tom="neutro" className="mt-10 max-w-2xl">
              Sua conta existe, mas não há linha correspondente em <code>perfis</code>
              {erro ? ` (${erro})` : ""}. Rode <code>supabase/001_perfis.sql</code> no SQL Editor do
              painel — ele cria a tabela, as políticas e preenche quem já se cadastrou.
            </Aviso>
          )}

          {/* Dois blocos de prévia, lado a lado no desktop */}
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Avisos recentes */}
            <section className="border-t border-white/10 pt-8">
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
                    Mural indisponível: {erroAvisos.message}
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
                              <span className="shrink-0 font-mono text-[9px] tracking-[0.2em] text-[var(--gear-amber)]">
                                FIXADO
                              </span>
                            )}
                            <p className="font-sans text-base font-light leading-snug transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                              {aviso.titulo}
                            </p>
                          </div>
                          <p className="mt-1 font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                            {dataHora(aviso.created_at)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Próximos eventos */}
            <section className="border-t border-white/10 pt-8">
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
                    Calendário indisponível: {erroEventos.message}
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
                            <span className="shrink-0 font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                              {evento.trilha_vinculada ?? "Geral"}
                            </span>
                            <p className="font-sans text-base font-light leading-snug transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                              {evento.titulo}
                            </p>
                          </div>
                          <p className="mt-1 font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                            {dataHora(evento.data_inicio)} · {evento.tipo}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* Grid de atalhos */}
          <section className="mt-20">
            <div className="border-t border-white/10 pt-8">
              <h2 className="font-sans text-2xl md:text-3xl font-light italic">Atalhos</h2>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {atalhos.map((atalho) => (
                <Link
                  key={atalho.href}
                  href={atalho.href}
                  data-cursor-hover
                  className="border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
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
              ))}
            </div>
          </section>

          {/* Ficha do perfil e sessão */}
          <section className="mt-20">
            <div className="border-t border-white/10 pt-8">
              <h2 className="font-sans text-2xl md:text-3xl font-light italic">Seu perfil</h2>
            </div>

            <div className="mt-8 flex flex-col lg:flex-row gap-10 lg:gap-16">
              <div className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6">
                <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">FICHA</p>
                <dl className="mt-4 space-y-4">
                  {ficha.map((linha) => (
                    <div key={linha.label}>
                      <dt className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
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
                <form action={sair}>
                  <button type="submit" data-cursor-hover className={`w-full ${botaoSecundario}`}>
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </section>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
