import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { OG_IMAGE } from "@/lib/site"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { PROJETOS, FRENTES_PROJETO } from "@/lib/projetos"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"

const DESCRICAO =
  "Os robôs e sistemas que a GEAR construiu — problema atacado, abordagem técnica, ficha de especificações, resultados e o que ainda não funciona."

export const metadata: Metadata = {
  title: "Projetos | GEAR",
  description: DESCRICAO,
  openGraph: {
    title: "Projetos | GEAR",
    description: DESCRICAO,
    url: "/projetos",
    images: [OG_IMAGE],
  },
}

/*
 * Portfólio público.
 *
 * Decisão de estrutura: resultado de competição é CAMPO do projeto, não página
 * separada. É como RoboFEI e ThundeRatz organizam — o robô é a unidade, a
 * colocação é um atributo dele. Uma página em vez de duas, e metade do
 * conteúdo para manter.
 *
 * `limitacao` é o campo que carrega a identidade editorial da GEAR: as
 * referências mostram só o que funcionou. Fica em destaque âmbar, o mesmo
 * tratamento que "Transparência" recebe na home.
 */
export default function ProjetosPage() {
  const porFrente = FRENTES_PROJETO.map((frente) => ({
    frente,
    projetos: PROJETOS.filter((p) => p.frente === frente),
  })).filter((g) => g.projetos.length > 0)

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            O QUE CONSTRUÍMOS
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            PROJETOS
            <br />
            <span className="italic">em andamento</span>
          </h1>

          <p className="mt-10 max-w-[62ch] font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Cada ficha traz o problema que o projeto ataca, como resolvemos, o que usamos — e o que
            ainda não funciona. A última parte é a que costuma faltar em portfólio de robótica, e é
            a que mais importa para quem vai trabalhar nisso.
          </p>

          <p className="mt-8 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {PROJETOS.length} PROJETO(S) PUBLICADO(S)
          </p>

          {PROJETOS.length === 0 && (
            <Aviso titulo="NENHUM PROJETO PUBLICADO" className="mt-10 max-w-2xl">
              Adicione entradas em <code>lib/projetos.ts</code> — cada bloco vira uma ficha aqui,
              sem nenhuma outra mudança.
            </Aviso>
          )}

          {porFrente.map(({ frente, projetos }, indiceFrente) => (
            <section key={frente} className="mt-20">
              <div className="border-t border-white/10 pt-8">
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                  0{indiceFrente + 1} — FRENTE {frente.toUpperCase()}
                </p>
                <h2 className="font-sans text-3xl md:text-5xl font-light italic">{frente}</h2>
              </div>

              {projetos.map((projeto) => (
                <article
                  key={projeto.slug}
                  id={projeto.slug}
                  className="mt-12 border border-white/10 scroll-mt-24"
                >
                  {projeto.foto && (
                    <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--gear-navy)]">
                      <Image
                        src={projeto.foto}
                        alt={`${projeto.nome} — robô da GEAR UFSCar`}
                        fill
                        sizes="(min-width: 768px) 64rem, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-7 md:p-10">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h3 className="font-sans text-2xl md:text-4xl font-light tracking-tight">
                        {projeto.nome}
                      </h3>
                      <span className="border border-white/20 px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                        {projeto.etapa}
                      </span>
                    </div>

                    <p className="mt-4 max-w-[62ch] font-sans text-lg font-light leading-relaxed">
                      {projeto.resumo}
                    </p>

                    {/* Problema */}
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
                        O problema
                      </p>
                      <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                        {projeto.problema}
                      </p>
                    </div>

                    {/* Abordagem + ficha lado a lado */}
                    <div className="mt-8 flex flex-col lg:flex-row gap-10">
                      <div className="flex-1 border-t border-white/10 pt-6">
                        <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
                          Como resolvemos
                        </p>
                        {projeto.abordagem.map((paragrafo) => (
                          <p
                            key={paragrafo.slice(0, 40)}
                            className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground"
                          >
                            {paragrafo}
                          </p>
                        ))}
                      </div>

                      <div className="w-full lg:max-w-[17rem] shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-5 self-start">
                        <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
                          FICHA TÉCNICA
                        </p>
                        <dl className="mt-4 space-y-4">
                          {projeto.ficha.map((linha) => (
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
                    </div>

                    {/* Tecnologias */}
                    <div className="mt-8 flex flex-wrap gap-2">
                      {projeto.tecnologias.map((tec) => (
                        <span
                          key={tec}
                          className="border border-white/15 px-3 py-1.5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground"
                        >
                          {tec}
                        </span>
                      ))}
                    </div>

                    {/* A limitação assumida — o diferencial editorial da GEAR */}
                    {projeto.limitacao && (
                      <div className="mt-8 border-l-2 border-l-[var(--gear-amber)] pl-6">
                        <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
                          O QUE AINDA NÃO FUNCIONA
                        </p>
                        <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                          {projeto.limitacao}
                        </p>
                      </div>
                    )}

                    {/* Competições — campo do projeto, não página separada */}
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                        Competições
                      </p>
                      {projeto.competicoes?.length ? (
                        <ul className="mt-3 space-y-2">
                          {projeto.competicoes.map((c) => (
                            <li
                              key={`${c.evento}-${c.ano}`}
                              className="font-mono text-[11px] tracking-wider text-foreground"
                            >
                              <span className="text-[var(--gear-amber)]">{c.ano}</span> · {c.evento}{" "}
                              — {c.resultado}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 font-mono text-[11px] tracking-wider text-muted-foreground">
                          AINDA NÃO COMPETIU
                        </p>
                      )}
                    </div>

                    {projeto.proximosPassos?.length ? (
                      <div className="mt-8 border-t border-white/10 pt-6">
                        <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                          Próximos passos
                        </p>
                        <ul className="mt-3 space-y-2">
                          {projeto.proximosPassos.map((passo) => (
                            <li key={passo} className="flex gap-3">
                              <span
                                aria-hidden="true"
                                className="mt-2.5 h-px w-3 shrink-0 bg-[var(--gear-amber)]"
                              />
                              <span className="max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                                {passo}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {projeto.repositorio && (
                      <a
                        href={projeto.repositorio}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor-hover
                        className="mt-8 inline-block font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                      >
                        VER REPOSITÓRIO →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ))}

          <div className="mt-20 flex flex-col sm:flex-row gap-5">
            <Link href="/processo-seletivo" data-cursor-hover className={`text-center ${botaoPrimario}`}>
              Quero construir isso
            </Link>
            <Link href="/parceiros" data-cursor-hover className={`text-center ${botaoSecundario}`}>
              Apoiar os projetos
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
