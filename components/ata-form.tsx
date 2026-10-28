"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { TIPOS_ATA } from "@/lib/administracao"
import { campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { hojeISO } from "@/lib/datas"
import { useEncerrarEdicao } from "@/components/membros/registro-editavel"

// hojeISO e não toISOString: depois das 21h o dia em UTC já é amanhã
const hoje = hojeISO

export type AtaEditavel = {
  id: string
  tipo: string
  data_reuniao: string
  presentes: string
  pauta: string
  decisoes: string
  pendencias: string | null
}

/** Sem `ata` registra uma nova; com `ata` corrige aquela. */
export function AtaForm({ usuarioId, ata }: { usuarioId: string; ata?: AtaEditavel }) {
  const router = useRouter()
  const encerrar = useEncerrarEdicao()
  const sufixo = ata?.id ?? "nova"
  const [campos, setCampos] = useState({
    tipo: ata?.tipo ?? (TIPOS_ATA[0] as string),
    data_reuniao: ata?.data_reuniao.slice(0, 10) ?? hoje(),
    presentes: ata?.presentes ?? "",
    pauta: ata?.pauta ?? "",
    decisoes: ata?.decisoes ?? "",
    pendencias: ata?.pendencias ?? "",
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set = (chave: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const supabase = createClient()
    const valores = {
      tipo: campos.tipo,
      data_reuniao: campos.data_reuniao,
      presentes: campos.presentes.trim(),
      pauta: campos.pauta.trim(),
      decisoes: campos.decisoes.trim(),
      pendencias: campos.pendencias.trim() || null,
    }

    if (ata) {
      const { data, error } = await supabase.from("atas").update(valores).eq("id", ata.id).select("id")
      setSalvando(false)
      if (error) return setErro(mensagemSegura(error))
      if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")
      encerrar?.()
      router.refresh()
      return
    }

    const { error } = await supabase.from("atas").insert({
      ...valores,
      // preenchido aqui, não digitado: é sempre quem está logado
      /*
       * Mandado por compatibilidade com bancos em que a 016 ainda não rodou.
       * Depois dela o valor é irrelevante: o trigger de autoria sobrescreve
       * esta coluna com auth.uid() antes de gravar. Não confie neste campo
       * como prova de autoria — a prova está no banco.
       */
      registrado_por: usuarioId,
    })

    if (error) {
      setErro(mensagemSegura(error))
      setSalvando(false)
      return
    }

    setCampos({ tipo: TIPOS_ATA[0], data_reuniao: hoje(), presentes: "", pauta: "", decisoes: "", pendencias: "" })
    setSalvando(false)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-linha p-6 space-y-5">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">{ata ? "CORRIGINDO ATA" : "NOVA ATA"}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor={`tipo-${sufixo}`} className={rotuloBase}>Tipo</label>
          <select id={`tipo-${sufixo}`} value={campos.tipo} onChange={set("tipo")} disabled={salvando} className={campoBase}>
            {TIPOS_ATA.map((t) => <option key={t} value={t} className="bg-[var(--gear-ink)]">{t}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`data_reuniao-${sufixo}`} className={rotuloBase}>Data da reunião</label>
          <input id={`data_reuniao-${sufixo}`} type="date" required value={campos.data_reuniao} onChange={set("data_reuniao")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`presentes-${sufixo}`} className={rotuloBase}>Presentes</label>
          <input id={`presentes-${sufixo}`} required placeholder="Nomes separados por vírgula" value={campos.presentes} onChange={set("presentes")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`pauta-${sufixo}`} className={rotuloBase}>Pauta</label>
          <textarea id={`pauta-${sufixo}`} rows={4} required value={campos.pauta} onChange={set("pauta")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`decisoes-${sufixo}`} className={rotuloBase}>Decisões</label>
          <textarea id={`decisoes-${sufixo}`} rows={4} required value={campos.decisoes} onChange={set("decisoes")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`pendencias-${sufixo}`} className={rotuloBase}>Pendências</label>
          <textarea id={`pendencias-${sufixo}`} rows={3} value={campos.pendencias} onChange={set("pendencias")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button type="submit" disabled={salvando} data-cursor-hover
        className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50">
        {salvando ? "Salvando…" : ata ? "Salvar correção" : "Registrar ata"}
      </button>
    </form>
  )
}
