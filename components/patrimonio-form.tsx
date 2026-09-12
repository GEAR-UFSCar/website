"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { CATEGORIAS, STATUS, TRILHAS } from "@/lib/administracao"
import { campoBase, rotuloBase } from "@/lib/ui"

const VAZIO = {
  item: "",
  categoria: CATEGORIAS[0] as string,
  quantidade: "1",
  status: STATUS[0] as string,
  responsavel_atual: "",
  trilha_vinculada: "",
  localizacao: "",
  observacoes: "",
}

export function PatrimonioForm() {
  const router = useRouter()
  const [campos, setCampos] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set = (chave: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const supabase = createClient()
    const { error } = await supabase.from("patrimonio").insert({
      item: campos.item.trim(),
      categoria: campos.categoria,
      quantidade: Number(campos.quantidade) || 1,
      status: campos.status,
      // strings vazias viram null, para o banco não guardar "" como valor
      responsavel_atual: campos.responsavel_atual.trim() || null,
      trilha_vinculada: campos.trilha_vinculada || null,
      localizacao: campos.localizacao.trim() || null,
      observacoes: campos.observacoes.trim() || null,
    })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setCampos(VAZIO)
    setSalvando(false)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-white/10 p-6 space-y-5">
      <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">NOVO ITEM</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label htmlFor="item" className={rotuloBase}>Item</label>
          <input id="item" required value={campos.item} onChange={set("item")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor="categoria" className={rotuloBase}>Categoria</label>
          <select id="categoria" value={campos.categoria} onChange={set("categoria")} disabled={salvando} className={campoBase}>
            {CATEGORIAS.map((c) => <option key={c} value={c} className="bg-[var(--gear-ink)]">{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="quantidade" className={rotuloBase}>Quantidade</label>
          <input id="quantidade" type="number" min="0" required value={campos.quantidade} onChange={set("quantidade")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor="status" className={rotuloBase}>Status</label>
          <select id="status" value={campos.status} onChange={set("status")} disabled={salvando} className={campoBase}>
            {STATUS.map((s) => <option key={s} value={s} className="bg-[var(--gear-ink)]">{s}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="trilha_vinculada" className={rotuloBase}>Trilha vinculada</label>
          <select id="trilha_vinculada" value={campos.trilha_vinculada} onChange={set("trilha_vinculada")} disabled={salvando} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Nenhuma</option>
            {TRILHAS.map((t) => <option key={t} value={t} className="bg-[var(--gear-ink)]">{t}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="responsavel_atual" className={rotuloBase}>Responsável atual</label>
          <input id="responsavel_atual" value={campos.responsavel_atual} onChange={set("responsavel_atual")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor="localizacao" className={rotuloBase}>Localização</label>
          <input id="localizacao" value={campos.localizacao} onChange={set("localizacao")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="observacoes" className={rotuloBase}>Observações</label>
          <textarea id="observacoes" rows={3} value={campos.observacoes} onChange={set("observacoes")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button type="submit" disabled={salvando} data-cursor-hover
        className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50">
        {salvando ? "Salvando…" : "Adicionar item"}
      </button>
    </form>
  )
}
