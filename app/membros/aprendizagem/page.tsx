import type { Metadata } from "next"
import Link from "next/link"

import { ModuloCheckbox } from "@/components/modulo-checkbox"
import { AnelProgresso } from "@/components/anel-progresso"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Aprendizagem | GEAR",
  robots: { index: false, follow: false },
}

/** Ordem dos níveis na tela — o banco não tem como saber essa hierarquia. */
const NIVEIS = ["Fundamental", "Principal", "Avançada"] as const

type Modulo = {
  id: string
  nivel: string
  ordem: number
  titulo: string
  descricao: string | null
  conteudo_url: string | null
}

type Progresso = {
  modulo_id: string
  concluido_em: string | null
}

export default async function AprendizagemPage() {
  // mesmo portão de /membros: sem sessão vai ao login, perfil incompleto ao
  // formulário de primeiro acesso.
  const { user } = await exigirMembroAprovado()

  const supabase = await createClient()
  const [{ data: modulos, error: erroModulos }, { data: progresso }] = await Promise.all([
    supabase.from("modulos").select("id, nivel, ordem, titulo, descricao, conteudo_url").order("ordem"),
    supabase.from("progresso").select("modulo_id, concluido_em").eq("usuario_id", user.id),
  ])

  const concluidos = new Set(
    ((progresso ?? []) as Progresso[]).filter((p) => p.concluido_em).map((p) => p.modulo_id),
  )

  const lista = (modulos ?? []) as Modulo[]
  const total = lista.length
  const feitos = lista.filter((m) => concluidos.has(m.id)).length
  const percentual = total > 0 ? Math.round((feitos / total) * 100) : 0

  /*
   * ESTÁGIOS — os três níveis com o progresso já contabilizado.
   *
   * Nível sem módulo nenhum (banco a meio caminho de uma migração) não entra
   * na tela e, principalmente, não trava o nível seguinte: sem isso, um seed
   * incompleto deixaria a Academia inteira inacessível.
   */
  const estagios = NIVEIS.map((nivel, indice) => {
    const modulosDoNivel = lista.filter((m) => m.nivel === nivel).sort((a, b) => a.ordem - b.ordem)
    const feitosDoNivel = modulosDoNivel.filter((m) => concluidos.has(m.id)).length

    return {
      nivel,
      indice,
      modulos: modulosDoNivel,
      feitos: feitosDoNivel,
      total: modulosDoNivel.length,
      completo: modulosDoNivel.length > 0 && feitosDoNivel === modulosDoNivel.length,
    }
  }).map((estagio, _indice, todos) => ({
    ...estagio,
    /*
     * TRAVA ENTRE NÍVEIS — só na interface.
     *
     * A regra que o banco garante (trigger validar_ordem_progresso, em
     * supabase/005_ordem_progresso.sql) é sequencial DENTRO de um nível:
     * `anterior.nivel = nivel_alvo`. Ela não sabe nada sobre a ordem
     * Fundamental → Principal → Avançada, e esta tela não muda isso.
     *
     * Então o bloqueio abaixo é afordância, não garantia: comunica a ordem
     * da formação a quem está olhando a página, e não sobreviveria a um POST
     * direto ao PostgREST. Se um dia precisar ser regra de verdade, o lugar é
     * uma migração que estenda aquele trigger — não mais JavaScript aqui.
     */
    travado: todos.slice(0, estagio.indice).some((anterior) => anterior.total > 0 && !anterior.completo),
  }))

  const comModulos = estagios.filter((e) => e.total > 0)
  /*
   * Seção aberta na carga: o primeiro estágio inacabado — onde a pessoa
   * parou. Terminada a formação inteira, abre o último, para a página nunca
   * aparecer com as três seções fechadas e cara de quebrada.
   */
  const estagioAtual = comModulos.find((e) => !e.completo) ?? comModulos.at(-1)

  /** Próximo módulo a fazer: primeiro não concluído do estágio atual. */
  const proximo = estagioAtual?.modulos.find((m) => !concluidos.has(m.id))

  return (
    <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>
      {/* Barra de progresso */}
      <div className="mt-10 max-w-2xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {feitos} DE {total} MÓDULOS CONCLUÍDOS
          </p>
          <p className="font-mono text-xs tracking-[0.2em] text-[var(--gear-amber)]">{percentual}%</p>
        </div>
        <div
          className="mt-3 h-1 w-full bg-[var(--gear-navy)]"
          role="progressbar"
          aria-valuenow={feitos}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Módulos concluídos"
        >
          <div
            className="h-full bg-[var(--gear-amber)] transition-all duration-500"
            style={{ width: `${percentual}%` }}
          />
        </div>

        {proximo && (
          <p className="mt-5 font-sans text-sm font-light leading-relaxed text-muted-foreground">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)]">
              PRÓXIMO ·{" "}
            </span>
            {proximo.titulo}
          </p>
        )}
        {!proximo && total > 0 && (
          <p className="mt-5 font-sans text-sm font-light leading-relaxed text-muted-foreground">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)]">
              FORMAÇÃO CONCLUÍDA ·{" "}
            </span>
            Os nove módulos estão fechados.
          </p>
        )}
      </div>
      </Surge>

      {erroModulos && (
        <ErroDados titulo="MÓDULOS INDISPONÍVEIS" erro={erroModulos} className="mt-10 max-w-2xl">
          Rode <code>supabase/002_academia.sql</code> no SQL Editor do painel — ele cria as
          tabelas e cadastra os 9 módulos.
        </ErroDados>
      )}

      {/*
        Uma seção COLAPSÁVEL por nível.

        <details> nativo em vez de useState: a própria doc do Next lista o
        elemento entre as interatividades que não exigem Client Component
        (01-app/02-guides/server-and-client-boundary.md). A página segue
        Server Component, o colapso funciona antes da hidratação e o
        conteúdo continua no HTML — o que importa porque a trava entre
        níveis é visual, e esconder algo que o banco não protege seria
        fingir uma segurança que não existe.
      */}
      <div className="mt-16">
        {estagios.map((estagio) => {
          if (estagio.total === 0) return null

          const { nivel, indice, travado, completo } = estagio
          const aberto = estagio === estagioAtual

          return (
            <details
              key={nivel}
              open={aberto}
              className="group border-t border-white/10 last:border-b"
            >
              <summary
                data-cursor-hover
                className="flex cursor-pointer list-none items-center gap-5 py-7 outline-none transition-colors duration-300 hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-[var(--gear-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gear-ink)] md:gap-7 [&::-webkit-details-marker]:hidden"
              >
                <AnelProgresso
                  feitos={estagio.feitos}
                  total={estagio.total}
                  travado={travado}
                  className="h-12 w-12 md:h-14 md:w-14"
                />

                <div className={`flex-1 ${travado ? "opacity-45" : ""}`}>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground md:text-xs">
                    ESTÁGIO 0{indice + 1}
                  </p>
                  <h2 className="mt-1 font-sans text-2xl font-light italic md:text-4xl">{nivel}</h2>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                    {estagio.feitos} DE {estagio.total} MÓDULOS
                    {travado && " · BLOQUEADO"}
                    {!travado && completo && " · CONCLUÍDO"}
                  </p>
                </div>

                {/* seta: a única pista de que a seção abre e fecha */}
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                >
                  <path
                    d="M3 6l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
              </summary>

              {travado && (
                <p className="mb-6 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  Este estágio abre quando o anterior chegar a 100%. Cada nível assume o
                  vocabulário do anterior — não é burocracia.
                </p>
              )}

              <ul className="mb-8 space-y-px">
                {estagio.modulos.map((modulo, indiceModulo) => {
                  const concluido = concluidos.has(modulo.id)
                  // sequencial dentro do nível E depois do nível anterior
                  const liberado =
                    !travado &&
                    estagio.modulos.slice(0, indiceModulo).every((m) => concluidos.has(m.id))

                  return (
                    <Surge
                      as="li"
                      index={indiceModulo}
                      key={modulo.id}
                      className={`flex gap-5 border-t border-white/10 py-6 ${
                        concluido || liberado ? "" : "opacity-45"
                      }`}
                    >
                      <ModuloCheckbox
                        usuarioId={user.id}
                        moduloId={modulo.id}
                        concluido={concluido}
                        liberado={liberado}
                        motivoBloqueio={
                          travado
                            ? `Conclua o nível ${NIVEIS[indice - 1]} primeiro`
                            : "Conclua o módulo anterior primeiro"
                        }
                      />

                      <div className="flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                          <h3
                            className={`font-sans text-lg font-light leading-snug md:text-xl ${
                              concluido ? "text-muted-foreground" : ""
                            }`}
                          >
                            <span className="mr-3 font-mono text-xs text-[var(--gear-amber)]">
                              {modulo.ordem}
                            </span>
                            {modulo.titulo}
                          </h3>

                          {/* selo de estado — o checkbox é o controle, isto é o rótulo */}
                          {concluido && (
                            <span className="inline-flex shrink-0 items-center gap-1.5 self-start border border-[var(--gear-amber)] px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)]">
                              <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                                <path
                                  d="M3 8.5l3.5 3.5L13 5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="square"
                                />
                              </svg>
                              CONCLUÍDO
                            </span>
                          )}

                          {!concluido && !liberado && (
                            <span className="shrink-0 self-start border border-white/15 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                              BLOQUEADO
                            </span>
                          )}
                        </div>

                        {modulo.descricao && (
                          <p className="mt-2 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                            {modulo.descricao}
                          </p>
                        )}

                        {modulo.conteudo_url && (
                          <a
                            href={modulo.conteudo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cursor-hover
                            className="mt-3 inline-block font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                          >
                            ABRIR MATERIAL →
                          </a>
                        )}
                      </div>
                    </Surge>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </div>

      <div className="mt-16">
        <Link
          href="/membros"
          data-cursor-hover
          className={`inline-block ${botaoSecundario}`}
        >
          Voltar para membros
        </Link>
      </div>
    </section>
  )
}
