"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { campoBase, rotuloBase } from "@/lib/ui"

export function MuralForm({ usuarioId }: { usuarioId: string }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [fixado, setFixado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const supabase = createClient()
    const { error } = await supabase.from("avisos").insert({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      fixado,
      // preenchido aqui, não digitado: é sempre quem está logado
      autor_id: usuarioId,
    })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setTitulo("")
    setConteudo("")
    setFixado(false)
    setSalvando(false)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-white/10 p-6 space-y-5">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">NOVO AVISO</p>

      <div>
        <label htmlFor="titulo" className={rotuloBase}>
          Título
        </label>
        <input
          id="titulo"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={salvando}
          className={campoBase}
        />
      </div>

      <div>
        <label htmlFor="conteudo" className={rotuloBase}>
          Conteúdo
        </label>
        <textarea
          id="conteudo"
          rows={5}
          required
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          disabled={salvando}
          className={`${campoBase} resize-y`}
        />
      </div>

      <label htmlFor="fixado" className="flex items-center gap-3 cursor-pointer" data-cursor-hover>
        <input
          id="fixado"
          type="checkbox"
          checked={fixado}
          onChange={(e) => setFixado(e.target.checked)}
          disabled={salvando}
          className="h-4 w-4 accent-[var(--gear-amber)]"
        />
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
          Fixar no topo do mural
        </span>
      </label>

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
        {salvando ? "Publicando…" : "Publicar aviso"}
      </button>
    </form>
  )
}
