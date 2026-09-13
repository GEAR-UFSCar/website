import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"

import { OG_IMAGE } from "@/lib/site"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { PROJETOS, FRENTES_PROJETO, type Projeto } from "@/lib/projetos"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"

const DESCRICAO =
  "Os robôs e sistemas que a GEAR construiu — problema atacado, decisões técnicas com a alternativa descartada, arquitetura, resultados e o que ainda não funciona."

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
 * PORTFÓLIO TÉCNICO
 *
 * Três princípios que separam isto de uma página comercial:
 *
 * 1. Toda seção vazia se DECLARA. "Ainda não competiu" é melhor que esconder
 *    a seção — omitir é o que página de vendas faz.
 * 2. Número acompanhado de método: o parâmetro fica ao lado do algoritmo que
 *    o usa, não solto numa lista de especificações.
 * 3. Nenhum adjetivo de qualidade. Sem "robusto", "inovador", "de ponta".
 *
 * A ordem é deliberada: problema → objetivo → arquitetura → DECISÕES →
 * limitação → resultados. É a sequência em que alguém avalia trabalho técnico.
 */

function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
      {children}
    </p>
  )
}

/** Estado vazio declarado — a seção nunca some da página. */
function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 font-mono text-[11px] tracking-wider uppercase text-muted-foreground">
      {children}
    </p>
  )
}

function FichaProjeto({ projeto }: { projeto: Projeto }) {
  const temMaterial = Boolean(projeto.repositorio || projeto.documentacao || projeto.video)

  return (
    <article
      id={projeto.slug}
      className="mt-12 border border-white/10 scroll-mt-24 transition-colors duration-300 hover:border-[var(--gear-amber)]"
    >
      {projeto.foto && (
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--gear-navy)]">
          <Image
            src={projeto.foto}
            alt={`${projeto.nome} — robô da GEAR UFSCar`}
            fill
            sizes="(min-width: 768px) 72rem, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="p-7 md:p-10">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="font-sans text-2xl md:text-4xl font-light tracking-tight">{projeto.nome}</h3>
          <span className="border border-white/20 px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            {projeto.etapa}
          </span>
          <span className="border border-white/20 px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            {projeto.anoInicio ? `desde ${projeto.anoInicio}` : "ano a definir"}
          </span>
        </div>

        <p className="mt-4 max-w-[62ch] font-sans text-lg font-light leading-relaxed">
          {projeto.resumo}
        </p>

        <p className="mt-4 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
          Constroem:{" "}
          <Link
            href="/time"
            data-cursor-hover
            className="text-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
          >
            {projeto.integrantes.join(" · ")}
          </Link>
          {projeto.contexto ? ` · ${projeto.contexto}` : ""}
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-white/10 pt-6">
          <div>
            <Rotulo>01 · O problema</Rotulo>
            <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
              {projeto.problema}
            </p>
          </div>
          <div>
            <Rotulo>02 · Objetivo</Rotulo>
            <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
              {projeto.objetivo}
            </p>
            {projeto.hipotese && (
              <>
                <p className="mt-5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                  Hipótese
                </p>
                <p className="mt-2 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                  {projeto.hipotese}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-10 border-t border-white/10 pt-6">
          <div className="flex-1">
            <Rotulo>03 · Arquitetura</Rotulo>
            {projeto.arquitetura ? (
              <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                {projeto.arquitetura}
              </p>
            ) : (
              <Vazio>Ainda não descrita</Vazio>
            )}
          </div>

          {/*
            * order-first abaixo de lg: empilhada, a stack caía depois do texto.
            * É o bloco mais escaneável e quem abre no celular procura por ele.
            */}
          <div className="order-first w-full lg:order-none lg:max-w-[19rem] shrink-0 self-start border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-5">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
              STACK
            </p>

            {[
              { titulo: "Hardware", itens: projeto.stack.hardware },
              { titulo: "Software", itens: projeto.stack.software },
            ].map((camada) => (
              <div key={camada.titulo} className="mt-4">
                <p className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                  {camada.titulo}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {camada.itens.map((item) => (
                    <li key={item} className="font-mono text-[11px] text-foreground break-words">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="mt-4">
              <p className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                Algoritmos
              </p>
              <ul className="mt-1 space-y-2">
                {projeto.stack.algoritmos.map((algoritmo) => (
                  <li key={algoritmo.nome}>
                    <p className="font-mono text-[11px] text-foreground">{algoritmo.nome}</p>
                    {/* o parâmetro fica junto do algoritmo: número com método */}
                    {algoritmo.parametros && (
                      <p className="font-mono text-[10px] text-muted-foreground break-words">
                        {algoritmo.parametros}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* O núcleo do portfólio: decisão com a alternativa descartada */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <Rotulo>04 · Decisões técnicas</Rotulo>
          <ul className="mt-5 space-y-6">
            {projeto.decisoes.map((decisao) => (
              <li key={decisao.decisao} className="border-l border-white/15 pl-5">
                <p className="max-w-[62ch] font-sans text-base leading-relaxed">{decisao.decisao}</p>
                {decisao.descartado && (
                  <p className="mt-2 max-w-[62ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-[var(--gear-amber)]">Descartado:</span> {decisao.descartado}
                  </p>
                )}
                <p className="mt-2 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  {decisao.porque}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Identidade editorial: obrigatório no tipo, não pode faltar */}
        <div className="mt-8 border-l-2 border-l-[var(--gear-amber)] pl-6">
          <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
            05 · O QUE AINDA NÃO FUNCIONA
          </p>
          <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
            {projeto.limitacao}
          </p>
          {projeto.dificuldades?.length ? (
            <>
              <p className="mt-5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                O que custou caro
              </p>
              <ul className="mt-2 space-y-2">
                {projeto.dificuldades.map((dificuldade) => (
                  <li
                    key={dificuldade}
                    className="max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground"
                  >
                    {dificuldade}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-white/10 pt-6">
          <div>
            <Rotulo>06 · Competições</Rotulo>
            {projeto.competicoes?.length ? (
              <ul className="mt-3 space-y-2">
                {projeto.competicoes.map((competicao) => (
                  <li
                    key={`${competicao.evento}-${competicao.ano}`}
                    className="font-mono text-[11px] tracking-wider text-foreground"
                  >
                    <span className="text-[var(--gear-amber)]">{competicao.ano}</span> ·{" "}
                    {competicao.evento} — {competicao.resultado}
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>Ainda não competiu</Vazio>
            )}
          </div>
          <div>
            <Rotulo>Métricas</Rotulo>
            {projeto.metricas?.length ? (
              <ul className="mt-3 space-y-3">
                {projeto.metricas.map((metrica) => (
                  <li key={metrica.nome}>
                    <p className="font-mono text-[11px] text-foreground">
                      {metrica.nome}: {metrica.valor}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">{metrica.metodo}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>Sem medição formal</Vazio>
            )}
          </div>
        </div>

        {projeto.proximosPassos?.length ? (
          <div className="mt-8 border-t border-white/10 pt-6">
            <Rotulo>07 · Próximos passos</Rotulo>
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

        <div className="mt-8 border-t border-white/10 pt-6">
          <Rotulo>08 · Material</Rotulo>
          {temMaterial ? (
            <div className="mt-3 flex flex-wrap gap-5">
              {[
                { href: projeto.repositorio, texto: "REPOSITÓRIO" },
                { href: projeto.documentacao, texto: "DOCUMENTAÇÃO" },
                { href: projeto.video, texto: "VÍDEO" },
              ]
                .filter((l) => l.href)
                .map((l) => (
                  <a
                    key={l.texto}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor-hover
                    className="font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                  >
                    {l.texto} →
                  </a>
                ))}
            </div>
          ) : (
            <Vazio>Código e documentação ainda não publicados</Vazio>
          )}
        </div>
      </div>
    </article>
  )
}

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
        <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            O QUE CONSTRUÍMOS
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            PROJETOS
            <br />
            <span className="italic">em andamento</span>
          </h1>

          <p className="mt-10 max-w-[62ch] font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Cada ficha traz o problema, o que decidimos e o que descartamos para chegar lá, a
            arquitetura, os resultados — e o que ainda não funciona. A última parte é a que costuma
            faltar em portfólio de robótica, e é a que mais importa para quem vai trabalhar nisso.
          </p>

          <p className="mt-8 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {PROJETOS.length === 1 ? "UM PROJETO PUBLICADO" : `${PROJETOS.length} PROJETOS PUBLICADOS`}
          </p>

          {PROJETOS.length === 0 && (
            <Aviso titulo="NENHUM PROJETO PUBLICADO" className="mt-10 max-w-2xl">
              Adicione entradas em <code>lib/projetos.ts</code> — cada bloco vira uma ficha aqui, sem
              nenhuma outra mudança.
            </Aviso>
          )}

          {/*
            * Agrupado por frente, sem filtro. Com dois projetos, um filtro que
            * devolve um resultado é pior que nenhum filtro. Área técnica e
            * estado passam a valer por volta de 5 e 8 projetos.
            */}
          {porFrente.map(({ frente, projetos }, indiceFrente) => (
            <section key={frente} className="mt-20">
              <div className="border-t border-white/10 pt-8">
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                  0{indiceFrente + 1} — FRENTE {frente.toUpperCase()}
                </p>
                <h2 className="font-sans text-3xl md:text-5xl font-light italic">{frente}</h2>
              </div>

              {projetos.map((projeto) => (
                <FichaProjeto key={projeto.slug} projeto={projeto} />
              ))}
            </section>
          ))}

          <div className="mt-20 flex flex-col sm:flex-row gap-5">
            <Link href="/time" data-cursor-hover className={`text-center ${botaoPrimario}`}>
              Quem constrói isso
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
