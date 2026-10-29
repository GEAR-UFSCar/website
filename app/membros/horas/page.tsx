import type { Metadata } from "next"

import { BotaoImprimir } from "@/components/membros/botao-imprimir"
import { ErroDados } from "@/components/erro-dados"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { PageHeader } from "@/components/membros/page-header"
import { dataDoDia, hojeISO } from "@/lib/datas"
import { formatarHoras, linhasDeHoras, somarHoras, type Chamada, type HoraLancada } from "@/lib/horas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Minhas horas | GEAR",
  robots: { index: false, follow: false },
}

/**
 * Horas de extensão de quem está logado: presença registrada em evento e
 * lançamentos avulsos da Gestão (033). A declaração sai pelo diálogo de
 * impressão; ela é um extrato, e só vale com a assinatura da diretoria.
 */
export default async function HorasPage() {
  const { user, perfil } = await exigirMembroAprovado()

  const supabase = await createClient()
  const [chamadas, lancadas] = await Promise.all([
    supabase.from("eventos_chamada").select("evento_id, dia, horas, evento:eventos(titulo, tipo)").eq("usuario_id", user.id),
    supabase.from("horas_lancadas").select("id, data, horas, descricao").eq("usuario_id", user.id),
  ])
  const erro = chamadas.error ?? lancadas.error
  const linhas = linhasDeHoras(
    (chamadas.data ?? []) as unknown as Chamada[],
    (lancadas.data ?? []) as unknown as HoraLancada[],
  )
  const total = somarHoras(linhas)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Minhas horas">
        Presença em reuniões e eventos registrada pela Gestão, mais horas lançadas à parte (viagem, oficina).
        Se faltar alguma, fale com quem fez a chamada.
      </PageHeader>

      {erro ? (
        <ErroDados titulo="HORAS INDISPONÍVEIS" erro={erro} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code>.
        </ErroDados>
      ) : linhas.length === 0 ? (
        <div className="mt-10">
          <EstadoVazio>Nenhuma hora registrada ainda.</EstadoVazio>
        </div>
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <p className="font-sans text-5xl font-light tabular-nums">{formatarHoras(total)}</p>
            <BotaoImprimir rotulo="Gerar declaração" />
          </div>

          {/* A declaração é o próprio extrato com cabeçalho e linha de assinatura. */}
          <article className="mt-10 border border-linha p-6 md:p-10 print:border-0 print:p-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gear-amber)]">
              GEAR · Grupo de Extensão em Automação e Robótica · UFSCar Sorocaba
            </p>
            <h2 className="mt-4 font-sans text-2xl font-normal">Extrato de horas de extensão</h2>
            <p className="mt-4 max-w-[70ch] font-sans text-sm font-light leading-relaxed">
              {perfil?.nome_completo}
              {perfil?.curso && `, ${perfil.curso}`}, registra {formatarHoras(total)} em atividades do GEAR,
              conforme a relação abaixo, emitida em {dataDoDia(hojeISO())}.
            </p>

            <table className="mt-8 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-linha-forte">
                  {["Data", "Atividade", "Origem", "Horas"].map((h) => (
                    <th key={h} scope="col" className="py-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.chave} className="border-b border-linha">
                    <td className="py-2 pr-4 font-mono text-[11px] whitespace-nowrap">{dataDoDia(l.data)}</td>
                    <td className="py-2 pr-4 font-sans text-sm">{l.descricao}</td>
                    <td className="py-2 pr-4 font-mono text-[11px] text-muted-foreground">{l.origem}</td>
                    <td className="py-2 font-mono text-[11px] tabular-nums">{formatarHoras(l.horas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-16 max-w-xs border-t border-foreground pt-2 font-sans text-sm">Diretoria do GEAR</p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Gerado pela área de membros. Vale como declaração com a assinatura acima.
            </p>
          </article>
        </>
      )}
    </section>
  )
}
