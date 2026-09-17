import Image from "next/image"
import Link from "next/link"
import { Surge } from "@/components/surge"
import { MarqueeLogos, type ParceiroLogo } from "@/components/marquee-row"
import logoNta from "@/public/nta-logo.png"

import { CONTATO_PARCERIA, EMAIL_CONTATO } from "@/lib/site"
import { NIVEIS, RESPONSAVEL_PATROCINIO, VALOR } from "@/lib/parceiros"
import { Aviso } from "@/components/aviso"
import { botaoPrimario } from "@/lib/ui"



/*
 * Quem já apoia.
 *
 * Com UM parceiro a faixa de rolagem não se sustenta: o marquee precisa
 * repetir o mesmo logo quatro vezes só para ter largura, e o que lê na tela é
 * repetição forçada, não ritmo. Por isso a seção 03 mostra um card único e
 * grande enquanto `parceiros.length === 1`, e volta para <MarqueeLogos> a
 * partir do segundo — sem mexer neste array, que já está no formato final.
 *
 * O logo vem por import estático: se o arquivo sumir do repositório, o build
 * quebra, em vez de a página ir ao ar com um retângulo vazio.
 */
const parceiros: ParceiroLogo[] = [
  { nome: "NTA — Núcleo de Tecnologia Assistiva", logo: logoNta, url: "https://www.nta.ufscar.br/" },
]



export function Parceiros() {
  return (
    <>
      {/* Cabeçalho */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <Surge delay={0.1}>
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            PARCERIAS · PATROCÍNIO
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            APOIAR
            <br />
            <span className="italic">quem constrói</span>
          </h1>
        </Surge>
      </section>

      {/* 01 — Proposta de valor */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">01 — O QUE O APOIO COMPRA</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Proposta de valor</h2>
        </Surge>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALOR.map((bloco, index) => (
            <Surge key={bloco.titulo} delay={index * 0.1} className="border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
                0{index + 1}
              </p>
              <h3 className="mt-4 font-sans text-2xl md:text-3xl font-light tracking-tight">{bloco.titulo}</h3>
              <p className="mt-4 font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                {bloco.texto}
              </p>
            </Surge>
          ))}
        </div>
      </section>

      {/* 03 — Parceiros — quem já apoia vem antes de como apoiar */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Surge className="px-8 md:px-12 mb-16 mx-auto max-w-6xl">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">02 — PARCEIROS</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Quem já está junto</h2>
        </Surge>

        {parceiros.length > 1 ? (
          <MarqueeLogos items={parceiros} />
        ) : (
          <div className="mx-auto max-w-6xl px-8 md:px-12">
            {parceiros.map((parceiro, index) => (
              <Surge key={parceiro.nome} delay={index * 0.1} className="flex flex-col items-center">
                <a
                  href={parceiro.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor-hover
                  /*
                   * A placa clara é a mesma decisão do marquee: o PNG do NTA é
                   * azul sólido com fundo transparente e some contra o ink do
                   * site. O suporte é da nossa paleta (--gear-fog), a marca
                   * continua deles — recolorir logo de terceiro não nos cabe.
                   */
                  className="group inline-block rounded border border-white/10 bg-[var(--gear-fog)] px-10 py-8 md:px-16 md:py-12 transition duration-300 hover:border-[var(--gear-amber)] hover:scale-[1.02]"
                >
                  <Image
                    src={parceiro.logo}
                    alt={`${parceiro.nome} — abre o site do parceiro`}
                    /* h-* com w-auto define as duas dimensões em CSS, que é
                       como o next/image aceita redimensionamento sem avisar de
                       proporção. */
                    className="h-24 w-auto md:h-32"
                  />
                </a>
                <p className="mt-6 text-center font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                  {parceiro.nome}
                </p>
              </Surge>
            ))}
          </div>
        )}
      </section>

      {/* 04 — Níveis de patrocínio */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">03 — CONTRAPARTIDAS</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Níveis de patrocínio</h2>
        </Surge>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {NIVEIS.map((nivel, index) => (
            <Surge key={nivel.nome} delay={index * 0.1} className={`flex flex-col border p-7 transition-colors duration-300 ${
                nivel.destaque
                  ? "border-[var(--gear-amber)] bg-[var(--gear-navy)]"
                  : "border-white/10 hover:border-[var(--gear-amber)]"
              }`}>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
                {nivel.apoioIndividual ? "Apoio individual" : `Nível 0${index}`}
              </p>
              <h3 className="mt-4 font-sans text-2xl md:text-3xl font-light tracking-tight uppercase">
                {nivel.nome}
              </h3>

              {nivel.herda && (
                <p className="mt-4 border-t border-white/10 pt-4 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {nivel.herda}
                </p>
              )}

              <ul className={`space-y-3 ${nivel.herda ? "mt-4" : "mt-6 border-t border-white/10 pt-6"}`}>
                {nivel.beneficios.map((beneficio) => (
                  <li key={beneficio} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-[var(--gear-amber)]" />
                    <span className="font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                      {beneficio}
                    </span>
                  </li>
                ))}
              </ul>
            </Surge>
          ))}
        </div>

        <Surge as="p" delay={0.2} className="mt-10 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
          Valores e contrapartidas adicionais são definidos em conversa direta; entre em contato pelo
          e-mail abaixo. Para levar a proposta a um comitê interno, há uma versão imprimível com
          tudo o que está nesta página:{" "}
          <Link
            href="/parceiros/proposta"
            data-cursor-hover
            className="text-[var(--gear-amber)] hover:underline"
          >
            proposta de patrocínio
          </Link>
          .
        </Surge>

        {/*
         * Quem responde por patrocínio. A RoboJackets nomeia a pessoa e usa um
         * e-mail dedicado; empresa quer saber com quem vai falar, não escrever
         * para um contato genérico. Sem nome definido, mostra a pendência em
         * vez de inventar alguém.
         */}
        <p className="mt-6 max-w-2xl font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
          {RESPONSAVEL_PATROCINIO.nome
            ? `Responde por patrocínio: ${RESPONSAVEL_PATROCINIO.nome} · ${RESPONSAVEL_PATROCINIO.cargo}`
            : `Responde por patrocínio: ${RESPONSAVEL_PATROCINIO.cargo} — nome a designar pela diretoria`}
        </p>
      </section>

      {/* 04 — Contato */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">04 — CONTATO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Falar com a gente</h2>
        </Surge>

        <Surge delay={0.1} className="max-w-3xl">
          <p className="font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Apoio pode ser equipamento, verba, serviço ou mentoria técnica. Não precisa ser dinheiro.
            Escreva dizendo o que faz sentido para a sua empresa e respondemos com o que isso destrava
            em qual projeto, de forma específica.
          </p>

          {EMAIL_CONTATO ? (
            <a
              href={CONTATO_PARCERIA}
              data-cursor-hover
              className={`mt-10 inline-block ${botaoPrimario}`}
            >
              {EMAIL_CONTATO}
            </a>
          ) : (
            <Aviso titulo="CANAL AINDA NÃO PUBLICADO" className="mt-10">
              O endereço de contato do grupo ainda não foi definido nesta página. Preencher a constante{" "}
              <span className="font-mono text-foreground">EMAIL_CONTATO</span> publica o botão de
              e-mail automaticamente no lugar deste aviso.
            </Aviso>
          )}
        </Surge>
      </section>
    </>
  )
}
