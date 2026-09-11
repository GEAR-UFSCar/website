"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const trilhas = [
  {
    nome: "Competição",
    resumo: "RoboCup Rescue Simulation — robôs de busca e resgate em ambiente simulado.",
    detalhe:
      "A liga é de simulação: o cenário de desastre, os sensores e o robô vivem no Webots, e a lógica roda em ROS 2. O problema central é navegar e mapear um ambiente desconhecido e degradado — daí o SLAM. Prazo de competição é externo e não negocia: o que não estiver pronto na data não compete.",
    ficha: [
      { label: "Frente", valor: "RoboCup Rescue Simulation" },
      { label: "Stack", valor: "Webots · ROS 2 · SLAM" },
      { label: "Squad", valor: "João (líder) · Nasser · Guilherme" },
    ],
  },
  {
    nome: "Pesquisa",
    resumo: "Aprendizado por reforço, com foco em Safe RL — pesquisa que vira artigo de verdade.",
    detalhe:
      "RL resolve controle aprendendo por tentativa; Safe RL acrescenta a pergunta que importa em robótica: como garantir que a política aprendida não viole restrições durante o próprio aprendizado. O trabalho é conduzido com método — hipótese, experimento, dado e escrita — sob orientação docente, com publicação como meta declarada.",
    ficha: [
      { label: "Frente", valor: "RL · Safe RL" },
      { label: "Orientação", valor: "Prof. Iago Pacheco Gomes" },
      { label: "Meta", valor: "SBC · CBA" },
      { label: "Squad", valor: "Mateus (líder) · Pedro · Thomaz" },
    ],
  },
  {
    nome: "Projetos",
    resumo: "Automação aplicada, com o AI Rover como projeto piloto.",
    detalhe:
      "É a face de extensão mais direta do grupo: sistema especificado, construído e mantido. O AI Rover abre a trilha — e as decisões dele, incluindo o que ainda não funciona, estão registradas no Diário de Bordo. Diferente da competição, aqui o sistema não pode só funcionar uma vez.",
    ficha: [
      { label: "Piloto", valor: "AI Rover" },
      { label: "Squad", valor: "Luiza (líder) · Julio · Elis" },
    ],
  },
]

export function Trilhas() {
  return (
    <>
      {/* Cabeçalho */}
      <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">TRÊS CAMINHOS · UM GRUPO</p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            ONDE
            <br />
            <span className="italic">você entra</span>
          </h1>
          <p className="mt-8 max-w-2xl font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            Toda pessoa que entra no GEAR passa pela mesma formação e só então escolhe uma trilha. Não é
            especialização precoce: é escolha feita com repertório, depois de já ter construído algo.
          </p>
        </motion.div>
      </section>

      {/* As três trilhas */}
      <section className="relative px-8 md:px-12 pb-24 md:pb-32">
        <div className="relative">
          {trilhas.map((trilha, index) => (
            <motion.div
              key={trilha.nome}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="border-t border-white/10 py-12 md:py-16"
            >
              <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)] shrink-0 md:w-16 md:pt-3">
                  0{index + 1}
                </span>

                <div className="flex-1">
                  <h2 className="font-sans text-4xl md:text-6xl font-light tracking-tight">{trilha.nome}</h2>
                  <p className="mt-5 max-w-[62ch] font-sans text-lg md:text-xl leading-relaxed">{trilha.resumo}</p>
                  <p className="mt-4 max-w-[62ch] font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                    {trilha.detalhe}
                  </p>
                </div>

                {/* ficha da trilha */}
                <div className="w-full md:max-w-[17rem] shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-5">
                  <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">TRILHA</p>
                  <dl className="mt-4 space-y-4">
                    {trilha.ficha.map((linha) => (
                      <div key={linha.label}>
                        <dt className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          {linha.label}
                        </dt>
                        <dd className="font-mono text-[11px] leading-relaxed text-foreground mt-1">{linha.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </motion.div>
          ))}
          <div className="border-t border-white/10" />
        </div>

        {/* Saídas para as páginas relacionadas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-16 flex flex-col sm:flex-row gap-5"
        >
          <Link
            href="/processo-seletivo"
            data-cursor-hover
            className="border border-[var(--gear-amber)] bg-transparent px-8 py-4 text-center font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"
          >
            Processo Seletivo
          </Link>
          <Link
            href="/time"
            data-cursor-hover
            className="border border-white/20 bg-transparent px-8 py-4 text-center font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"
          >
            Quem assina cada trilha
          </Link>
        </motion.div>
      </section>
    </>
  )
}
