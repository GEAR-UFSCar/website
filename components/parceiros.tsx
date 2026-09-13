"use client"

import Link from "next/link"
import { motion } from "framer-motion"

import { CONTATO_PARCERIA, EMAIL_CONTATO } from "@/lib/site"
import { NIVEIS, RESPONSAVEL_PATROCINIO, VALOR } from "@/lib/parceiros"
import { Aviso } from "@/components/aviso"
import { botaoPrimario } from "@/lib/ui"



/*
 * Necessidades da frente de Competição. `quantidade` e `valor` seguem em branco
 * até o levantamento ser fechado — a página mostra "A DEFINIR" no lugar.
 */
const necessidades = [
  {
    item: "Encoders de roda",
    quantidade: "",
    justificativa:
      "É a limitação técnica mais séria em aberto hoje: sem encoders, sabemos a força mandada ao motor mas não quanto o robô andou de fato — por isso mapa e rota ainda não são confiáveis.",
    prioridade: "ALTA",
  },
  {
    item: "Computação embarcada dedicada",
    quantidade: "",
    justificativa:
      "O raciocínio do AI Rover roda hoje em notebook externo. Embarcar o processamento tira a dependência do rádio e do operador.",
    prioridade: "ALTA",
  },
  {
    item: "Chassi, tração e peças de reposição",
    quantidade: "",
    justificativa:
      "Competição consome hardware: roda, motor e estrutura quebram em bancada e em pista. Reposição é o que mantém o robô rodando entre uma etapa e outra.",
    prioridade: "MÉDIA",
  },
  {
    item: "Sensores e eletrônica de consumo",
    quantidade: "",
    justificativa:
      "Sensores de linha, placas e cabeamento para manter mais de um robô montado ao mesmo tempo — sem canibalizar um projeto para testar outro.",
    prioridade: "MÉDIA",
  },
  {
    item: "Verba de inscrição e deslocamento",
    quantidade: "",
    justificativa:
      "Inscrição, transporte e hospedagem da equipe nas competições. É o custo que decide se o robô pronto chega ou não à pista.",
    prioridade: "ALTA",
  },
]


export function Parceiros() {
  return (
    <>
      {/* Cabeçalho */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            PARCERIAS · PATROCÍNIO
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            APOIAR
            <br />
            <span className="italic">quem constrói</span>
          </h1>
        </motion.div>
      </section>

      {/* 01 — Proposta de valor */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">01 — O QUE O APOIO COMPRA</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Proposta de valor</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALOR.map((bloco, index) => (
            <motion.div
              key={bloco.titulo}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              className="border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
            >
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
                0{index + 1}
              </p>
              <h3 className="mt-4 font-sans text-2xl md:text-3xl font-light tracking-tight">{bloco.titulo}</h3>
              <p className="mt-4 font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                {bloco.texto}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 02 — Necessidades */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">02 — FRENTE DE COMPETIÇÃO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">O que falta, sem enfeitar</h2>
          <p className="mt-6 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
            A lista abaixo é o que hoje limita a frente de Competição. Está em ordem de impacto, com a
            justificativa técnica de cada item — o mesmo critério das fichas em Projetos.
          </p>
        </motion.div>

        <div className="relative">
          {necessidades.map((necessidade, index) => (
            <motion.div
              key={necessidade.item}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`border-t border-white/10 py-8 md:py-10 ${
                necessidade.prioridade === "ALTA"
                  ? "border-l-2 border-l-[var(--gear-amber)] pl-6 md:pl-8"
                  : ""
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-baseline gap-3 md:gap-10">
                <span className="font-mono text-xs tracking-widest text-muted-foreground shrink-0 md:w-28">
                  PRIORIDADE{" "}
                  <span
                    className={
                      necessidade.prioridade === "ALTA" ? "text-[var(--gear-amber)]" : "text-foreground"
                    }
                  >
                    {necessidade.prioridade}
                  </span>
                </span>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
                    <h3 className="font-sans text-2xl md:text-4xl font-light tracking-tight">
                      {necessidade.item}
                    </h3>
                    <span className="font-mono text-xs tracking-widest text-muted-foreground shrink-0">
                      {necessidade.quantidade || "QUANTIDADE A DEFINIR"}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                    {necessidade.justificativa}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          <div className="border-t border-white/10" />
        </div>
      </section>

      {/* 03 — Níveis de patrocínio */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">03 — CONTRAPARTIDAS</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Níveis de patrocínio</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {NIVEIS.map((nivel, index) => (
            <motion.div
              key={nivel.nome}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              className={`flex flex-col border p-7 transition-colors duration-300 ${
                nivel.destaque
                  ? "border-[var(--gear-amber)] bg-[var(--gear-navy)]"
                  : "border-white/10 hover:border-[var(--gear-amber)]"
              }`}
            >
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
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-10 max-w-2xl font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground"
        >
          Valores e contrapartidas adicionais são definidos em conversa direta — entre em contato pelo
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
        </motion.p>

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">04 — CONTATO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Falar com a gente</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-3xl"
        >
          <p className="font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Apoio pode ser equipamento, verba, serviço ou mentoria técnica — não precisa ser dinheiro.
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
        </motion.div>
      </section>
    </>
  )
}
