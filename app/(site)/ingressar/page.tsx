import type { Metadata } from "next"
import Link from "next/link"

import { CONTATO_INGRESSO, OG_IMAGE } from "@/lib/site"
import { Aviso } from "@/components/aviso"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"
import { ETAPAS_FORMACAO } from "@/lib/formacao"

const DESCRICAO =
  "Como entrar na GEAR UFSCar: sem pré-requisito técnico, aberto a qualquer curso de graduação do campus Sorocaba. O que esperar do processo e da formação."

export const metadata: Metadata = {
  title: "Ingressar | GEAR",
  description: DESCRICAO,
  openGraph: {
    title: "Ingressar na GEAR",
    description: DESCRICAO,
    url: "/ingressar",
    images: [OG_IMAGE],
  },
}

/*
 * DESTINO TERMINAL DO CANDIDATO
 *
 * Com a rota /processo-seletivo removida, o site ficou sem nenhum ponto de
 * chegada: /frentes e /projetos apontavam um para o outro num anel, e /sobre
 * e /time não levavam a lugar nenhum. Quatro das seis referências do
 * benchmarking têm "Join Us" ou "Apply" no primeiro nível do menu.
 *
 * Esta página NÃO inventa processo seletivo aberto. Ela diz o que é verdade
 * hoje: não há inscrição em andamento, e quem quiser ser avisado escreve.
 * Quando o ciclo abrir, é trocar o bloco de estado por datas e formulário.
 */


export default function IngressarPage() {
  return (
    <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
        GRADUAÇÃO · UFSCAR SOROCABA
      </p>
      <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
        COMO
        <br />
        <span className="italic">entrar</span>
      </h1>

      <p className="mt-10 max-w-[62ch] font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
        Não existe pré-requisito técnico, porque a Academia GEAR nivela todo mundo. Exigir
        conhecimento prévio filtraria por quem já teve acesso antes, e não por quem tem
        potencial agora.
      </p>

      {/* Estado real do ciclo. Substituir por datas quando abrir. */}
      <Aviso titulo="INSCRIÇÕES FECHADAS" className="mt-10">
        Não há processo seletivo aberto no momento, e o próximo ciclo ainda não tem data. Escreva
        para a gente e avisamos quando abrir — é o jeito mais direto de não perder.
      </Aviso>

      <section className="mt-20">
        <div className="border-t border-white/10 pt-8">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
            01 — O CAMINHO
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Seis etapas</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
            Todo mundo passa pelas mesmas etapas, na mesma ordem. A escolha da frente é a última,
            não a primeira.
          </p>
        </div>

        <ol className="mt-8">
          {ETAPAS_FORMACAO.map((etapa, indice) => (
            <li key={etapa.nome} className="flex gap-5 border-t border-white/10 py-6 md:gap-10">
              <span className="shrink-0 font-mono text-xs tracking-widest text-[var(--gear-amber)] pt-1 md:w-10">
                0{indice + 1}
              </span>
              <div className="flex-1">
                <h3 className="font-sans text-lg md:text-xl font-light leading-snug">
                  {etapa.nome}
                </h3>
                <p className="mt-2 max-w-[62ch] font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                  {etapa.texto}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Expectativa realista — mesma linguagem de "o que falta, sem enfeitar" */}
      <section className="mt-20 border-l-2 border-l-[var(--gear-amber)] pl-6 md:pl-8">
        <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
          ANTES DE SE INSCREVER
        </p>
        <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
          A GEAR é nova: onze pessoas, primeiro ciclo, nenhum robô em competição ainda. Quem
          entra agora constrói a estrutura junto, o que significa mais autonomia e menos trilho
          pronto. Se você procura uma equipe consolidada com histórico de competição, ainda não
          somos isso. Preferimos dizer antes.
        </p>
      </section>

      <div className="mt-16 flex flex-col sm:flex-row gap-5">
        <a href={CONTATO_INGRESSO} data-cursor-hover className={`text-center ${botaoPrimario}`}>
          Quero ser avisado
        </a>
        <Link href="/sobre" data-cursor-hover className={`text-center ${botaoSecundario}`}>
          Ver a formação
        </Link>
      </div>
    </section>
  )
}
