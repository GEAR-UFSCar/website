"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { MODELOS_PESQUISA, modeloPesquisa } from "@/lib/pesquisas"
import { campoBase, rotuloBase } from "@/lib/ui"

const botao = "min-h-11 border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 disabled:opacity-50"

/** Abre uma edição de um dos instrumentos do doc. 33. */
export function PesquisaNova() {
  const router = useRouter()
  const [modelo, setModelo] = useState(MODELOS_PESQUISA[0].id)
  const [fecha, setFecha] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    const m = modeloPesquisa(modelo)!
    const { error } = await createClient().from("pesquisas").insert({ titulo: m.nome, modelo, fecha_em: new Date(fecha).toISOString() })
    setSalvando(false)
    if (error) return setErro(mensagemSegura(error))
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-5 border border-linha p-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div>
        <label htmlFor="p-modelo" className={rotuloBase}>Instrumento</label>
        <select id="p-modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className={campoBase}>
          {MODELOS_PESQUISA.map((m) => <option key={m.id} value={m.id} className="bg-[var(--gear-ink)]">{m.nome}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="p-fecha" className={rotuloBase}>Encerra em (sugestão: uma semana)</label>
        <input id="p-fecha" type="datetime-local" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={campoBase} />
      </div>
      <button type="submit" disabled={salvando} className={`${botao} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>
        {salvando ? "Abrindo…" : "Abrir pesquisa"}
      </button>
      {erro && <p role="alert" className="font-mono text-[11px] text-[var(--gear-amber)] md:col-span-3">{erro}</p>}
    </form>
  )
}

/** Responde sem identificação: o banco guarda que você respondeu, separado do que respondeu. */
export function PesquisaResponder({ pesquisaId, modeloId }: { pesquisaId: string; modeloId: string }) {
  const router = useRouter()
  const modelo = modeloPesquisa(modeloId)!
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    const { error } = await createClient().rpc("responder_pesquisa", { p_pesquisa: pesquisaId, p_respostas: respostas })
    setSalvando(false)
    if (error) return setErro(mensagemSegura(error))
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-6">
      <p className="font-sans text-sm font-light text-muted-foreground">{modelo.descricao} Nenhum campo é obrigatório.</p>
      {modelo.perguntas.map((p) => (
        <fieldset key={p.id}>
          <legend className="font-sans text-sm">{p.texto}</legend>
          {p.tipo === "aberta" ? (
            <textarea rows={2} maxLength={2000} aria-label={p.texto} value={respostas[p.id] ?? ""} onChange={(e) => setRespostas((r) => ({ ...r, [p.id]: e.target.value }))} className={`${campoBase} mt-2 resize-y`} />
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {(p.tipo === "escala" ? ["1", "2", "3", "4", "5"] : p.opcoes).map((o) => (
                <label key={o} className={`${botao} cursor-pointer ${respostas[p.id] === o ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]" : "border-linha-forte text-muted-foreground hover:border-foreground"}`}>
                  <input type="radio" name={`${pesquisaId}-${p.id}`} value={o} checked={respostas[p.id] === o} onChange={() => setRespostas((r) => ({ ...r, [p.id]: o }))} className="sr-only" />
                  {o}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      {erro && <p role="alert" className="font-mono text-[11px] text-[var(--gear-amber)]">{erro}</p>}
      <button type="submit" disabled={salvando} className={`${botao} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>
        {salvando ? "Enviando…" : "Enviar anonimamente"}
      </button>
    </form>
  )
}
