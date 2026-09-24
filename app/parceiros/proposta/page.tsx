import type { Metadata } from "next"
import Link from "next/link"

import { CONTATO_PARCERIA, EMAIL_CONTATO, SITE_URL } from "@/lib/site"
import { NIVEIS, RESPONSAVEL_PATROCINIO, VALOR } from "@/lib/parceiros"

export const metadata: Metadata = {
  title: "Proposta de patrocínio | GEAR",
  description: "Versão imprimível da proposta de patrocínio da GEAR UFSCar.",
  // documento de trabalho, não página de captação — fora do índice
  robots: { index: false, follow: true },
}

/*
 * PROPOSTA IMPRIMÍVEL
 *
 * A RoboJackets mantém um "sponsorship packet" em PDF, e é isso que circula
 * dentro da empresa: ninguém aprova patrocínio olhando uma página web — aprova
 * num comitê, com documento anexado ao e-mail.
 *
 * Em vez de um PDF estático que sai de sincronia com o site, esta é a mesma
 * fonte de dados (lib/parceiros.ts) renderizada para papel: o navegador salva
 * como PDF em Ctrl+P. Quando um benefício muda, muda nos dois ao mesmo tempo.
 *
 * Por isso a página não usa Navbar, Footer, cursor nem animação: numa folha A4
 * eles só ocupariam espaço. Fundo branco e texto preto por decisão consciente —
 * a paleta escura da marca gastaria toner e prejudicaria a leitura impressa.
 */
export default function PropostaPage() {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-8 py-12 text-neutral-900 print:px-0 print:py-0">
      {/* Barra de ação: existe na tela, some no papel */}
      <div className="mb-10 flex flex-col gap-3 border border-neutral-300 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p className="font-mono text-xs tracking-wider text-neutral-600">
          Use Ctrl+P (ou Cmd+P) e salve como PDF para anexar a um e-mail.
        </p>
        <Link
          href="/parceiros"
          className="font-mono text-xs tracking-wider text-neutral-900 underline"
        >
          voltar para Parceiros
        </Link>
      </div>

      {/* Cabeçalho do documento */}
      <header className="border-b-2 border-neutral-900 pb-6">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-500">
          Proposta de patrocínio
        </p>
        <h1 className="mt-3 text-4xl font-light tracking-tight">
          GEAR <span className="italic">UFSCar Sorocaba</span>
        </h1>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-neutral-700">
          Grupo de Extensão em Automação e Robótica — atividade de extensão registrada na
          Pró-Reitoria de Extensão da UFSCar, com orientação docente e prestação de contas à
          universidade.
        </p>
        <p className="mt-4 font-mono text-[10px] tracking-wider uppercase text-neutral-500">
          Emitida em {hoje} · {SITE_URL.replace(/^https?:\/\//, "")}
        </p>
      </header>

      {/* O que o apoio compra */}
      <section className="mt-10">
        <h2 className="font-mono text-[11px] tracking-[0.25em] uppercase text-neutral-500">
          01 · O que o apoio compra
        </h2>
        <div className="mt-5 space-y-5">
          {VALOR.map((bloco) => (
            <div key={bloco.titulo} className="break-inside-avoid">
              <h3 className="text-lg font-medium">{bloco.titulo}</h3>
              <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-neutral-700">
                {bloco.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Níveis */}
      <section className="mt-10 break-before-auto">
        <h2 className="font-mono text-[11px] tracking-[0.25em] uppercase text-neutral-500">
          02 · Níveis e contrapartidas
        </h2>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-left">
              <th className="w-40 py-2 pr-4 font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500">
                Nível
              </th>
              <th className="py-2 font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500">
                Contrapartidas
              </th>
            </tr>
          </thead>
          <tbody>
            {NIVEIS.map((nivel) => (
              <tr key={nivel.nome} className="break-inside-avoid border-b border-neutral-300 align-top">
                <td className="py-4 pr-4">
                  <p className="font-medium">{nivel.nome}</p>
                  {nivel.apoioIndividual && (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                      apoio individual
                    </p>
                  )}
                </td>
                <td className="py-4">
                  {nivel.herda && (
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                      {nivel.herda}
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {nivel.beneficios.map((b) => (
                      <li key={b} className="leading-relaxed text-neutral-700">
                        — {b}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-5 max-w-[68ch] text-sm leading-relaxed text-neutral-700">
          Não há valor fixo por nível. A contrapartida é acertada em conversa direta, porque apoio
          pode ser equipamento, verba, serviço ou mentoria técnica — e cada um destrava um projeto
          diferente. Diga o que faz sentido para a sua empresa e respondemos com o que isso viabiliza,
          de forma específica.
        </p>
      </section>

      {/* Contato */}
      <section className="mt-10 break-inside-avoid border-t-2 border-neutral-900 pt-6">
        <h2 className="font-mono text-[11px] tracking-[0.25em] uppercase text-neutral-500">
          03 · Contato
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          {RESPONSAVEL_PATROCINIO.nome
            ? `${RESPONSAVEL_PATROCINIO.nome} — ${RESPONSAVEL_PATROCINIO.cargo}`
            : `${RESPONSAVEL_PATROCINIO.cargo} — responsável a designar pela diretoria`}
        </p>
        <p className="mt-1 font-mono text-sm">
          <a href={CONTATO_PARCERIA} className="underline">
            {EMAIL_CONTATO}
          </a>
        </p>
        <p className="mt-4 font-mono text-[10px] tracking-wider uppercase text-neutral-500">
          UFSCar — campus Sorocaba · São Paulo · Brasil
        </p>
      </section>
    </main>
  )
}
