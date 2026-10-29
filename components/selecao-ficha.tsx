"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase, rotuloBase } from "@/lib/ui"
import { ETAPAS } from "@/lib/administracao"



/** Etapa e notas da banca sobre um candidato. O candidato não lê isto (033). */
export function SelecaoFicha({ perfilId, etapa, notas }: { perfilId: string; etapa: string; notas: string }) {
  const router = useRouter()
  const [c, setC] = useState({ etapa, notas })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const salvar = async () => {
    setMsg(null)
    setSalvando(true)
    const { error } = await createClient()
      .from("selecao")
      .upsert({ perfil_id: perfilId, etapa: c.etapa, notas: c.notas.trim() || null, atualizado_em: new Date().toISOString() })
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setMsg("Salvo.")
    router.refresh()
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr_auto] md:items-end">
      <div>
        <label htmlFor={`etapa-${perfilId}`} className={rotuloBase}>Etapa</label>
        <select id={`etapa-${perfilId}`} value={c.etapa} onChange={(e) => setC((a) => ({ ...a, etapa: e.target.value }))} className={campoBase}>
          {ETAPAS.map((e) => <option key={e} value={e} className="bg-[var(--gear-ink)]">{e}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`notas-${perfilId}`} className={rotuloBase}>Notas da banca</label>
        <textarea id={`notas-${perfilId}`} rows={2} maxLength={4000} value={c.notas} onChange={(e) => setC((a) => ({ ...a, notas: e.target.value }))} className={`${campoBase} resize-y`} />
      </div>
      <button type="button" onClick={salvar} disabled={salvando}
        className="min-h-11 border border-[var(--gear-amber)] px-5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50">
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      {msg && <p role="status" className="font-mono text-[10px] text-[var(--gear-amber)] md:col-span-3">{msg}</p>}
    </div>
  )
}
