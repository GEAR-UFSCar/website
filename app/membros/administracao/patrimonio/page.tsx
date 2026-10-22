import type { Metadata } from "next"

import { PatrimonioForm } from "@/components/patrimonio-form"
import { PatrimonioStatus } from "@/components/patrimonio-status"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { Surge } from "@/components/surge"
import { PageHeader } from "@/components/membros/page-header"

export const metadata: Metadata = {
  title: "Patrimônio | GEAR",
  robots: { index: false, follow: false },
}

type Item = {
  id: string
  item: string
  categoria: string
  quantidade: number
  status: string
  responsavel_atual: string | null
  frente_vinculada: string | null
  localizacao: string | null
  observacoes: string | null
}

export default async function PatrimonioPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("patrimonio")
    .select("id, item, categoria, quantidade, status, responsavel_atual, frente_vinculada, localizacao, observacoes")
    .order("created_at", { ascending: false })

  const itens = (data ?? []) as Item[]
  const unidades = itens.reduce((soma, i) => soma + i.quantidade, 0)

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <PageHeader titulo="Patrimônio">
        {itens.length} registro(s), {unidades} unidade(s).
      </PageHeader>

      {error && (
        <ErroDados titulo="INVENTÁRIO INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/003_administracao.sql</code>.
        </ErroDados>
      )}

      {/* Lista */}
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse">
          <thead>
            <tr className="border-b border-linha-forte text-left">
              {["Item", "Categoria", "Qtd", "Status", "Responsável", "Frente", "Local"].map((h) => (
                <th key={h} className="py-3 pr-4 font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="py-8 font-sans text-sm font-light text-muted-foreground">
                  Nenhum item cadastrado ainda.
                </td>
              </tr>
            )}
            {itens.map((i, indice) => (
              <Surge as="tr" index={indice} key={i.id} className="border-b border-linha align-top">
                <td className="py-4 pr-4">
                  <p className="font-sans text-base font-light">{i.item}</p>
                  {i.observacoes && (
                    <p className="mt-1 max-w-[40ch] font-sans text-xs font-light text-muted-foreground">
                      {i.observacoes}
                    </p>
                  )}
                </td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{i.categoria}</td>
                <td className="py-4 pr-4 font-mono text-[11px] tabular-nums">{i.quantidade}</td>
                <td className="py-4 pr-4 w-40"><PatrimonioStatus id={i.id} valor={i.status} /></td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{i.responsavel_atual ?? "—"}</td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{i.frente_vinculada ?? "—"}</td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{i.localizacao ?? "—"}</td>
              </Surge>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-14 max-w-4xl">
        <PatrimonioForm />
      </div>

    </section>
  )
}
