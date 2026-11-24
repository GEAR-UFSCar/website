"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Markdown } from "@/components/markdown"
import { AREAS_ARTIGO } from "@/lib/academia"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { botaoDesabilitavel, botaoPrimario, campoBase } from "@/lib/ui"

/**
 * Editor de artigo em Markdown com prévia. A RLS decide quem grava (042).
 * Com `titulo`, edita também título e área (base de conhecimento, 044).
 */
export function ArtigoEditor({ id, conteudo, titulo, area }: { id: string; conteudo: string; titulo?: string; area?: string | null }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState(conteudo)
  const [cab, setCab] = useState({ titulo: titulo ?? "", area: area ?? "" })
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:underline">
        {titulo === undefined ? "Editar esta página →" : "Editar este artigo →"}
      </button>
    )
  }

  const salvar = async () => {
    setErro(null)
    const { data, error } = await createClient().from("artigos").update(titulo === undefined ? { conteudo: texto } : { conteudo: texto, titulo: cab.titulo.trim(), area: cab.area || null }).eq("id", id).select("id")
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro(titulo === undefined ? "Nada mudou: só quem tem cargo edita esta página." : "Nada mudou: a política de acesso recusou.")
    setAberto(false)
    iniciar(() => router.refresh())
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <div>
        {titulo !== undefined && (
          <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
            <label className="sr-only" htmlFor={`titulo-${id}`}>Título</label>
            <input id={`titulo-${id}`} required maxLength={200} value={cab.titulo} onChange={(e) => setCab((c) => ({ ...c, titulo: e.target.value }))} className={campoBase} />
            <label className="sr-only" htmlFor={`area-${id}`}>Área</label>
            <select id={`area-${id}`} value={cab.area} onChange={(e) => setCab((c) => ({ ...c, area: e.target.value }))} className={campoBase}>
              <option value="" className="bg-[var(--gear-ink)]">Sem área</option>
              {AREAS_ARTIGO.map((a) => <option key={a} value={a} className="bg-[var(--gear-ink)]">{a}</option>)}
            </select>
          </div>
        )}
        <label htmlFor={`artigo-${id}`} className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Markdown</label>
        <textarea id={`artigo-${id}`} rows={24} maxLength={50000} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campoBase} mt-2 font-mono text-xs`} />
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => void salvar()} disabled={salvando} className={`${botaoPrimario} ${botaoDesabilitavel} px-5 py-3 text-xs`}>Salvar</button>
          <button type="button" onClick={() => { setTexto(conteudo); setAberto(false) }} className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">Cancelar</button>
        </div>
        {erro && <p role="alert" className="mt-2 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
      </div>
      <div aria-label="Prévia" className="border border-dashed border-linha p-4">
        <Markdown texto={texto} />
      </div>
    </div>
  )
}
