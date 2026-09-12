import type { Metadata } from "next"
import Link from "next/link"

import { PatrimonioForm } from "@/components/patrimonio-form"
import { PatrimonioStatus } from "@/components/patrimonio-status"
import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

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
  trilha_vinculada: string | null
  localizacao: string | null
  observacoes: string | null
}

export default async function PatrimonioPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("patrimonio")
    .select("id, item, categoria, quantidade, status, responsavel_atual, trilha_vinculada, localizacao, observacoes")
    .order("created_at", { ascending: false })

  const itens = (data ?? []) as Item[]
  const unidades = itens.reduce((soma, i) => soma + i.quantidade, 0)

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <Surge>
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ADMINISTRAÇÃO</p>
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
        Patrimônio
      </h1>
      <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {itens.length} REGISTRO(S) · {unidades} UNIDADE(S)
      </p>
      </Surge>

      {error && (
        <Aviso titulo="ERRO" className="mt-10 max-w-2xl">
          {error.message}. Se a tabela não existe, rode <code>supabase/003_administracao.sql</code>.
        </Aviso>
      )}

      {/* Lista */}
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse">
          <thead>
            <tr className="border-b border-white/15 text-left">
              {["Item", "Categoria", "Qtd", "Status", "Responsável", "Trilha", "Local"].map((h) => (
                <th key={h} className="py-3 pr-4 font-mono text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-normal">
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
              <Surge as="tr" index={indice} key={i.id} className="border-b border-white/10 align-top">
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
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{i.trilha_vinculada ?? "—"}</td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{i.localizacao ?? "—"}</td>
              </Surge>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-14 max-w-4xl">
        <PatrimonioForm />
      </div>

      <Link href="/membros/administracao" data-cursor-hover
        className={`mt-14 inline-block ${botaoSecundario}`}>
        Voltar ao painel
      </Link>
    </section>
  )
}
