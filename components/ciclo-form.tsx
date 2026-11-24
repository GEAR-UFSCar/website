"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { acaoAmbar } from "@/components/tarefa-item"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase, rotuloBase } from "@/lib/ui"

/** Soma dias numa data "YYYY-MM-DD" sem passar por fuso. */
const somar = (dia: string, n: number) => {
  const [a, m, d] = dia.split("-").map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Novo ciclo (044): duas semanas por padrão; o fim acompanha o início até a pessoa mexer nele. */
export function CicloForm({ hoje }: { hoje: string }) {
  const router = useRouter()
  const [c, setC] = useState({ nome: "", inicio: hoje, fim: somar(hoje, 13), meta: "30" })
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const criar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg(null)
    setOcupado(true)
    const { error } = await createClient().from("ciclos").insert({ nome: c.nome.trim(), inicio: c.inicio, fim: c.fim, meta_pontos: Number(c.meta) || 0 })
    setOcupado(false)
    if (error) return setMsg(mensagemSegura(error))
    setC({ nome: "", inicio: somar(c.fim, 1), fim: somar(c.fim, 14), meta: c.meta })
    router.refresh()
  }

  return (
    <form onSubmit={criar} className="grid gap-4 border border-linha p-5 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <label htmlFor="c-nome" className={rotuloBase}>Nome</label>
        <input id="c-nome" required maxLength={80} placeholder="Ciclo 1 · dez/2026" value={c.nome} onChange={(e) => setC((a) => ({ ...a, nome: e.target.value }))} className={campoBase} />
      </div>
      <div>
        <label htmlFor="c-ini" className={rotuloBase}>Início</label>
        <input id="c-ini" type="date" required value={c.inicio} onChange={(e) => setC((a) => ({ ...a, inicio: e.target.value, fim: somar(e.target.value, 13) }))} className={campoBase} />
      </div>
      <div>
        <label htmlFor="c-fim" className={rotuloBase}>Fim</label>
        <input id="c-fim" type="date" required min={somar(c.inicio, 1)} value={c.fim} onChange={(e) => setC((a) => ({ ...a, fim: e.target.value }))} className={campoBase} />
      </div>
      <div>
        <label htmlFor="c-meta" className={rotuloBase}>Meta (pontos por membro)</label>
        <input id="c-meta" type="number" min={0} max={1000} required value={c.meta} onChange={(e) => setC((a) => ({ ...a, meta: e.target.value }))} className={campoBase} />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={ocupado} className={acaoAmbar}>Criar ciclo</button>
      </div>
      {msg && <p role="alert" className="font-mono text-[10px] text-[var(--gear-amber)] sm:col-span-4">{msg}</p>}
    </form>
  )
}
