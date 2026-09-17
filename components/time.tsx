import Link from "next/link"
import { Surge } from "@/components/surge"

import { CONTATO_INGRESSO } from "@/lib/site"
import { botaoPrimario, botaoSecundario } from "@/lib/ui"

type Membro = {
  nome: string
  cargo: string
}

type Grupo = {
  frente: string
  membros: Membro[]
}

/*
 * Iniciais: com só o primeiro nome, uma letra colidiria (Michael/Mateus,
 * João/Julio), então o placeholder usa as duas primeiras letras. Quando
 * houver sobrenome, trocar por inicial do nome + inicial do sobrenome.
 */
const iniciais = (nome: string) => nome.slice(0, 2).toUpperCase()

/*
 * Sem cargo de direção: a diretoria ainda não foi definida, e publicar nome
 * com "Presidente" ou "Direção de <Frente>" seria anunciar uma estrutura que
 * a entidade não formalizou. Cada card diz a frente em que a pessoa está —
 * que é o que de fato existe hoje.
 *
 * Quando a designação acontecer, é aqui que ela entra: o `cargo` volta a ser
 * o cargo, e o destaque de quem tem cargo pode voltar junto. Os valores
 * válidos já estão em lib/administracao.ts (CARGOS), que é o que o banco
 * aceita no CHECK de `perfis.cargo`.
 */
const grupos: Grupo[] = [
  {
    frente: "Fundação",
    membros: [
      { nome: "Michael", cargo: "Membro fundador" },
      { nome: "Alan", cargo: "Membro fundador" },
    ],
  },
  {
    frente: "Competição",
    membros: [
      { nome: "João", cargo: "Competição" },
      { nome: "Nasser", cargo: "Competição" },
      { nome: "Guilherme", cargo: "Competição" },
    ],
  },
  {
    frente: "Pesquisa",
    membros: [
      { nome: "Mateus", cargo: "Pesquisa" },
      { nome: "Pedro", cargo: "Pesquisa" },
      { nome: "Thomaz", cargo: "Pesquisa" },
    ],
  },
  {
    frente: "Projetos",
    membros: [
      { nome: "Luiza", cargo: "Projetos" },
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
    <Surge delay={index * 0.08} className="group border border-white/10 p-6 transition-colors duration-300 hover:border-[var(--gear-amber)]">
      {/* Placeholder da foto — substituir por <Image> quando houver retrato */}
      <div className="w-16 h-16 flex items-center justify-center border border-[var(--gear-amber)] bg-[var(--gear-navy)]">
        <span className="font-mono text-lg tracking-widest text-[var(--gear-amber)]">
          {iniciais(membro.nome)}
        </span>
      </div>

      <h3 className="mt-5 font-sans text-2xl md:text-3xl font-light tracking-tight">{membro.nome}</h3>
      <p className="mt-2 font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
        {membro.cargo}
      </p>
    </Surge>
  )
}

export function Time() {
  return (
    <>
      {/* Cabeçalho */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <Surge delay={0.1}>
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            11 MEMBROS FUNDADORES
          </p>
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
            QUEM
            <br />
            <span className="italic">assina</span>
          </h1>
        </Surge>
      </section>

      {/* Grupos por frente */}
      {grupos.map((grupo, grupoIndex) => (
        <section key={grupo.frente} className="relative mx-auto max-w-6xl px-8 md:px-12 py-16 md:py-20">
          <Surge className="border-t border-white/10 pt-10 mb-12">
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
              0{grupoIndex + 1} — {grupo.frente.toUpperCase()}
            </p>
            <h2 className="font-sans text-3xl md:text-5xl font-light italic">{grupo.frente}</h2>
          </Surge>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {grupo.membros.map((membro, index) => (
              <Card key={membro.nome} membro={membro} index={index} />
            ))}
          </div>
        </section>
      ))}

      {/* Orientação institucional */}
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
        <Surge className="border-t border-white/10 pt-10 mb-12">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            05 — ORIENTAÇÃO INSTITUCIONAL
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Quem orienta</h2>
        </Surge>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <Surge as="p" delay={0.1} className="max-w-2xl font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
            A atividade de extensão do GEAR é orientada pelo{" "}
            <span className="text-foreground">Prof. Iago Pacheco Gomes</span>, docente da UFSCar
            Sorocaba. A orientação docente separa grupo de extensão registrado de coletivo informal, e
            dá respaldo institucional ao que é produzido aqui.
          </Surge>

          <Surge delay={0.2} className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">ORIENTADOR</p>
            <dl className="mt-4 space-y-4">
              {orientador.map((linha) => (
                <div key={linha.label}>
                  <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="font-mono text-[11px] text-foreground mt-1">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </Surge>
        </div>

        {/*
         * Destino terminal do candidato. Sem processo seletivo aberto, esta é a
         * única porta de entrada do site — quem se identificou com o time
         * precisa poder agir aqui, não voltar para o começo.
         */}
        <Surge className="mt-16 flex flex-col sm:flex-row gap-5">
          <a href={CONTATO_INGRESSO} data-cursor-hover className={`text-center ${botaoPrimario}`}>
            Quero fazer parte
          </a>
          <Link href="/projetos" data-cursor-hover className={`text-center ${botaoSecundario}`}>
            Ver os projetos
          </Link>
        </Surge>
      </section>
    </>
  )
}
