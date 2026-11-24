import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { alertasDe, type Alerta } from "@/lib/alertas"
import { eFinanceiro, eRevisor, temCargo } from "@/lib/administracao"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Alertas | GEAR",
  robots: { index: false, follow: false },
}

/** Alertas (044). Quem tem cargo vê a visão geral; os outros, os que os envolvem. */
export default async function AlertasPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const geral = temCargo(perfil?.cargo)
  const supabase = await createClient()
  const [alertasR, pessoasR] = await Promise.all([
    supabase.from("alertas").select("*").order("desde", { ascending: true, nullsFirst: false }),
    supabase.from("perfis").select("id, nome_completo").eq("aprovado", true),
  ])
  const todos = (alertasR.data ?? []) as Alerta[]
  const lista = geral ? todos : alertasDe(todos, { usuarioId: user.id, revisor: eRevisor(perfil), financeiro: eFinanceiro(perfil?.cargo) })
  const nomes = new Map((pessoasR.data ?? []).map((p) => [p.id, p.nome_completo ?? "sem nome"]))
  const grupos = [...new Set(lista.map((a) => a.titulo))]

  return (
    <section className={paginaMembros}>
      <PageHeader titulo={geral ? "Alertas · visão geral" : "Meus alertas"}>
        Calculados na hora: tarefa atrasada, bloqueada há mais de 2 dias, revisão parada há mais de 48 h, membro sem
        tarefa principal ou de reserva, material com devolução atrasada e gasto aguardando aprovação.
        {" "}O resumo semanal por e-mail ainda não existe (ver a nota no README das migrações).
      </PageHeader>
      {alertasR.error ? (
        <ErroDados titulo="ALERTAS INDISPONÍVEIS" erro={alertasR.error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/044_organizacao_fase3.sql</code> no SQL Editor.
        </ErroDados>
      ) : lista.length === 0 ? (
        <p className="mt-10 font-sans text-sm font-light text-muted-foreground">Nenhum alerta. Ninguém está parado.</p>
      ) : (
        grupos.map((g) => {
          const doGrupo = lista.filter((a) => a.titulo === g)
          return (
            <section key={g} className="mt-10">
              <h2 className="border-b border-linha pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--gear-amber)]">
                {g} · {doGrupo.length}
              </h2>
              <ul>
                {doGrupo.map((a, i) => (
                  <li key={i} className="border-b border-linha">
                    <Link href={a.href} className="flex flex-wrap items-baseline gap-x-3 px-1 py-3 hover:bg-[var(--gear-navy)]">
                      <span className="flex-1 font-sans text-sm font-light">{a.detalhe}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {a.pessoa_id ? nomes.get(a.pessoa_id) ?? "" : a.grupo === "revisores" ? "revisores" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </section>
  )
}
