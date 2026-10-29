"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { CATEGORIAS } from "@/lib/administracao"
import { mensagemSegura } from "@/lib/erros"
import { selectInline } from "@/lib/ui"

/**
 * Categoria do membro (Regimento art. 11). Fundador e efetivo votam na
 * Assembleia; só a diretoria muda, e nunca a própria pessoa (035).
 */
export function CategoriaSelect({ perfilId, valor, nome }: { perfilId: string; valor: string; nome?: string | null }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const mudar = async (nova: string) => {
    setErro(null)
    const { data, error } = await createClient().from("perfis").update({ categoria: nova }).eq("id", perfilId).select("id")
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nenhuma linha alterada: a política de acesso recusou.")
    iniciar(() => router.refresh())
  }

  return (
    <div>
      <select value={valor} disabled={salvando} onChange={(e) => mudar(e.target.value)} aria-label={`Categoria de ${nome ?? "membro"}`} className={selectInline}>
        {Object.entries(CATEGORIAS).map(([v, r]) => <option key={v} value={v} className="bg-[var(--gear-ink)]">{r}</option>)}
      </select>
      {erro && <p role="alert" className="mt-1 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
