"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { FRENTES } from "@/lib/administracao"
import { mensagemSegura } from "@/lib/erros"
import { hojeISO } from "@/lib/datas"
import { botaoEnviar, campoBase, rotuloBase } from "@/lib/ui"

const botao =
  botaoEnviar
const pequeno =
  "inline-flex min-h-11 items-center border px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"

/** Número digitado com vírgula ou ponto; vazio vira null. */
const valor = (t: string) => (t.trim() ? Number(t.replace(",", ".")) : null)

/**
 * Registrar um gasto (044). Até o limite fica "Registrado" na hora; acima,
 * "Aguardando aprovação". Quem decide é o banco (preparar_gasto), não a tela.
 * Comprovante: link ou arquivo (PDF/imagem, até 5 MB, no bucket privado).
 */
export function GastoForm({ limite }: { limite: number }) {
  const router = useRouter()
  const vazio = { item: "", valor: "", data_gasto: hojeISO(), comprovante_url: "", justificativa: "", frente: "" }
  const [c, setC] = useState(vazio)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC((a) => ({ ...a, [k]: e.target.value }))
  const v = valor(c.valor)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg(null)
    setSalvando(true)
    const db = createClient()
    let comprovante_arquivo: string | null = null
    if (arquivo) {
      const { data: u } = await db.auth.getUser()
      const caminho = `${u.user?.id}/${Date.now()}-${arquivo.name.replace(/[^\w.-]+/g, "_").slice(-80)}`
      const up = await db.storage.from("comprovantes").upload(caminho, arquivo)
      if (up.error) {
        setSalvando(false)
        return setMsg("Não deu para enviar o arquivo. Use PDF ou imagem de até 5 MB, ou cole um link.")
      }
      comprovante_arquivo = caminho
    }
    const { data, error } = await db
      .from("pedidos_compra")
      .insert({
        item: c.item.trim(),
        valor_estimado: v,
        data_gasto: c.data_gasto,
        comprovante_url: c.comprovante_url.trim() || null,
        comprovante_arquivo,
        justificativa: c.justificativa.trim() || null,
        frente: c.frente || null,
      })
      .select("status")
      .single()
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setC(vazio)
    setArquivo(null)
    setMsg(data.status === "Registrado" ? "Registrado. Abaixo do limite, não precisa de aprovação." : "Registrado e aguardando aprovação do financeiro.")
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="md:col-span-3">
          <label htmlFor="g-item" className={rotuloBase}>O que foi comprado</label>
          <input id="g-item" required maxLength={200} value={c.item} onChange={set("item")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="g-valor" className={rotuloBase}>Valor (R$)</label>
          <input id="g-valor" required inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={c.valor} onChange={set("valor")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="g-data" className={rotuloBase}>Data</label>
          <input id="g-data" type="date" required value={c.data_gasto} onChange={set("data_gasto")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="g-frente" className={rotuloBase}>Trilha</label>
          <select id="g-frente" value={c.frente} onChange={set("frente")} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Geral</option>
            {FRENTES.map((f) => <option key={f} value={f} className="bg-[var(--gear-ink)]">{f}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="g-link" className={rotuloBase}>Comprovante: link</label>
          <input id="g-link" type="url" pattern="https?://.+" maxLength={2000} placeholder="https://… (nota, recibo)" value={c.comprovante_url} onChange={set("comprovante_url")} className={campoBase} />
        </div>
        <div>
          <label htmlFor="g-arquivo" className={rotuloBase}>…ou arquivo</label>
          <input id="g-arquivo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className={`${campoBase} file:mr-3 file:border-0 file:bg-transparent file:font-mono file:text-[10px] file:uppercase file:text-[var(--gear-amber)]`} />
        </div>
        <div className="md:col-span-3">
          <label htmlFor="g-just" className={rotuloBase}>Para quê (opcional)</label>
          <textarea id="g-just" rows={2} maxLength={2000} value={c.justificativa} onChange={set("justificativa")} className={`${campoBase} resize-y`} />
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {v === null ? `Até ${moedaLimite.format(limite)} registra direto; acima, aguarda aprovação.` : v <= limite ? "Abaixo do limite: registra direto, sem aprovação." : "Acima do limite: vai aguardar aprovação do financeiro."}
      </p>
      {msg && <p role="status" className="font-mono text-[11px] text-[var(--gear-amber)]">{msg}</p>}
      <button type="submit" disabled={salvando || (!c.comprovante_url.trim() && !arquivo)} className={botao}>{salvando ? "Enviando…" : "Registrar gasto"}</button>
    </form>
  )
}

const moedaLimite = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** Arquivo do comprovante: link assinado de 5 minutos, gerado no clique. */
export function ComprovanteArquivo({ caminho }: { caminho: string }) {
  const [erro, setErro] = useState(false)
  const abrir = async () => {
    const { data, error } = await createClient().storage.from("comprovantes").createSignedUrl(caminho, 300)
    if (error || !data) return setErro(true)
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }
  return (
    <button type="button" onClick={() => void abrir()} className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:underline">
      {erro ? "Arquivo indisponível" : "Comprovante (arquivo) ↗"}
    </button>
  )
}

/** Limite de gasto sem aprovação. Só Presidência e Vice mudam (044). */
export function LimiteGastoForm({ atual }: { atual: number }) {
  const router = useRouter()
  const [texto, setTexto] = useState(String(atual).replace(".", ","))
  const [msg, setMsg] = useState<string | null>(null)
  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { data, error } = await createClient().from("parametros").update({ limite_gasto: valor(texto) }).eq("id", true).select("id")
    if (error) return setMsg(mensagemSegura(error))
    if (!data?.length) return setMsg("Nada mudou: só a Presidência muda o limite.")
    setMsg("Limite atualizado.")
    router.refresh()
  }
  return (
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="limite" className={rotuloBase}>Limite sem aprovação (R$)</label>
        <input id="limite" required inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campoBase} max-w-[10rem]`} />
      </div>
      <button type="submit" className={`${pequeno} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>Salvar</button>
      {msg && <p role="status" className="basis-full font-mono text-[10px] text-[var(--gear-amber)]">{msg}</p>}
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

  const opcoes = status === "Aguardando aprovação" ? ["Aprovado", "Recusado"] : status === "Aprovado" ? ["Comprado"] : []
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
