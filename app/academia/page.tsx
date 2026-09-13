import type { Metadata } from "next"
import Link from "next/link"

import { CONTATO_INGRESSO, OG_IMAGE } from "@/lib/site"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { MODULOS, NIVEIS_ACADEMIA, DESCRICAO_NIVEL, REGRA_SEQUENCIAL } from "@/lib/academia"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"

const DESCRICAO =
  "A formação que todo membro da GEAR percorre antes de escolher uma frente: nove módulos em três níveis, de fundamentos de robótica a aprendizado por reforço."

export const metadata: Metadata = {
  title: "Academia | GEAR",
  description: DESCRICAO,
  openGraph: {
    title: "Academia GEAR",
    description: DESCRICAO,
    url: "/academia",
    images: [OG_IMAGE],
  },
}

/*
 * ACADEMIA PÚBLICA
 *
 * A ementa estava inteiramente atrás do login. Das seis referências do
 * benchmarking, a RoboJackets mantém "Training" no menu principal — e é o
 * melhor material de recrutamento que uma entidade tem: mostra exatamente o
 * que a pessoa vai aprender, antes de ela se comprometer.
 *
 * O que fica público é a ementa; o que continua privado é o PROGRESSO
 * individual, que é dado pessoal. A página termina apontando para /entrar.
 */
export default function AcademiaPage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            FORMAÇÃO · NOVE MÓDULOS
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            ACADEMIA
            <br />
            <span className="italic">GEAR</span>
          </h1>

          <p className="mt-10 max-w-[62ch] font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Ninguém entra direto numa frente. Todo mundo percorre a mesma formação antes — é o que
            faz a escolha do fim ser informada, e o que garante que o grupo inteiro compartilhe um
            vocabulário. A ementa completa está abaixo, aberta.
          </p>

          <p className="mt-8 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
            {REGRA_SEQUENCIAL}
          </p>

          <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {MODULOS.length} MÓDULOS · {NIVEIS_ACADEMIA.length} NÍVEIS
          </p>

          {NIVEIS_ACADEMIA.map((nivel, indice) => {
            const doNivel = MODULOS.filter((m) => m.nivel === nivel).sort((a, b) => a.ordem - b.ordem)

            return (
              <section key={nivel} className="mt-16">
                <div className="border-t border-white/10 pt-8">
                  <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                    0{indice + 1} — NÍVEL {nivel.toUpperCase()}
                  </p>
                  <h2 className="font-sans text-3xl md:text-5xl font-light italic">{nivel}</h2>
                  <p className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                    {DESCRICAO_NIVEL[nivel]}
                  </p>
                </div>

                <ul className="mt-8 space-y-px">
                  {doNivel.map((modulo) => (
                    <li key={modulo.titulo} className="flex gap-5 border-t border-white/10 py-6">
                      <span className="shrink-0 font-mono text-xs text-[var(--gear-amber)] pt-1">
                        {modulo.ordem}
                      </span>
                      <h3 className="font-sans text-lg md:text-xl font-light leading-snug">
                        {modulo.titulo}
                      </h3>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          {/* O que a formação não é — na linguagem editorial do resto do site */}
          <section className="mt-20 border-l-2 border-l-[var(--gear-amber)] pl-6 md:pl-8">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
              O QUE A ACADEMIA NÃO É
            </p>
            <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
              Não é curso com certificado, não substitui disciplina de graduação e não tem prazo fixo
              de conclusão — cada pessoa avança no ritmo que consegue. Também não é pré-requisito
              para entrar: é o que acontece depois de entrar.
            </p>
          </section>

          <div className="mt-16 flex flex-col sm:flex-row gap-5">
            <Link href="/ingressar" data-cursor-hover className={`text-center ${botaoPrimario}`}>
              Como entrar na GEAR
            </Link>
            <Link href="/entrar" data-cursor-hover className={`text-center ${botaoSecundario}`}>
              Já sou membro
            </Link>
          </div>

          <p className="mt-6 max-w-[62ch] font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            Membros acompanham o próprio progresso na área de membros ·{" "}
            <a href={CONTATO_INGRESSO} data-cursor-hover className="text-[var(--gear-amber)] hover:underline">
              dúvidas sobre a formação
            </a>
          </p>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
