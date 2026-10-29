"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { FRENTES } from "@/lib/administracao"
import { mensagemSegura } from "@/lib/erros"
import { hojeISO } from "@/lib/datas"
import { campoBase, rotuloBase } from "@/lib/ui"

const botao =
  "border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50"
const pequeno =
  "inline-flex min-h-11 items-center border px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"

/** Número digitado com vírgula ou ponto; vazio vira null. */
const valor = (t: string) => (t.trim() ? Number(t.replace(",", ".")) : null)

/** Qualquer membro pede; a decisão é de quem cuida do dinheiro (033). */
export function PedidoForm() {
  const router = useRouter()
  const vazio = { item: "", justificativa: "", link: "", valor_estimado: "", frente: "" }
  const [c, setC] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC((a) => ({ ...a, [k]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg(null)
    setSalvando(true)
    const { error } = await createClient().from("pedidos_compra").insert({
      item: c.item.trim(),
      justificativa: c.justificativa.trim(),
      link: c.link.trim() || null,
      valor_estimado: valor(c.valor_estimado),
      frente: c.frente || null,
    })
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setC(vazio)
    setMsg("Pedido enviado. A tesouraria responde por aqui.")
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="ped-item" className={rotuloBase}>O que comprar</label>
          <input id="ped-item" required maxLength={200} value={c.item} onChange={set("item")} className={campoBase} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="ped-just" className={rotuloBase}>Para quê</label>
          <textarea id="ped-just" required rows={3} maxLength={2000} value={c.justificativa} onChange={set("justificativa")} className={`${campoBase} resize-y`} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="ped-link" className={rotuloBase}>Link do produto (opcional)</label>
          <input id="ped-link" type="url" pattern="https?://.+" maxLength={2000} placeholder="https://…" value={c.link} onChange={set("link")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="ped-valor" className={rotuloBase}>Valor estimado (R$)</label>
          <input id="ped-valor" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={c.valor_estimado} onChange={set("valor_estimado")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="ped-frente" className={rotuloBase}>Frente</label>
          <select id="ped-frente" value={c.frente} onChange={set("frente")} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Geral</option>
            {FRENTES.map((f) => <option key={f} value={f} className="bg-[var(--gear-ink)]">{f}</option>)}
          </select>
        </div>
      </div>
      {msg && <p role="status" className="font-mono text-[11px] text-[var(--gear-amber)]">{msg}</p>}
      <button type="submit" disabled={salvando} className={botao}>{salvando ? "Enviando…" : "Enviar pedido"}</button>
    </form>
  )
}

/** Aprovar, recusar ou marcar comprado, com uma resposta opcional para quem pediu. */
export function PedidoDecisao({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [resposta, setResposta] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const decidir = async (novo: string) => {
    setErro(null)
    setOcupado(true)
    const { data, error } = await createClient()
      .from("pedidos_compra")
      .update({ status: novo, ...(resposta.trim() && { resposta: resposta.trim() }) })
      .eq("id", id)
      .select("id")
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nada mudou, a política de acesso recusou.")
    router.refresh()
  }

  const opcoes = status === "Pendente" ? ["Aprovado", "Recusado"] : status === "Aprovado" ? ["Comprado", "Recusado"] : []
  if (opcoes.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label htmlFor={`resp-${id}`} className="sr-only">Resposta para quem pediu</label>
      <input id={`resp-${id}`} maxLength={1000} placeholder="Resposta (opcional)" value={resposta} onChange={(e) => setResposta(e.target.value)} className={`${campoBase} min-h-11 max-w-xs`} />
      {opcoes.map((o) => (
        <button key={o} type="button" disabled={ocupado} onClick={() => decidir(o)}
          className={`${pequeno} ${o === "Recusado" ? "border-linha-forte text-muted-foreground hover:border-foreground" : "border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"}`}>
          {o === "Aprovado" ? "Aprovar" : o === "Recusado" ? "Recusar" : "Marcar comprado"}
        </button>
      ))}
      {erro && <p role="alert" className="basis-full font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}

/** Entrada ou saída no caixa. */
export function LancamentoCaixaForm() {
  const router = useRouter()
  const vazio = { data: hojeISO(), tipo: "Saída", valor: "", descricao: "", categoria: "", comprovante_url: "" }
  const [c, setC] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setC((a) => ({ ...a, [k]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg(null)
    setSalvando(true)
    const { error } = await createClient().from("caixa_lancamentos").insert({
      data: c.data,
      tipo: c.tipo,
      valor: valor(c.valor),
      descricao: c.descricao.trim(),
      categoria: c.categoria.trim() || null,
      comprovante_url: c.comprovante_url.trim() || null,
    })
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setC(vazio)
    setMsg("Lançado.")
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="cx-data" className={rotuloBase}>Data</label>
          <input id="cx-data" type="date" required value={c.data} onChange={set("data")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="cx-tipo" className={rotuloBase}>Tipo</label>
          <select id="cx-tipo" value={c.tipo} onChange={set("tipo")} className={campoBase}>
            {["Entrada", "Saída"].map((t) => <option key={t} value={t} className="bg-[var(--gear-ink)]">{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cx-valor" className={rotuloBase}>Valor (R$)</label>
          <input id="cx-valor" required inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={c.valor} onChange={set("valor")} className={campoBase} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="cx-desc" className={rotuloBase}>Descrição</label>
          <input id="cx-desc" required maxLength={300} value={c.descricao} onChange={set("descricao")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="cx-cat" className={rotuloBase}>Categoria</label>
          <input id="cx-cat" maxLength={60} placeholder="Componentes, Inscrição…" value={c.categoria} onChange={set("categoria")} className={campoBase} />
        </div>
        <div className="md:col-span-3">
          <label htmlFor="cx-comp" className={rotuloBase}>Link do comprovante (opcional)</label>
          <input id="cx-comp" type="url" pattern="https?://.+" maxLength={2000} placeholder="https://drive…" value={c.comprovante_url} onChange={set("comprovante_url")} className={campoBase} />
        </div>
      </div>
      {msg && <p role="status" className="font-mono text-[11px] text-[var(--gear-amber)]">{msg}</p>}
      <button type="submit" disabled={salvando} className={botao}>{salvando ? "Salvando…" : "Lançar"}</button>
    </form>
  )
}
