"use client"

import { motion } from "framer-motion"

type Membro = {
  nome: string
  cargo: string
  /** Lideranças ganham destaque âmbar no cargo. */
  lider?: boolean
}

type Grupo = {
  trilha: string
  membros: Membro[]
}

/*
 * Iniciais: com só o primeiro nome, uma letra colidiria (Michael/Mateus,
 * João/Julio), então o placeholder usa as duas primeiras letras. Quando
 * houver sobrenome, trocar por inicial do nome + inicial do sobrenome.
 */
const iniciais = (nome: string) => nome.slice(0, 2).toUpperCase()

const grupos: Grupo[] = [
  {
    trilha: "Diretoria",
    membros: [
      { nome: "Michael", cargo: "Presidente", lider: true },
      { nome: "Alan", cargo: "Vice-Presidente", lider: true },
    ],
  },
  {
    trilha: "Competição",
    membros: [
      { nome: "João", cargo: "Líder Competição", lider: true },
      { nome: "Nasser", cargo: "Competição" },
      { nome: "Guilherme", cargo: "Competição" },
    ],
  },
  {
    trilha: "Pesquisa",
    membros: [
      { nome: "Mateus", cargo: "Líder Pesquisa", lider: true },
      { nome: "Pedro", cargo: "Pesquisa" },
      { nome: "Thomaz", cargo: "Pesquisa" },
    ],
  },
  {
    trilha: "Projetos",
    membros: [
      { nome: "Luiza", cargo: "Líder Projetos", lider: true },
      { nome: "Julio", cargo: "Projetos" },
      { nome: "Elis", cargo: "Projetos" },
    ],
  },
]

const orientador = [
  { label: "Nome", valor: "Prof. Iago Pacheco Gomes" },
  { label: "Função", valor: "ORIENTAÇÃO INSTITUCIONAL" },
  { label: "Vínculo", valor: "UFSCar Sorocaba" },
]

function Card({ membro, index }: { membro: Membro; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.08 }}
      className="group border border-white/10 p-6 transition-colors duration-300 hover:border-[var(--gear-amber)]"
    >
      {/* Placeholder da foto — substituir por <Image> quando houver retrato */}
      <div className="w-16 h-16 flex items-center justify-center border border-[var(--gear-amber)] bg-[var(--gear-navy)]">
        <span className="font-mono text-lg tracking-widest text-[var(--gear-amber)]">
          {iniciais(membro.nome)}
        </span>
      </div>

      <h3 className="mt-5 font-sans text-2xl md:text-3xl font-light tracking-tight">{membro.nome}</h3>
      <p
        className={`mt-2 font-mono text-[10px] tracking-[0.25em] uppercase ${
          membro.lider ? "text-[var(--gear-amber)]" : "text-muted-foreground"
        }`}
      >
        {membro.cargo}
      </p>
    </motion.div>
  )
}

export function Time() {
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
            11 MEMBROS FUNDADORES
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            QUEM
            <br />
            <span className="italic">assina</span>
          </h1>
        </motion.div>
      </section>

      {/* Grupos por trilha */}
      {grupos.map((grupo, grupoIndex) => (
        <section key={grupo.trilha} className="relative mx-auto max-w-6xl px-8 md:px-12 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="border-t border-white/10 pt-10 mb-12"
          >
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
              0{grupoIndex + 1} — {grupo.trilha.toUpperCase()}
            </p>
            <h2 className="font-sans text-3xl md:text-5xl font-light italic">{grupo.trilha}</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {grupo.membros.map((membro, index) => (
              <Card key={membro.nome} membro={membro} index={index} />
            ))}
          </div>
        </section>
      ))}

      {/* Orientação institucional */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="border-t border-white/10 pt-10 mb-12"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            05 — ORIENTAÇÃO INSTITUCIONAL
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Quem orienta</h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="max-w-2xl font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground"
          >
            A atividade de extensão do GEAR é orientada pelo{" "}
            <span className="text-foreground">Prof. Iago Pacheco Gomes</span>, docente da UFSCar
            Sorocaba. A orientação docente é o que separa grupo de extensão registrado de coletivo
            informal — e o que dá respaldo institucional ao que é produzido aqui.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6"
          >
            <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">ORIENTADOR</p>
            <dl className="mt-4 space-y-4">
              {orientador.map((linha) => (
                <div key={linha.label}>
                  <dt className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="font-mono text-[11px] text-foreground mt-1">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>
    </>
  )
}
