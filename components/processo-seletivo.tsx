"use client"

/*
 * DORMENTE — a rota /processo-seletivo foi removida enquanto não há inscrição
 * aberta. Este componente ficou de propósito: o conteúdo (cronograma, fases,
 * condições) é real e custou para ser escrito.
 *
 * PARA REATIVAR, sem depender de git:
 *   1. crie app/processo-seletivo/page.tsx renderizando <ProcessoSeletivo />
 *      — use app/parceiros/page.tsx como molde, inclusive o bloco openGraph;
 *   2. devolva o item a navLinks em components/navbar.tsx;
 *   3. devolva "/processo-seletivo" a ROTAS em app/sitemap.ts;
 *   4. aponte de volta os CTAs de components/frentes.tsx e app/projetos/page.tsx.
 *
 * Confira as datas do cronograma antes: são do ciclo anterior.
 */

import { useState } from "react"
import type React from "react"
import { motion } from "framer-motion"
import { Aviso } from "@/components/aviso"
import { botaoPrimario } from "@/lib/ui"

const condicoes = [
  { label: "Vagas", valor: "ATÉ 20" },
  { label: "Cursos", valor: "TODOS" },
  { label: "Pré-requisito técnico", valor: "NENHUM" },
  { label: "Campus", valor: "UFSCar Sorocaba" },
]

/* Fases e datas do edital. `quando` vazio faz a etapa exibir "DATA A DEFINIR". */
const cronograma = [
  {
    fase: "Inscrições",
    quando: "02/03/2027 a 16/03/2027",
    detalhe: "Formulário aberto a qualquer estudante de graduação do campus.",
  },
  {
    fase: "Carta de interesse",
    quando: "Junto da inscrição, até 16/03/2027",
    detalhe: "Enviada junto da inscrição. É o que lemos primeiro.",
  },
  {
    fase: "Entrevista",
    quando: "17/03/2027 a 21/03/2027",
    detalhe: "Conversa sobre a carta e sobre como você aborda um problema que não conhece.",
  },
  {
    fase: "Resultado",
    quando: "Até 26/03/2027",
    detalhe: "Divulgado para todos os inscritos, aprovados ou não.",
  },
  {
    fase: "Bootcamp de Integração",
    quando: "29/03/2027 a 04/04/2027",
    detalhe: "Primeiro contato com as ferramentas, o repositório e o jeito como o grupo trabalha.",
  },
  {
    fase: "Início da Academia GEAR",
    quando: "05/04/2027",
    detalhe: "Fundamentos de eletrônica, programação e controle. A formação começa de fato aqui.",
  },
]

const campoBase =
  "w-full bg-[var(--gear-ink)] border border-white/15 px-4 py-3 font-sans text-base font-light text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors duration-300 focus:border-[var(--gear-amber)]"

type Campos = {
  nome: string
  ra: string
  curso: string
  email: string
  carta: string
}

const vazio: Campos = { nome: "", ra: "", curso: "", email: "", carta: "" }

export function ProcessoSeletivo() {
  const [campos, setCampos] = useState<Campos>(vazio)
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const atualizar = (campo: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCampos((anterior) => ({ ...anterior, [campo]: e.target.value }))

  // Sem backend ainda: nada é gravado nem enviado. O submit só sinaliza isso,
  // para ninguém sair achando que se inscreveu. Ligar ao Supabase aqui.
  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTentouEnviar(true)
  }

  return (
    <>
      {/* Cabeçalho */}
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">EDITAL · CICLO 2026</p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            PROCESSO
            <br />
            <span className="italic">seletivo</span>
          </h1>
        </motion.div>
      </section>

      {/* 01 — Quem pode entrar */}
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">01 — QUEM PODE ENTRAR</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Sem pré-requisito</h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="max-w-2xl space-y-6 font-sans text-lg md:text-xl font-light leading-relaxed"
          >
            <p>
              São <span className="text-[var(--gear-amber)]">até 20 vagas</span>, abertas a estudantes de
              qualquer curso de graduação da UFSCar Sorocaba.
            </p>
            <p className="text-muted-foreground">
              Não existe pré-requisito técnico. Não é preciso saber programar, montar circuito ou ter
              mexido com robô antes — a Academia GEAR existe justamente para construir essa base. O que
              pesa é disposição para aprender fazendo e para errar em público.
            </p>
            <p className="text-muted-foreground">
              Robótica é interdisciplinar de verdade: projeto precisa de quem desenhe, escreva, organize
              e calcule, não só de quem solda.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6"
          >
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">CONDIÇÕES</p>
            <dl className="mt-4 space-y-4">
              {condicoes.map((linha) => (
                <div key={linha.label}>
                  <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="font-mono text-[11px] text-foreground mt-1">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* 02 — Cronograma */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">02 — CRONOGRAMA</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">O ciclo, do começo ao fim</h2>
        </motion.div>

        {/*
          Linha do tempo: as fases lado a lado, com a régua âmbar no topo de
          cada uma marcando a passagem. Empilhadas, seis fases custavam uma
          tela inteira de rolagem para responder "quando é a inscrição?" — que
          é a única pergunta que traz alguém a esta seção.
        */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {cronograma.map((etapa, index) => (
            <motion.div
              key={etapa.fase}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.05 }}
              className="border-t-2 border-[var(--gear-amber)] pt-5"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)]">
                  0{index + 1}
                </span>
                <h3 className="font-sans text-xl md:text-2xl font-light tracking-tight">
                  {etapa.fase}
                </h3>
              </div>

              {/* A data é o dado que a pessoa vem buscar: ganha peso e contraste. */}
              <p className="mt-3 font-mono text-[11px] tracking-widest uppercase text-foreground">
                {etapa.quando || "DATA A DEFINIR"}
              </p>

              <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {etapa.detalhe}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 03 — Inscrição */}
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">03 — INSCRIÇÃO</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Sua inscrição</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-3xl"
        >
          {/* Estado real do formulário — sem backend, nada sai daqui. */}
          <Aviso titulo="ENVIO NÃO CONECTADO" className="mb-10">
            Este formulário ainda não está ligado a um banco de dados. Nada que for preenchido aqui é
            gravado ou enviado — sua inscrição <span className="text-foreground">não será registrada</span>.
            Os campos estão prontos para receber a integração.
          </Aviso>

          <form onSubmit={aoEnviar} noValidate className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="nome" className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Nome completo
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  autoComplete="name"
                  value={campos.nome}
                  onChange={atualizar("nome")}
                  className={campoBase}
                />
              </div>

              <div>
                <label htmlFor="ra" className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  RA
                </label>
                <input
                  id="ra"
                  name="ra"
                  type="text"
                  required
                  inputMode="numeric"
                  value={campos.ra}
                  onChange={atualizar("ra")}
                  className={campoBase}
                />
              </div>

              <div>
                <label htmlFor="curso" className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Curso
                </label>
                <input
                  id="curso"
                  name="curso"
                  type="text"
                  required
                  value={campos.curso}
                  onChange={atualizar("curso")}
                  className={campoBase}
                />
              </div>

              <div>
                <label htmlFor="email" className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  E-mail institucional
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={campos.email}
                  onChange={atualizar("email")}
                  className={campoBase}
                />
              </div>
            </div>

            <div>
              <label htmlFor="carta" className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                Carta de interesse
              </label>
              <textarea
                id="carta"
                name="carta"
                required
                rows={8}
                value={campos.carta}
                onChange={atualizar("carta")}
                className={`${campoBase} resize-y leading-relaxed`}
              />
              <p className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground">
                {campos.carta.trim() ? `${campos.carta.trim().length} CARACTERES` : "ESCREVA COM SUAS PALAVRAS"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <button
                type="submit"
                data-cursor-hover
                className={botaoPrimario}
              >
                Enviar inscrição
              </button>

              {tentouEnviar && (
                <p role="status" className="font-mono text-xs tracking-wider text-muted-foreground">
                  Envio indisponível — o formulário ainda não tem destino.
                </p>
              )}
            </div>
          </form>
        </motion.div>
      </section>
    </>
  )
}
