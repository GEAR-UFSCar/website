"use client"

import { motion } from "framer-motion"

const etapas = [
  {
    nome: "Processo Seletivo",
    descricao:
      "Não é prova de conhecimento acumulado. Interessa como a pessoa pensa quando ainda não sabe a resposta.",
  },
  {
    nome: "Bootcamp de Integração",
    descricao:
      "Primeiro contato com as ferramentas, o repositório e o jeito como o grupo trabalha no dia a dia.",
  },
  {
    nome: "Academia GEAR",
    descricao:
      "Fundamentos de eletrônica, programação e controle — o vocabulário comum que todo mundo precisa ter para conversar.",
  },
  {
    nome: "Projeto de Validação",
    descricao:
      "Um projeto pequeno, do início ao fim. É onde a teoria encontra o fio solto e o que estava no papel passa a existir.",
  },
  {
    nome: "Avaliação Técnica",
    descricao:
      "Conversa sobre o que foi construído: o que funcionou, o que não funcionou e por quê. As duas respostas contam.",
  },
  {
    nome: "Escolha da Trilha",
    descricao:
      "Competição, Pesquisa ou Projetos. A decisão é de quem entrou — tomada com repertório, não no escuro.",
  },
]

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
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            UFSCAR SOROCABA · EXTENSÃO
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            QUEM
            <br />
            <span className="italic">constrói</span>
          </h1>
        </motion.div>
      </section>

      {/* 01 — Missão */}
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">01 — MISSÃO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Por que existimos</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-3xl space-y-6 font-sans text-lg md:text-2xl font-light leading-relaxed"
        >
          <p>
            O GEAR é o Grupo de Extensão em Automação e Robótica da UFSCar Sorocaba. Existimos para que
            estudantes de graduação construam sistemas reais — que saem da bancada, falham, são
            consertados e voltam a funcionar.
          </p>
          <p className="text-muted-foreground">
            Robótica se aprende com o robô na mão. Por isso a formação aqui termina em projeto, não em
            prova, e por isso registramos as decisões técnicas em vez de só mostrar o resultado pronto:
            o raciocínio que levou até ali é a parte que se leva embora.
          </p>
          <p className="text-muted-foreground">
            Extensão significa que nada disso fica dentro do laboratório. O que é construído volta para
            a universidade e para fora dela — em competição, em artigo e em projeto aplicado.
          </p>
        </motion.div>
      </section>

      {/* 02 — Formação */}
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">02 — FORMAÇÃO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">A jornada completa</h2>
          <p className="mt-6 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
            Ninguém entra direto numa trilha. Todo mundo passa pelas mesmas seis etapas, na mesma ordem —
            é o que garante que a escolha do fim seja informada.
          </p>
        </motion.div>

        <div className="relative">
          {etapas.map((etapa, index) => (
            <motion.div
              key={etapa.nome}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="border-t border-white/10 py-8 md:py-10"
            >
              <div className="flex flex-col md:flex-row md:items-baseline gap-3 md:gap-10">
                <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)] shrink-0 md:w-16">
                  0{index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-sans text-2xl md:text-4xl font-light tracking-tight">{etapa.nome}</h3>
                  <p className="mt-3 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                    {etapa.descricao}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          <div className="border-t border-white/10" />
        </div>
      </section>

      {/* 03 — Vínculo institucional */}
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            03 — VÍNCULO INSTITUCIONAL
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Onde isso está registrado</h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="max-w-2xl font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground"
          >
            O GEAR é uma atividade de extensão registrada na Pró-Reitoria de Extensão da UFSCar, sob
            coordenação do <span className="text-foreground">Prof. Iago Pacheco Gomes</span>. Não é
            coletivo informal: existe processo, orientação docente e prestação de contas à universidade.
          </motion.p>

          {/* Ficha do registro — mesma linguagem da ficha técnica do Diário de Bordo */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6"
          >
            <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">REGISTRO</p>
            <dl className="mt-4 space-y-4">
              {registro.map((linha) => (
                <div key={linha.label}>
                  <dt className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="font-mono text-[11px] text-foreground mt-1 break-words">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>
    </>
  )
}
