"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { useEncerrarEdicao } from "@/components/membros/registro-editavel"

type Aviso = { id: string; titulo: string; conteudo: string; fixado: boolean }

/** Sem `aviso` cria; com `aviso` edita aquele registro. */
export function MuralForm({ usuarioId, aviso }: { usuarioId: string; aviso?: Aviso }) {
  const router = useRouter()
  const encerrar = useEncerrarEdicao()
  const sufixo = aviso?.id ?? "novo"
  const [titulo, setTitulo] = useState(aviso?.titulo ?? "")
  const [conteudo, setConteudo] = useState(aviso?.conteudo ?? "")
  const [fixado, setFixado] = useState(aviso?.fixado ?? false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const supabase = createClient()

    if (aviso) {
      const { data, error } = await supabase
        .from("avisos")
        .update({ titulo: titulo.trim(), conteudo: conteudo.trim(), fixado })
        .eq("id", aviso.id)
        .select("id")
      setSalvando(false)
      if (error) return setErro(mensagemSegura(error))
      if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")
      encerrar?.()
      router.refresh()
      return
    }

    const { error } = await supabase.from("avisos").insert({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      fixado,
      // preenchido aqui, não digitado: é sempre quem está logado
      /*
       * Mandado por compatibilidade com bancos em que a 016 ainda não rodou.
       * Depois dela o valor é irrelevante: o trigger de autoria sobrescreve
       * esta coluna com auth.uid() antes de gravar. Não confie neste campo
       * como prova de autoria, a prova está no banco.
       */
      autor_id: usuarioId,
    })

    if (error) {
      setErro(mensagemSegura(error))
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
    <form onSubmit={enviar} className="border border-linha p-6 space-y-5">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">{aviso ? "EDITANDO AVISO" : "NOVO AVISO"}</p>

      <div>
        <label htmlFor={`titulo-${sufixo}`} className={rotuloBase}>
          Título
        </label>
        <input
          id={`titulo-${sufixo}`}
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={salvando}
          className={campoBase}
        />
      </div>

      <div>
        <label htmlFor={`conteudo-${sufixo}`} className={rotuloBase}>
          Conteúdo
        </label>
        <textarea
          id={`conteudo-${sufixo}`}
          rows={5}
          required
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          disabled={salvando}
          className={`${campoBase} resize-y`}
        />
      </div>

      <label htmlFor={`fixado-${sufixo}`} className="flex items-center gap-3 cursor-pointer" data-cursor-hover>
        <input
          id={`fixado-${sufixo}`}
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
        {salvando ? "Salvando…" : aviso ? "Salvar" : "Publicar aviso"}
      </button>
    </form>
  )
}
