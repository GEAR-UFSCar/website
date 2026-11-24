import type { Metadata } from "next"

import { CicloForm } from "@/components/ciclo-form"
import { ErroDados } from "@/components/erro-dados"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { temCargo } from "@/lib/administracao"
import { dataDoDia, hojeISO } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Ciclos e metas | GEAR",
  robots: { index: false, follow: false },
}

export default async function CiclosPage() {
  const { perfil } = await exigirMembroAprovado()
  const gerencia = temCargo(perfil?.cargo)
  const hoje = hojeISO()
  const supabase = await createClient()
  const { data, error } = await supabase.from("ciclos").select("id, nome, inicio, fim, meta_pontos").order("inicio", { ascending: false })
  const ciclos = data ?? []

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Ciclos e metas">
        Ciclos de duas semanas. Tarefa assumida entra no ciclo em que foi assumida. A meta de pontos vale só para a
        Academia, e só conta comprovação aprovada; tarefa de projeto não tem ponto.
      </PageHeader>
      {error ? (
        <ErroDados titulo="CICLOS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/044_organizacao_fase3.sql</code> no SQL Editor.
        </ErroDados>
      ) : (
        <>
          {gerencia && <div className="mt-8"><CicloForm hoje={hoje} /></div>}
          <ul className="mt-8 border border-linha">
            {ciclos.length === 0 && <li className="px-5 py-4 font-sans text-sm font-light text-muted-foreground">Nenhum ciclo criado ainda.</li>}
            {ciclos.map((c) => {
              const atual = c.inicio <= hoje && hoje <= c.fim
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-linha px-5 py-3 last:border-b-0">
                  <span className="flex-1 font-sans text-sm">{c.nome}</span>
                  {atual && <Pilula tom="ativo">Atual</Pilula>}
                  <span className="font-mono text-[11px] text-muted-foreground">{dataDoDia(c.inicio)} → {dataDoDia(c.fim)}</span>
                  <span className="font-mono text-[11px] tabular-nums">meta {c.meta_pontos} pts</span>
                  {gerencia && <BotaoApagar tabela="ciclos" id={c.id} descricao={`o ciclo ${c.nome}`} />}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
