import Link from "next/link"
import Image from "next/image"

import { Surge } from "@/components/surge"
import { ETAPAS_FORMACAO } from "@/lib/formacao"

import { Frentes } from "@/components/frentes"

import { CONTATO_INGRESSO } from "@/lib/site"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"


const registro = [
  { label: "Natureza", valor: "ATIVIDADE DE EXTENSÃO" },
  { label: "Registro", valor: "ProEx-UFSCar" },
  { label: "Processo nº", valor: "23112.029016/2026-80" },
  { label: "Coordenação", valor: "Prof. Iago Pacheco Gomes" },
  { label: "Campus", valor: "UFSCar Sorocaba" },
]

export function Sobre() {
  return (
    <>
      {/* Cabeçalho */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <Surge delay={0.1}>
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            UFSCAR SOROCABA · EXTENSÃO
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            QUEM
            <br />
            <span className="italic">constrói</span>
          </h1>
        </Surge>
      </section>

      {/* 01 — Missão */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">01 — MISSÃO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Por que existimos</h2>
        </Surge>

        {/*
          Duas colunas a partir de lg: a prosa em 7 de 12, a foto em 5. A
          medida de leitura não muda — o parágrafo continua estreito; o que
          era espaço vazio à direita virou a foto.
        */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <Surge delay={0.1} className="lg:col-span-7 space-y-6 font-sans text-lg md:text-xl font-light leading-relaxed">
          <p>
            O GEAR é o Grupo de Extensão em Automação e Robótica da UFSCar Sorocaba. Existimos para que
            estudantes de graduação construam sistemas reais, que saem da bancada, falham, são
            consertados e voltam a funcionar.
          </p>
          <p className="text-muted-foreground">
            Robótica se aprende com o robô na mão. A formação aqui termina em projeto, não em prova, e
            registramos as decisões técnicas junto com o raciocínio que levou até elas, em vez de só
            mostrar o resultado pronto.
          </p>
          <p className="text-muted-foreground">
            Extensão significa que nada disso fica dentro do laboratório. O que é construído volta para
            a universidade e para fora dela, em competição, em artigo e em projeto aplicado.
          </p>
        </Surge>

        <Surge delay={0.2} className="lg:col-span-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden border border-white/10">
            <Image
              src="/fotos/universidade-aberta/foto-01.jpg"
              alt="Estudantes em computadores durante a Universidade Aberta na UFSCar Sorocaba"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Universidade Aberta · UFSCar Sorocaba
          </p>
        </Surge>
        </div>
      </section>

      {/* 02 — Formação */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">02 — FORMAÇÃO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">A jornada completa</h2>
          <p className="mt-6 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
            Ninguém entra direto numa frente. Todo mundo passa pelas mesmas seis etapas, na mesma
            ordem.
          </p>
        </Surge>

        {/*
          Seis etapas em grade de 3. A ordem continua legível — o número 01…06
          é quem a carrega — e a comparação entre elas passa a ser lado a lado,
          em vez de seis blocos de altura inteira exigindo rolagem.
        */}
        <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {ETAPAS_FORMACAO.map((etapa, index) => (
            <Surge
              key={etapa.nome}
              delay={index * 0.05}
              className="flex h-full flex-col bg-[var(--gear-ink)] p-6 transition-colors duration-300 hover:bg-[var(--gear-navy)]"
            >
              <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)]">
                0{index + 1}
              </span>
              <h3 className="mt-4 font-sans text-xl md:text-2xl font-light tracking-tight">
                {etapa.nome}
              </h3>
              <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {etapa.texto}
                {etapa.nota ? ` ${etapa.nota}` : ""}
              </p>
            </Surge>
          ))}
        </div>
      </section>

      {/* 03/04 — As frentes e as áreas de apoio, absorvidas de /frentes */}
      <Frentes />

      {/* 05 — Vínculo institucional */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            05 — VÍNCULO INSTITUCIONAL
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Onde isso está registrado</h2>
        </Surge>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <Surge as="p" delay={0.1} className="max-w-2xl font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            O GEAR é uma atividade de extensão registrada na Pró-Reitoria de Extensão da UFSCar, sob
            coordenação do <span className="text-foreground">Prof. Iago Pacheco Gomes</span>. Existe
            processo, orientação docente e prestação de contas à universidade.
          </Surge>

          {/* Ficha do registro — mesma linguagem das fichas técnicas de /projetos */}
          <Surge delay={0.2} className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">REGISTRO</p>
            <dl className="mt-4 space-y-4">
              {registro.map((linha) => (
                <div key={linha.label}>
                  <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="font-mono text-[11px] text-foreground mt-1 break-words">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </Surge>
        </div>

        {/*
         * Saída da página. Antes /sobre terminava na ficha de registro, sem
         * nenhum destino — a auditoria classificou como beco sem saída: quem
         * leu a página inteira e se interessou não tinha o que fazer.
         */}
        <Surge className="mt-16 flex flex-col sm:flex-row gap-5">
          <Link href="/projetos" data-cursor-hover className={`text-center ${botaoPrimario}`}>
            Ver o que construímos
          </Link>
          <a href={CONTATO_INGRESSO} data-cursor-hover className={`text-center ${botaoSecundario}`}>
            Falar com a gente
          </a>
        </Surge>
      </section>
    </>
  )
}
