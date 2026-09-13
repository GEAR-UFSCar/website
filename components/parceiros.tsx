"use client"

import { motion } from "framer-motion"
import { Aviso } from "@/components/aviso"
import { botaoPrimario } from "@/lib/ui"

/* Canal de contato do grupo. Vazio faz a página exibir o aviso de indisponível. */
const EMAIL_CONTATO = "gearufscar@gmail.com"

const valor = [
  {
    titulo: "Visibilidade",
    texto:
      "Marca aplicada nos robôs que entram em competição, no material técnico publicado e nesta página. O Diário de Bordo é conteúdo de engenharia aberto — quem apoia aparece junto do trabalho, não de um banner solto.",
  },
  {
    titulo: "Acesso a talento técnico",
    texto:
      "Contato direto com estudantes de graduação da UFSCar Sorocaba, de qualquer curso, formados dentro de um processo que termina em projeto entregue e defendido. Todo ciclo entram até 20 pessoas novas.",
  },
  {
    titulo: "Associação institucional",
    texto:
      "O GEAR é atividade de extensão registrada na ProEx-UFSCar, com orientação docente e prestação de contas à universidade. O apoio vai para uma estrutura formal, não para um coletivo informal.",
  },
]

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

/*
 * Níveis de patrocínio. Sem valor em R$ de propósito: a contrapartida é
 * fechada caso a caso, e publicar uma tabela de preço engessaria a conversa.
 * `herda` sai como linha própria em vez de virar mais um item da lista —
 * é referência a outro nível, não um benefício em si.
 */
const niveis = [
  {
    nome: "Bronze",
    herda: null,
    beneficios: [
      "Logo da empresa na página de Parceiros do site",
      "Menção em posts de redes sociais sobre resultados da equipe",
    ],
  },
  {
    nome: "Prata",
    herda: "Tudo do nível Bronze",
    beneficios: ["Nome/logo na camiseta da equipe de Competição"],
  },
  {
    nome: "Ouro",
    herda: "Tudo do nível Prata",
    beneficios: [
      "Logo em posição de destaque no robô de competição",
      "Agradecimento especial em apresentações públicas da GEAR (como a Universidade Aberta UFSCar)",
    ],
    destaque: true,
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
          {valor.map((bloco, index) => (
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
            justificativa técnica de cada item — o mesmo critério que usamos no Diário de Bordo.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {niveis.map((nivel, index) => (
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
                Nível 0{index + 1}
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
          e-mail abaixo.
        </motion.p>
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
              href={`mailto:${EMAIL_CONTATO}?subject=Parceria%20GEAR`}
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
