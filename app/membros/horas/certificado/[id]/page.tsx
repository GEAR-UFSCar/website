import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BotaoImprimir } from "@/components/membros/botao-imprimir"
import { dataDoDia } from "@/lib/datas"
import { formatarHoras } from "@/lib/horas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Certificado de evento | GEAR",
  robots: { index: false, follow: false },
}

/** Número de registro estável: ano do evento + começo do id da presença. */
const numeroDoCertificado = (id: string, dia: string) => `GEAR-EV-${dia.slice(0, 4)}-${id.slice(0, 8).toUpperCase()}`

/**
 * Certificado de evento (doc. 27, seção 4 e art. 7): nome, RA, atividade,
 * período, carga horária, assinaturas do orientador e do Presidente e número
 * de registro. Nasce da presença registrada em eventos_chamada; a RLS da 033
 * deixa ler só a própria presença ou, para quem tem cargo, a de qualquer um.
 * O RA não está no cadastro, então sai em linha para preencher à mão.
 * Participante de fora da entidade não tem presença aqui e segue no modelo em Word.
 */
export default async function CertificadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await exigirMembroAprovado()
  const supabase = await createClient()

  const { data: chamada } = await supabase
    .from("eventos_chamada")
    .select("id, dia, horas, atividade, usuario_id")
    .eq("id", id)
    .maybeSingle()
  if (!chamada) notFound()

  const { data: pessoa } = await supabase
    .from("perfis")
    .select("nome_completo, curso")
    .eq("id", chamada.usuario_id)
    .maybeSingle()

  return (
    <section className={paginaMembros}>
      <div className="nao-imprimir flex flex-wrap items-center justify-between gap-4">
        <Link href="/membros/horas" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← Minhas horas
        </Link>
        <BotaoImprimir rotulo="Imprimir / PDF" />
      </div>

      <article className="mt-10 border border-linha p-8 md:p-14 print:border-0 print:p-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gear-amber)]">
          GEAR · Grupo de Extensão em Automação e Robótica · UFSCar Sorocaba
        </p>
        <h1 className="mt-6 font-sans text-4xl font-light">Certificado</h1>

        <p className="mt-8 max-w-[70ch] font-sans text-lg font-light leading-relaxed">
          Certificamos que <strong className="font-normal">{pessoa?.nome_completo ?? "—"}</strong>
          {pessoa?.curso && `, estudante de ${pessoa.curso}`}, RA ____________, participou de{" "}
          <strong className="font-normal">{chamada.atividade}</strong>, atividade de extensão do GEAR realizada em{" "}
          {dataDoDia(chamada.dia)}, com carga horária de {formatarHoras(Number(chamada.horas))}.
        </p>

        <div className="mt-20 grid gap-12 sm:grid-cols-2">
          <p className="border-t border-foreground pt-2 font-sans text-sm">Professor(a) orientador(a)</p>
          <p className="border-t border-foreground pt-2 font-sans text-sm">Presidente do GEAR</p>
        </div>

        <p className="mt-12 font-mono text-[10px] text-muted-foreground">
          Registro {numeroDoCertificado(chamada.id, chamada.dia)} · gerado pela área de membros a partir da presença
          registrada. Vale com as assinaturas acima.
        </p>
      </article>
    </section>
  )
}
