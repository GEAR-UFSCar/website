"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { hojeISO } from "@/lib/datas"
import { campoBase, rotuloBase } from "@/lib/ui"

export type EventoChamada = { id: string; titulo: string; tipo: string; dia: string; horas: number }
type Pessoa = { id: string; nome_completo: string | null }

const botao =
  "border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50"

/** Chamada de uma ocorrência de evento: quem marcar ganha as horas dela (033). */
export function ChamadaForm({ eventos, pessoas }: { eventos: EventoChamada[]; pessoas: Pessoa[] }) {
  const router = useRouter()
  const [eventoId, setEventoId] = useState(eventos[0]?.id ?? "")
  const evento = eventos.find((e) => e.id === eventoId)
  const [dia, setDia] = useState(evento?.dia ?? hojeISO())
  const [horas, setHoras] = useState(String(evento?.horas ?? 2))
  const [presentes, setPresentes] = useState<ReadonlySet<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const escolher = (id: string) => {
    setEventoId(id)
    const e = eventos.find((x) => x.id === id)
    if (e) {
      setDia(e.dia)
      setHoras(String(e.horas))
    }
  }

  const alternar = (id: string) =>
    setPresentes((a) => {
      const n = new Set(a)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!eventoId || presentes.size === 0) return
    setMsg(null)
    setSalvando(true)
    // upsert: refazer a chamada do mesmo dia corrige as horas em vez de dar erro de duplicado
    const { error } = await createClient()
      .from("eventos_chamada")
      .upsert(
        [...presentes].map((usuario_id) => ({ evento_id: eventoId, dia, usuario_id, horas: Number(horas) })),
        { onConflict: "evento_id,dia,usuario_id" },
      )
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setMsg(`Presença de ${presentes.size} pessoa(s) registrada.`)
    setPresentes(new Set())
    router.refresh()
  }

  if (eventos.length === 0) {
    return <p className="font-sans text-sm font-light text-muted-foreground">Nenhum evento nos últimos 120 dias. Crie no Calendário.</p>
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="md:col-span-3">
          <label htmlFor="chamada-evento" className={rotuloBase}>Evento</label>
          <select id="chamada-evento" value={eventoId} onChange={(e) => escolher(e.target.value)} className={campoBase}>
            {eventos.map((e) => (
              <option key={e.id} value={e.id} className="bg-[var(--gear-ink)]">{e.tipo}: {e.titulo}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="chamada-dia" className={rotuloBase}>Dia</label>
          <input id="chamada-dia" type="date" required value={dia} onChange={(e) => setDia(e.target.value)} className={campoBase} />
        </div>
        <div>
          <label htmlFor="chamada-horas" className={rotuloBase}>Horas por pessoa</label>
          <input id="chamada-horas" type="number" min={0.5} max={24} step={0.5} required value={horas} onChange={(e) => setHoras(e.target.value)} className={campoBase} />
        </div>
      </div>

      <fieldset>
        <legend className={rotuloBase}>Presentes ({presentes.size})</legend>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {pessoas.map((p) => (
            <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-3 font-sans text-sm">
              <input type="checkbox" checked={presentes.has(p.id)} onChange={() => alternar(p.id)} className="h-5 w-5 accent-[var(--gear-amber)]" />
              {p.nome_completo}
            </label>
          ))}
        </div>
      </fieldset>

      {msg && <p role="status" className="font-mono text-[11px] text-[var(--gear-amber)]">{msg}</p>}
      <button type="submit" disabled={salvando || presentes.size === 0} className={botao}>
        {salvando ? "Salvando…" : "Registrar presença"}
      </button>
    </form>
  )
}

/** Horas fora de evento: viagem de competição, oficina, apresentação. */
export function LancamentoForm({ pessoas }: { pessoas: Pessoa[] }) {
  const router = useRouter()
  const vazio = { usuario_id: "", data: hojeISO(), horas: "", descricao: "" }
  const [campos, setCampos] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const set = (k: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCampos((a) => ({ ...a, [k]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg(null)
    setSalvando(true)
    const { error } = await createClient()
      .from("horas_lancadas")
      .insert({ ...campos, horas: Number(campos.horas), descricao: campos.descricao.trim() })
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setMsg("Horas lançadas.")
    setCampos(vazio)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="lanc-pessoa" className={rotuloBase}>Membro</label>
          <select id="lanc-pessoa" required value={campos.usuario_id} onChange={set("usuario_id")} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Escolha…</option>
            {pessoas.map((p) => <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">{p.nome_completo}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lanc-data" className={rotuloBase}>Data</label>
          <input id="lanc-data" type="date" required value={campos.data} onChange={set("data")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="lanc-horas" className={rotuloBase}>Horas</label>
          <input id="lanc-horas" type="number" min={0.5} max={200} step={0.5} required value={campos.horas} onChange={set("horas")} className={campoBase} />
        </div>
        <div className="md:col-span-3">
          <label htmlFor="lanc-desc" className={rotuloBase}>Atividade</label>
          <input id="lanc-desc" required maxLength={300} placeholder="Viagem à competição X" value={campos.descricao} onChange={set("descricao")} className={campoBase} />
        </div>
      </div>
      {msg && <p role="status" className="font-mono text-[11px] text-[var(--gear-amber)]">{msg}</p>}
      <button type="submit" disabled={salvando} className={botao}>{salvando ? "Salvando…" : "Lançar horas"}</button>
    </form>
  )
}
