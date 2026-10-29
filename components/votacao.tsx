"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase, rotuloBase } from "@/lib/ui"

const botao = "min-h-11 border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 disabled:opacity-50"

/** Convoca uma deliberação (F/C/A) ou uma eleição (candidatos), aberta ou secreta. */
export function VotacaoForm() {
  const router = useRouter()
  const [c, setC] = useState({ titulo: "", descricao: "", tipo: "deliberacao", candidatos: "", secreta: false, regra: "simples", fecha: "" })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    const candidatos = c.candidatos.split("\n").map((s) => s.trim()).filter(Boolean)
    if (c.tipo === "eleicao" && candidatos.length < 1) return setErro("Liste ao menos um candidato, um por linha.")
    setSalvando(true)
    const { error } = await createClient().from("votacoes").insert({
      titulo: c.titulo.trim(),
      descricao: c.descricao.trim() || null,
      // eleição é sempre secreta (doc. 28, art. 8º)
      secreta: c.tipo === "eleicao" ? true : c.secreta,
      opcoes: c.tipo === "eleicao" ? [...candidatos, "Branco"] : ["Favorável", "Contrário", "Abstenção"],
      regra: c.tipo === "eleicao" ? "simples" : c.regra,
      fecha_em: new Date(c.fecha).toISOString(),
    })
    setSalvando(false)
    if (error) return setErro(mensagemSegura(error))
    setC({ titulo: "", descricao: "", tipo: "deliberacao", candidatos: "", secreta: false, regra: "simples", fecha: "" })
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="v-titulo" className={rotuloBase}>Pauta (o que se decide)</label>
          <input id="v-titulo" required maxLength={200} value={c.titulo} onChange={(e) => setC((a) => ({ ...a, titulo: e.target.value }))} className={campoBase} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="v-desc" className={rotuloBase}>Contexto e proposta</label>
          <textarea id="v-desc" rows={3} maxLength={4000} value={c.descricao} onChange={(e) => setC((a) => ({ ...a, descricao: e.target.value }))} className={`${campoBase} resize-y`} />
        </div>
        <div>
          <label htmlFor="v-tipo" className={rotuloBase}>Tipo</label>
          <select id="v-tipo" value={c.tipo} onChange={(e) => setC((a) => ({ ...a, tipo: e.target.value }))} className={campoBase}>
            <option value="deliberacao" className="bg-[var(--gear-ink)]">Deliberação (favorável, contrário, abstenção)</option>
            <option value="eleicao" className="bg-[var(--gear-ink)]">Eleição (candidatos, voto secreto)</option>
          </select>
        </div>
        <div>
          <label htmlFor="v-fecha" className={rotuloBase}>Encerra em</label>
          <input id="v-fecha" type="datetime-local" required value={c.fecha} onChange={(e) => setC((a) => ({ ...a, fecha: e.target.value }))} className={campoBase} />
        </div>
        {c.tipo === "eleicao" ? (
          <div className="md:col-span-2">
            <label htmlFor="v-cand" className={rotuloBase}>Candidatos, um por linha (o voto em branco entra sozinho)</label>
            <textarea id="v-cand" rows={3} value={c.candidatos} onChange={(e) => setC((a) => ({ ...a, candidatos: e.target.value }))} className={`${campoBase} resize-y`} />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="v-regra" className={rotuloBase}>Regra</label>
              <select id="v-regra" value={c.regra} onChange={(e) => setC((a) => ({ ...a, regra: e.target.value }))} className={campoBase}>
                <option value="simples" className="bg-[var(--gear-ink)]">Maioria simples (deliberação comum)</option>
                <option value="dois_tercos" className="bg-[var(--gear-ink)]">2/3 dos membros com voto (Regimento, destituição, extinção)</option>
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-3 self-end font-sans text-sm">
              <input type="checkbox" checked={c.secreta} onChange={(e) => setC((a) => ({ ...a, secreta: e.target.checked }))} className="h-5 w-5 accent-[var(--gear-amber)]" />
              Voto secreto
            </label>
          </>
        )}
      </div>
      <p className="font-sans text-xs font-light text-muted-foreground">
        Convocação por escrito com pauta: 48 h de antecedência na ordinária, 24 h na extraordinária (Regimento art. 35). O
        resultado só aparece depois do encerramento.
      </p>
      {erro && <p role="alert" className="font-mono text-[11px] text-[var(--gear-amber)]">{erro}</p>}
      <button type="submit" disabled={salvando} className={`${botao} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>
        {salvando ? "Convocando…" : "Abrir votação"}
      </button>
    </form>
  )
}

/** Um clique por opção; o banco garante um voto por pessoa (035). */
export function VotarBotoes({ votacaoId, opcoes }: { votacaoId: string; opcoes: string[] }) {
  const router = useRouter()
  const [escolha, setEscolha] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const votar = async () => {
    if (!escolha) return
    setErro(null)
    setOcupado(true)
    const { error } = await createClient().rpc("votar", { p_votacao: votacaoId, p_opcao: escolha })
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    router.refresh()
  }

  return (
    <fieldset className="mt-4">
      <legend className="sr-only">Seu voto</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label key={o} className={`${botao} cursor-pointer ${escolha === o ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]" : "border-linha-forte text-muted-foreground hover:border-foreground"}`}>
            <input type="radio" name={`voto-${votacaoId}`} value={o} checked={escolha === o} onChange={() => setEscolha(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
      <button type="button" disabled={!escolha || ocupado} onClick={votar} className={`${botao} mt-3 border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>
        {ocupado ? "Registrando…" : "Confirmar voto"}
      </button>
      {erro && <p role="alert" className="mt-2 font-mono text-[11px] text-[var(--gear-amber)]">{erro}</p>}
    </fieldset>
  )
}
