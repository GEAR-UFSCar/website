import type { Metadata } from "next"
import Link from "next/link"

import { OG_IMAGE, TOTAL_MEMBROS } from "@/lib/site"
import { faseDoCiclo, type CicloPublico } from "@/lib/ciclo"
import { dataDoDia, hojeISO } from "@/lib/datas"
import { createClientePublico } from "@/lib/supabase/publico"
import { Aviso } from "@/components/aviso"
import { ListaDeEspera } from "@/components/lista-de-espera"
import { botaoPrimario, botaoSecundario, linkNoTexto } from "@/lib/ui"
import { ETAPAS_FORMACAO } from "@/lib/formacao"

const DESCRICAO =
  "Como entrar no GEAR UFSCar: sem pré-requisito técnico, aberto a estudantes de graduação da UFSCar, de qualquer curso. O que esperar do processo e da formação."

export const metadata: Metadata = {
  title: "Ingressar | GEAR",
  description: DESCRICAO,
  openGraph: {
    title: "Ingressar no GEAR",
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
 * Esta página NÃO inventa processo seletivo aberto. O estado vem do ciclo que
 * a diretoria cadastra em Seleção (038): fechado (lista de espera, 037),
 * anunciado (datas e edital) ou aberto (link para criar conta, que é a
 * inscrição). Sem a 038 ou sem banco, cai em "fechado", que é o seguro.
 */

// O ciclo abre e fecha por data; 10 min de atraso na virada é aceitável.
export const revalidate = 600

async function cicloAtual(): Promise<CicloPublico | null> {
  const supabase = createClientePublico()
  if (!supabase) return null
  const { data } = await supabase.from("ciclo_publico").select("*").maybeSingle()
  return (data as CicloPublico | null) ?? null
}


const PERGUNTAS = [
  {
    pergunta: "Quem pode entrar?",
    resposta:
      "Estudantes de graduação regularmente matriculados na UFSCar, de qualquer curso. Não precisa de experiência em robótica nem em programação, e a falta dela não reduz a nota: o que se avalia é o potencial de aprender e de colaborar.",
  },
  {
    pergunta: "Tem mensalidade ou taxa de inscrição?",
    resposta: "Não. O GEAR não cobra taxa de inscrição nem mensalidade dos membros.",
  },
  {
    pergunta: "Quanto tempo preciso dedicar?",
    resposta:
      "A Diretoria define uma carga horária semanal indicativa, pensada para caber na rotina acadêmica: a graduação vem primeiro. Em semana de prova, avise cedo; ninguém é punido por avisar.",
  },
  {
    pergunta: "Ganho certificado ou horas de extensão?",
    resposta:
      "A participação pode ser comprovada e contada como horas de extensão, conforme as normas da UFSCar. Os registros do grupo alimentam esse processo.",
  },
  {
    pergunta: "Como as vagas são anunciadas?",
    resposta:
      "Por edital público, com vagas, prazos, etapas e critérios, publicado com pelo menos sete dias de antecedência. Quando houver um, o link aparece no topo desta página.",
  },
  {
    pergunta: "Posso mudar de frente depois?",
    resposta: "Sim, depois de conversar com os líderes das frentes.",
  },
]

export default async function IngressarPage() {
  const ciclo = await cicloAtual()
  const fase = faseDoCiclo(ciclo, hojeISO())
  const edital = ciclo?.edital_url && (
    <>
      {" "}
      <a href={ciclo.edital_url} target="_blank" rel="noopener noreferrer" className={linkNoTexto}>
        Leia o edital
      </a>
      .
    </>
  )

  return (
    <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-balance">
        Como entrar no GEAR
      </h1>

      <p className="mt-10 max-w-[62ch] font-sans text-lg md:text-xl font-light leading-relaxed text-muted-foreground">
        Não existe pré-requisito técnico, porque a Academia GEAR nivela todo mundo. Exigir
        conhecimento prévio filtraria por quem já teve acesso antes, e não por quem tem
        potencial agora.
      </p>

      {/* Estado real do ciclo, vindo do banco (038). */}
      {fase === "aberto" && ciclo ? (
        <Aviso titulo={`INSCRIÇÕES ABERTAS ATÉ ${dataDoDia(ciclo.inscricoes_ate)}`} className="mt-10">
          {ciclo.titulo}: a inscrição é criar sua conta com o e-mail da UFSCar e escrever por que quer entrar.
          {edital}
          <Link href="/entrar?modo=criar" data-cursor-hover className={`mt-6 block w-fit ${botaoPrimario}`}>
            Inscrever-se
          </Link>
        </Aviso>
      ) : fase === "anunciado" && ciclo ? (
        <Aviso titulo={`INSCRIÇÕES ABREM EM ${dataDoDia(ciclo.inscricoes_de)}`} className="mt-10">
          {ciclo.titulo}: inscrições de {dataDoDia(ciclo.inscricoes_de)} a {dataDoDia(ciclo.inscricoes_ate)}.
          {edital} Deixe seu e-mail no fim desta página e avisamos quando abrir.
        </Aviso>
      ) : (
        <Aviso titulo="INSCRIÇÕES FECHADAS" className="mt-10">
          Não há processo seletivo aberto no momento, e o próximo ciclo ainda não tem data. Deixe
          seu e-mail no fim desta página e avisamos quando abrir. É o jeito mais direto de não perder.
        </Aviso>
      )}

      <section className="mt-20">
        <div className="border-t border-linha pt-8">
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Seis etapas</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
            Todo mundo passa pelas mesmas etapas, na mesma ordem. A escolha da frente é a última,
            não a primeira.
          </p>
        </div>

        <ol className="mt-8">
          {ETAPAS_FORMACAO.map((etapa, indice) => (
            <li key={etapa.nome} className="flex gap-5 border-t border-linha py-6 md:gap-10">
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

      {/* Respostas que já estão nos documentos do grupo (Edital, Manual do Membro, Kit de Boas-Vindas) */}
      <section className="mt-20">
        <div className="border-t border-linha pt-8">
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">O que você precisa saber</h2>
        </div>
        <dl className="mt-8">
          {PERGUNTAS.map((p) => (
            <div key={p.pergunta} className="border-t border-linha py-6">
              <dt className="font-sans text-lg md:text-xl font-light leading-snug">{p.pergunta}</dt>
              <dd className="mt-2 max-w-[62ch] font-sans text-sm md:text-base font-light leading-relaxed text-muted-foreground">
                {p.resposta}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Expectativa realista, mesma linguagem de "o que falta, sem enfeitar" */}
      <section className="mt-20 border-l-2 border-l-[var(--gear-amber)] pl-6 md:pl-8">
        <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
          ANTES DE SE INSCREVER
        </p>
        <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
          O GEAR é novo: {TOTAL_MEMBROS} pessoas, primeiro ciclo, nenhum robô em competição ainda. Quem
          entra agora constrói a estrutura junto, o que significa mais autonomia e menos trilho
          pronto. Se você procura uma equipe consolidada com histórico de competição, ainda não
          somos isso. Preferimos dizer antes.
        </p>
      </section>

      <section id="avisar" className="mt-16 scroll-mt-24">
        {fase === "aberto" ? (
          <Link href="/entrar?modo=criar" data-cursor-hover className={`inline-block text-center ${botaoPrimario}`}>
            Inscrever-se
          </Link>
        ) : (
          <>
            <h2 className="mb-6 font-sans text-3xl md:text-5xl font-light italic">Avisamos quando abrir</h2>
            <ListaDeEspera />
          </>
        )}
        <Link href="/sobre" data-cursor-hover className={`mt-10 inline-block text-center ${botaoSecundario}`}>
          Ver a formação
        </Link>
      </section>
    </section>
  )
}
