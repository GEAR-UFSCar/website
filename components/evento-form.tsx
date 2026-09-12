"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { TIPOS_EVENTO, TRILHAS } from "@/lib/administracao"
import { campoBase, rotuloBase } from "@/lib/ui"

/** Agora arredondado para o minuto, no formato que datetime-local aceita. */
const agora = () => {
  const d = new Date()
  d.setSeconds(0, 0)
  // toISOString devolveria UTC; datetime-local espera hora local
  const fuso = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - fuso).toISOString().slice(0, 16)
}

export function EventoForm({ usuarioId }: { usuarioId: string }) {
  const router = useRouter()
  const [campos, setCampos] = useState({
    titulo: "",
    descricao: "",
    tipo: TIPOS_EVENTO[0] as string,
    data_inicio: agora(),
    data_fim: "",
    trilha_vinculada: "",
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set =
    (chave: keyof typeof campos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)

    // o CHECK eventos_intervalo_valido recusaria, mas o aviso local é melhor
    if (campos.data_fim && campos.data_fim < campos.data_inicio) {
      setErro("O fim do evento não pode ser antes do início.")
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const { error } = await supabase.from("eventos").insert({
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim() || null,
      tipo: campos.tipo,
      data_inicio: new Date(campos.data_inicio).toISOString(),
      data_fim: campos.data_fim ? new Date(campos.data_fim).toISOString() : null,
      // vazio = evento geral da entidade, não de uma trilha
      trilha_vinculada: campos.trilha_vinculada || null,
      criado_por: usuarioId,
    })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setCampos({
      titulo: "",
      descricao: "",
      tipo: TIPOS_EVENTO[0],
      data_inicio: agora(),
      data_fim: "",
      trilha_vinculada: "",
    })
    setSalvando(false)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-white/10 p-6 space-y-5">
      <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">NOVO EVENTO</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label htmlFor="titulo" className={rotuloBase}>
            Título
          </label>
          <input
            id="titulo"
            required
            value={campos.titulo}
            onChange={set("titulo")}
            disabled={salvando}
            className={campoBase}
          />
        </div>

        <div>
          <label htmlFor="tipo" className={rotuloBase}>
            Tipo
          </label>
          <select
            id="tipo"
            value={campos.tipo}
            onChange={set("tipo")}
            disabled={salvando}
            className={campoBase}
          >
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t} className="bg-[var(--gear-ink)]">
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="trilha_vinculada" className={rotuloBase}>
            Trilha
          </label>
          <select
            id="trilha_vinculada"
            value={campos.trilha_vinculada}
            onChange={set("trilha_vinculada")}
            disabled={salvando}
            className={campoBase}
          >
            <option value="" className="bg-[var(--gear-ink)]">
              Geral (toda a entidade)
            </option>
            {TRILHAS.map((t) => (
              <option key={t} value={t} className="bg-[var(--gear-ink)]">
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="data_inicio" className={rotuloBase}>
            Início
          </label>
          <input
            id="data_inicio"
            type="datetime-local"
            required
            value={campos.data_inicio}
            onChange={set("data_inicio")}
            disabled={salvando}
            className={campoBase}
          />
        </div>

        <div>
          <label htmlFor="data_fim" className={rotuloBase}>
            Fim (opcional)
          </label>
          <input
            id="data_fim"
            type="datetime-local"
            value={campos.data_fim}
            onChange={set("data_fim")}
            disabled={salvando}
            className={campoBase}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="descricao" className={rotuloBase}>
            Descrição (opcional)
          </label>
          <textarea
            id="descricao"
            rows={3}
            value={campos.descricao}
            onChange={set("descricao")}
            disabled={salvando}
            className={`${campoBase} resize-y`}
          />
        </div>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={salvando}
        data-cursor-hover
        className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Criar evento"}
      </button>
    </form>
  )
}
