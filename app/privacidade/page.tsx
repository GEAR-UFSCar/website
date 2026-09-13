import type { Metadata } from "next"
import Link from "next/link"

import { EMAIL_CONTATO, OG_IMAGE } from "@/lib/site"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { botaoSecundario } from "@/lib/ui"

const DESCRICAO =
  "Como a GEAR trata os dados pessoais coletados no site: o que guardamos, por quê, por quanto tempo e como você pede correção ou exclusão."

export const metadata: Metadata = {
  title: "Privacidade | GEAR",
  description: DESCRICAO,
  openGraph: {
    title: "Privacidade | GEAR",
    description: DESCRICAO,
    url: "/privacidade",
    images: [OG_IMAGE],
  },
}

/*
 * Aviso de privacidade exigido pela LGPD. O site coleta nome completo, curso e
 * e-mail institucional no cadastro, e desde 012 registra o aceite do Regimento
 * — coletar tudo isso sem dizer o que se faz com os dados é a lacuna que a
 * auditoria apontou.
 *
 * Os campos entre colchetes precisam ser preenchidos pela diretoria antes de
 * publicar: não invento encarregado nem endereço. A página mostra o aviso de
 * pendência enquanto estiverem assim.
 */

const secoes = [
  {
    titulo: "Quem trata os seus dados",
    conteudo: [
      "O GEAR — Grupo de Estudos e Aplicações em Robótica é uma atividade de extensão registrada na Pró-Reitoria de Extensão da UFSCar, vinculada ao campus Sorocaba, com orientação docente.",
      "Para efeito da Lei 13.709/2018 (LGPD), o tratamento descrito aqui é realizado pela entidade no exercício dessa atividade de extensão. Dúvidas e solicitações vão para o e-mail no fim desta página.",
    ],
  },
  {
    titulo: "Que dados coletamos",
    lista: [
      ["E-mail", "Fornecido no cadastro e guardado pelo serviço de autenticação. Nunca aparece no diretório de membros nem em nenhuma página."],
      ["Nome completo e curso", "Informados por você ao completar o perfil. Ficam visíveis para os demais membros aprovados."],
      ["Frente e cargo", "Definidos internamente. Visíveis para membros aprovados."],
      ["Registro de aceite", "Data e versão do Regimento Interno que você aceitou no cadastro."],
      ["Progresso na Academia", "Quais módulos você concluiu e quando. Visível só para você."],
    ],
  },
  {
    titulo: "Para que usamos",
    conteudo: [
      "Para operar a área de membros: identificar quem é da entidade, organizar as frentes, registrar presença em atas e acompanhar a formação na Academia GEAR.",
      "Não usamos seus dados para publicidade, não fazemos perfilamento e não vendemos nem compartilhamos com terceiros. O site não usa cookies de rastreamento ou de publicidade — os únicos cookies são os de sessão, necessários para manter você conectado.",
    ],
  },
  {
    titulo: "Base legal",
    conteudo: [
      "O tratamento se apoia no legítimo interesse da entidade em administrar suas atividades de extensão (art. 7º, IX) e, no que se refere ao aceite do Regimento Interno e do Código de Conduta, no seu consentimento (art. 7º, I), registrado com data e versão do documento.",
    ],
  },
  {
    titulo: "Quem vê o quê",
    lista: [
      ["Você", "Todos os seus dados."],
      ["Membros aprovados", "Nome, curso, frente e cargo dos demais membros. E-mail não."],
      ["Diretoria", "O acima, mais os registros de aceite, para fins de conferência."],
      ["Público em geral", "Nada. Nenhuma página pública do site expõe dado de membro."],
    ],
  },
  {
    titulo: "Por quanto tempo",
    conteudo: [
      "Enquanto você for membro, e por até 2 anos após a saída — prazo que permite manter a memória institucional de quem passou por cada gestão e por cada projeto.",
      "Atas de reunião e registros de aceite são documentos institucionais e não são apagados: são o que comprova decisões tomadas coletivamente.",
    ],
  },
  {
    titulo: "Seus direitos",
    conteudo: [
      "A LGPD garante a você confirmar a existência de tratamento, acessar seus dados, corrigir o que estiver incompleto ou desatualizado, pedir anonimização ou eliminação, revogar consentimento e saber com quem compartilhamos.",
      "Nome, curso e frente você corrige sozinho em Editar perfil. Para os demais pedidos, escreva para o e-mail abaixo. Respondemos em até 15 dias.",
    ],
  },
  {
    titulo: "Segurança",
    conteudo: [
      "Os dados ficam no Supabase, com acesso controlado por políticas no próprio banco — não apenas por verificação na aplicação. Ter conta não dá acesso a nada: é preciso aprovação da diretoria.",
      "O site é servido sobre HTTPS, com política de segurança de conteúdo e proteção contra incorporação em sites de terceiros.",
    ],
  },
]

/** Âncora estável: acento e espaço fora, para o link não depender de encoding. */
const slug = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")

export default function PrivacidadePage() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            LGPD · LEI 13.709/2018
          </p>
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
            Aviso de
            <br />
            <span className="italic">privacidade</span>
          </h1>

          <p className="mt-8 max-w-[62ch] font-sans text-lg font-light leading-relaxed text-muted-foreground">
            Quem entra na área de membros informa nome, curso e e-mail. Esta página diz o que
            fazemos com isso, quem enxerga o quê e como você pede correção ou exclusão.
          </p>

          <Aviso titulo="ANTES DE PUBLICAR" tom="neutro" className="mt-10">
            A diretoria precisa confirmar o prazo de retenção e o canal de atendimento ao titular
            desta página, e nomear formalmente quem responde por eles. O texto abaixo descreve o
            tratamento que o sistema de fato realiza — foi escrito a partir do código e das
            políticas do banco, não de um modelo genérico.
          </Aviso>

          {/*
            * Índice. São 10 seções e 628 palavras: sem salto, quem procura
            * "meus direitos" percorre a página inteira. É também o que dá ao
            * leitor de tela uma rota curta pelo documento.
            */}
          <nav aria-label="Seções desta página" className="mt-12 border-t border-white/10 pt-8">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              Nesta página
            </p>
            <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {secoes.map((secao, indice) => (
                <li key={secao.titulo}>
                  <a
                    href={`#${slug(secao.titulo)}`}
                    data-cursor-hover
                    className="font-mono text-[11px] tracking-wider text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
                  >
                    <span className="text-[var(--gear-amber)] mr-2">0{indice + 1}</span>
                    {secao.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {secoes.map((secao, indice) => (
            <section key={secao.titulo} id={slug(secao.titulo)} className="mt-16 scroll-mt-24">
              <div className="border-t border-white/10 pt-8">
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                  0{indice + 1}
                </p>
                <h2 className="font-sans text-2xl md:text-3xl font-light italic">{secao.titulo}</h2>
              </div>

              {secao.conteudo?.map((paragrafo) => (
                <p
                  key={paragrafo.slice(0, 40)}
                  className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground"
                >
                  {paragrafo}
                </p>
              ))}

              {secao.lista && (
                <dl className="mt-6 space-y-5">
                  {secao.lista.map(([termo, descricao]) => (
                    <div key={termo} className="border-t border-white/10 pt-4">
                      <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
                        {termo}
                      </dt>
                      <dd className="mt-2 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                        {descricao}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}

          <section className="mt-16">
            <div className="border-t border-white/10 pt-8">
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                0{secoes.length + 1}
              </p>
              <h2 className="font-sans text-2xl md:text-4xl font-light italic">Falar sobre dados</h2>
            </div>
            <p className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
              Para exercer qualquer um dos direitos acima, escreva para:
            </p>
            <a
              href={`mailto:${EMAIL_CONTATO}?subject=LGPD%20-%20solicitacao%20de%20titular`}
              data-cursor-hover
              className="mt-4 inline-block font-mono text-sm tracking-wider text-[var(--gear-amber)] hover:underline"
            >
              {EMAIL_CONTATO}
            </a>
          </section>

          <div className="mt-16">
            <Link href="/" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
              Voltar ao início
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
