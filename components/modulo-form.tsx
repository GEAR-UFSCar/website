"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { NIVEIS_ACADEMIA, type Modulo } from "@/lib/academia"
import { campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { useEncerrarEdicao } from "@/components/membros/registro-editavel"

const vazio = (proximaOrdem: number) => ({
  nivel: NIVEIS_ACADEMIA[0] as string,
  ordem: String(proximaOrdem),
  titulo: "",
  descricao: "",
  conteudo_url: "",
  prazo_conclusao: "",
  duracao_estimada: "",
})

/**
 * Sem `modulo` cadastra um novo; com `modulo` corrige aquele.
 * `proximaOrdem` sugere o fim do primeiro nível; a pessoa ajusta.
 */
export function ModuloForm({ modulo, proximaOrdem = 1 }: { modulo?: Modulo; proximaOrdem?: number }) {
  const router = useRouter()
  const encerrar = useEncerrarEdicao()
  const sufixo = modulo?.id ?? "novo"
  const [campos, setCampos] = useState(
    modulo
      ? {
          nivel: modulo.nivel,
          ordem: String(modulo.ordem),
          titulo: modulo.titulo,
          descricao: modulo.descricao ?? "",
          conteudo_url: modulo.conteudo_url ?? "",
          prazo_conclusao: modulo.prazo_conclusao ?? "",
          duracao_estimada: modulo.duracao_estimada ? String(modulo.duracao_estimada) : "",
        }
      : vazio(proximaOrdem),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set = (chave: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const valores = {
      nivel: campos.nivel,
      ordem: Number(campos.ordem),
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim() || null,
      conteudo_url: campos.conteudo_url.trim() || null,
      prazo_conclusao: campos.prazo_conclusao || null,
      duracao_estimada: campos.duracao_estimada ? Number(campos.duracao_estimada) : null,
    }

    const supabase = createClient()
    const { data, error } = modulo
      ? await supabase.from("modulos").update(valores).eq("id", modulo.id).select("id")
      : await supabase.from("modulos").insert(valores).select("id")

    setSalvando(false)
    if (error) {
      // a única unicidade de modulos é (nivel, ordem): dizer qual é ajuda mais que a frase genérica
      return setErro(error.code === "23505" ? `Já existe um módulo ${valores.ordem} no nível ${valores.nivel}.` : mensagemSegura(error))
    }
    if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")

    if (modulo) encerrar?.()
    else setCampos(vazio(valores.ordem + 1))
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-linha p-6 space-y-5">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">{modulo ? "CORRIGINDO MÓDULO" : "NOVO MÓDULO"}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor={`nivel-${sufixo}`} className={rotuloBase}>Nível</label>
          <select id={`nivel-${sufixo}`} value={campos.nivel} onChange={set("nivel")} disabled={salvando} className={campoBase}>
            {NIVEIS_ACADEMIA.map((n) => <option key={n} value={n} className="bg-[var(--gear-ink)]">{n}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`ordem-${sufixo}`} className={rotuloBase}>Ordem no nível</label>
          <input id={`ordem-${sufixo}`} type="number" min={1} step={1} required value={campos.ordem} onChange={set("ordem")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`titulo-${sufixo}`} className={rotuloBase}>Título</label>
          <input id={`titulo-${sufixo}`} required maxLength={200} value={campos.titulo} onChange={set("titulo")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`descricao-${sufixo}`} className={rotuloBase}>Descrição</label>
          <textarea id={`descricao-${sufixo}`} rows={3} maxLength={2000} value={campos.descricao} onChange={set("descricao")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`conteudo_url-${sufixo}`} className={rotuloBase}>Link do material</label>
          <input id={`conteudo_url-${sufixo}`} type="url" pattern="https?://.+" placeholder="https://…" maxLength={2000} value={campos.conteudo_url} onChange={set("conteudo_url")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor={`prazo-${sufixo}`} className={rotuloBase}>Prazo de conclusão</label>
          <input id={`prazo-${sufixo}`} type="date" value={campos.prazo_conclusao} onChange={set("prazo_conclusao")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor={`duracao-${sufixo}`} className={rotuloBase}>Duração estimada (minutos)</label>
          <input id={`duracao-${sufixo}`} type="number" min={1} step={1} placeholder="150 = 2h30min" value={campos.duracao_estimada} onChange={set("duracao_estimada")} disabled={salvando} className={campoBase} />
        </div>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button type="submit" disabled={salvando} data-cursor-hover
        className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50">
        {salvando ? "Salvando…" : modulo ? "Salvar correção" : "Cadastrar módulo"}
      </button>
    </form>
  )
}
