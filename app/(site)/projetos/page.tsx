import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"

import { OG_IMAGE } from "@/lib/site"
import { Aviso } from "@/components/aviso"
import { PROJETOS, type Projeto } from "@/lib/projetos"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"

const DESCRICAO =
  "Os robôs e sistemas que a GEAR construiu — problema atacado, decisões técnicas com a alternativa descartada, arquitetura e resultados."

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
 * PORTFÓLIO TÉCNICO — UM CAPÍTULO POR ROBÔ
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
 * resultados. É a sequência em que alguém avalia trabalho técnico.
 *
 * SOBRE O ENQUADRAMENTO DA FOTO: as fotos dos robôs são retrato (1200×1600).
 * A versão anterior desta página as jogava num contêiner `aspect-[2/1]` com
 * object-cover, o que descartava ~62% da imagem e deixava só uma faixa central
 * do robô. Aqui a foto nunca é cortada: `object-contain` preserva o quadro
 * inteiro, e o vazio que sobraria nas laterais é preenchido pela mesma imagem
 * desfocada ao fundo. Serve qualquer proporção — retrato, quadrada ou
 * horizontal — sem precisar reenquadrar arquivo nenhum.
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="border border-white/25 bg-[var(--gear-ink)]/60 px-2.5 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-foreground backdrop-blur-sm">
      {children}
    </span>
  )
}

/** Abertura do capítulo: o robô ocupa a tela antes de qualquer texto técnico. */
function Abertura({ projeto, indice }: { projeto: Projeto; indice: number }) {
  const numero = String(indice + 1).padStart(2, "0")

  return (
    <header className="relative flex h-[88vh] max-h-[54rem] min-h-[32rem] w-full items-end overflow-hidden bg-[var(--gear-ink)]">
      {projeto.foto ? (
        <>
          {/*
            Camada de fundo: a MESMA foto, borrada e escurecida, só para
            preencher o que sobraria ao lado de um retrato. Decorativa — o alt
            fica na camada nítida, e um leitor de tela não deve anunciar duas.
          */}
          <Image
            src={projeto.foto}
            alt=""
            aria-hidden="true"
            fill
            priority={indice === 0}
            sizes="100vw"
            className="scale-110 object-cover opacity-35 blur-2xl"
          />

          {/* Camada nítida: quadro inteiro, sem corte, em qualquer proporção. */}
          <Image
            src={projeto.foto}
            alt={`${projeto.nome} — robô construído pela GEAR UFSCar`}
            fill
            priority={indice === 0}
            sizes="100vw"
            className="object-contain"
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-muted-foreground">
            sem foto publicada
          </span>
        </div>
      )}

      {/* Degradê de leitura: sem ele o nome some sobre a parte clara da foto. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--gear-ink)] via-[var(--gear-ink)]/80 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-6xl px-8 pb-12 md:px-12 md:pb-16">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--gear-amber)]">
          {numero} — {projeto.frente.toUpperCase()}
        </p>
        <h2 className="mt-3 font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
          {projeto.nome}
        </h2>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Chip>{projeto.etapa}</Chip>
          <Chip>{projeto.anoInicio ? `desde ${projeto.anoInicio}` : "ano a definir"}</Chip>
          {projeto.contexto && <Chip>{projeto.contexto}</Chip>}
        </div>
      </div>
    </header>
  )
}

/** Fotos adicionais do mesmo robô. Cresce sozinha conforme `galeria` é preenchida. */
function Galeria({ projeto }: { projeto: Projeto }) {
  if (!projeto.galeria?.length) return null

  return (
    <div className="mt-12 grid grid-cols-2 gap-2 md:grid-cols-3">
      {projeto.galeria.map((foto, i) => (
        <div
          key={foto}
          className="group relative aspect-[4/3] overflow-hidden border border-white/10 bg-[var(--gear-navy)]"
        >
          {/*
            Mesmo tratamento da Abertura, pela mesma razão: aqui entram
            retrato (1200×1600), 16:9 e 4:3 no mesmo quadro. object-cover
            cortaria — numa foto de tela, corte come justamente o dado que
            a foto existe para mostrar. O fundo desfocado preenche a sobra.
          */}
          <Image
            src={foto}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 768px) 24rem, 50vw"
            className="scale-110 object-cover opacity-35 blur-2xl"
          />
          <Image
            src={foto}
            alt={`${projeto.nome} — registro ${i + 1}`}
            fill
            sizes="(min-width: 768px) 24rem, 50vw"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  )
}

function StackTecnica({ projeto }: { projeto: Projeto }) {
  return (
    <div className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-5">
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
  )
}

function Capitulo({ projeto, indice }: { projeto: Projeto; indice: number }) {
  const temMaterial = Boolean(projeto.repositorio || projeto.documentacao || projeto.video)

  return (
    <article id={projeto.slug} className="scroll-mt-20">
      <Abertura projeto={projeto} indice={indice} />

      <div className="mx-auto max-w-6xl px-8 md:px-12">
        {/* Entrada em prosa: a frase única, grande, antes de qualquer tabela. */}
        <div className="border-b border-white/10 py-14 md:py-20">
          <p className="max-w-[46ch] font-sans text-2xl md:text-4xl font-light leading-snug text-balance">
            {projeto.resumo}
          </p>
          <p className="mt-8 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            Constroem:{" "}
            <Link
              href="/time"
              data-cursor-hover
              className="text-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
            >
              {projeto.integrantes.join(" · ")}
            </Link>
          </p>

          <Galeria projeto={projeto} />
        </div>

        {/* 01/02 — por que existe e o que conta como pronto */}
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 py-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Rotulo>01 · O problema</Rotulo>
            <p className="mt-4 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
              {projeto.problema}
            </p>
          </div>
          <div>
            <Rotulo>02 · Objetivo</Rotulo>
            <p className="mt-4 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
              {projeto.objetivo}
            </p>
            {projeto.hipotese && (
              <>
                <p className="mt-6 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                  Hipótese
                </p>
                <p className="mt-2 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                  {projeto.hipotese}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 03 — arquitetura com a stack ao lado, que é o bloco mais escaneável */}
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 py-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Rotulo>03 · Arquitetura</Rotulo>
            {projeto.arquitetura ? (
              <p className="mt-4 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
                {projeto.arquitetura}
              </p>
            ) : (
              <Vazio>Ainda não descrita</Vazio>
            )}
          </div>
          {/*
            order-first abaixo de lg: empilhada, a stack caía depois do texto.
            É o bloco mais escaneável e quem abre no celular procura por ele.
          */}
          <div className="order-first self-start lg:order-none lg:col-span-5">
            <StackTecnica projeto={projeto} />
          </div>
        </div>

        {/* 04 — o núcleo do portfólio: decisão com a alternativa descartada */}
        <div className="border-b border-white/10 py-12">
          <Rotulo>04 · Decisões técnicas</Rotulo>
          <ul className="mt-8 grid grid-cols-1 gap-px bg-white/10 md:grid-cols-2">
            {projeto.decisoes.map((decisao) => (
              <li
                key={decisao.decisao}
                className="flex h-full flex-col bg-[var(--gear-ink)] p-6 transition-colors duration-300 hover:bg-[var(--gear-navy)]"
              >
                <p className="max-w-[62ch] font-sans text-lg font-light leading-relaxed">
                  {decisao.decisao}
                </p>
                {decisao.descartado && (
                  <p className="mt-4 max-w-[62ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-[var(--gear-amber)]">Descartado:</span>{" "}
                    {decisao.descartado}
                  </p>
                )}
                <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  {decisao.porque}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* 05/06 — resultado medido e o que vem depois */}
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 py-12 md:grid-cols-3 md:gap-12">
          <div>
            <Rotulo>05 · Competições</Rotulo>
            {projeto.competicoes?.length ? (
              <ul className="mt-4 space-y-2">
                {projeto.competicoes.map((competicao) => (
                  <li
                    key={`${competicao.evento}-${competicao.ano}`}
                    className="font-mono text-[11px] leading-relaxed tracking-wider text-foreground"
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
              <ul className="mt-4 space-y-3">
                {projeto.metricas.map((metrica) => (
                  <li key={metrica.nome}>
                    <p className="font-mono text-[11px] text-foreground">
                      {metrica.nome}: {metrica.valor}
                    </p>
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {metrica.metodo}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>Sem medição formal</Vazio>
            )}
          </div>

          <div>
            <Rotulo>06 · Próximos passos</Rotulo>
            {projeto.proximosPassos?.length ? (
              <ul className="mt-4 space-y-2">
                {projeto.proximosPassos.map((passo) => (
                  <li key={passo} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-px w-3 shrink-0 bg-[var(--gear-amber)]"
                    />
                    <span className="max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                      {passo}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>Ainda não definidos</Vazio>
            )}
          </div>
        </div>

        {/* 07 — material */}
        <div className="py-12">
          <Rotulo>07 · Material</Rotulo>
          {temMaterial ? (
            <div className="mt-4 flex flex-wrap gap-5">
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
  return (
    <>
      {/* Abertura da página */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-20 md:pt-48 md:pb-24">
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
          arquitetura e os resultados. A decisão vem sempre com a alternativa que ficou de fora,
          que é o que separa um portfólio técnico de uma lista de especificações.
        </p>

        {/* Índice dos capítulos: com poucos robôs, um sumário vale mais que um filtro. */}
        {PROJETOS.length > 0 && (
          <nav aria-label="Robôs nesta página" className="mt-12 border-t border-white/10 pt-6">
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
              {PROJETOS.length === 1
                ? "UM PROJETO PUBLICADO"
                : `${PROJETOS.length} PROJETOS PUBLICADOS`}
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
              {PROJETOS.map((projeto, indice) => (
                <li key={projeto.slug}>
                  <Link
                    href={`#${projeto.slug}`}
                    data-cursor-hover
                    className="group flex items-baseline gap-3"
                  >
                    <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)]">
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                    <span className="font-sans text-2xl md:text-3xl font-light tracking-tight transition-colors duration-300 group-hover:text-[var(--gear-amber)]">
                      {projeto.nome}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      {projeto.frente}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {PROJETOS.length === 0 && (
          <Aviso titulo="NENHUM PROJETO PUBLICADO" className="mt-10 max-w-2xl">
            Adicione entradas em <code>lib/projetos.ts</code> — cada bloco vira um capítulo aqui,
            sem nenhuma outra mudança.
          </Aviso>
        )}
      </section>

      {/* Um capítulo por robô */}
      {PROJETOS.map((projeto, indice) => (
        <Capitulo key={projeto.slug} projeto={projeto} indice={indice} />
      ))}

      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pb-24 md:pb-32">
        <div className="flex flex-col sm:flex-row gap-5 border-t border-white/10 pt-16">
          <Link href="/time" data-cursor-hover className={`text-center ${botaoPrimario}`}>
            Quem constrói isso
          </Link>
          <Link href="/parceiros" data-cursor-hover className={`text-center ${botaoSecundario}`}>
            Apoiar os projetos
          </Link>
        </div>
      </section>
    </>
  )
}
