"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { NIVEIS_FORMACAO } from "@/lib/administracao"
import { mensagemSegura } from "@/lib/erros"
import { selectInline } from "@/lib/ui"

/**
 * Nível de formação e situação (042). Principal ou Avançada = revisor.
 * Inativo sai da revisão e dos alertas de "sem tarefa". Só Presidente/Vice
 * mudam (guardar_formacao), nunca a própria pessoa por conta própria.
 */
export function FormacaoSelect({ perfilId, nivel, ativo, nome }: { perfilId: string; nivel: string; ativo: boolean; nome?: string | null }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const gravar = async (mudanca: { nivel_formacao?: string; ativo?: boolean }) => {
    setErro(null)
    const { data, error } = await createClient().from("perfis").update(mudanca).eq("id", perfilId).select("id")
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nenhuma linha alterada: a política de acesso recusou.")
    iniciar(() => router.refresh())
  }

  return (
    <div className="grid gap-2">
      <select value={nivel} disabled={salvando} onChange={(e) => gravar({ nivel_formacao: e.target.value })} aria-label={`Nível de formação de ${nome ?? "membro"}`} className={selectInline}>
        {NIVEIS_FORMACAO.map((n) => <option key={n} value={n} className="bg-[var(--gear-ink)]">{n}</option>)}
      </select>
      <label className="flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:min-h-0">
        <input type="checkbox" checked={ativo} disabled={salvando} onChange={(e) => gravar({ ativo: e.target.checked })} className="h-4 w-4 accent-[var(--gear-amber)]" />
        Ativo
      </label>
      {erro && <p role="alert" className="font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
