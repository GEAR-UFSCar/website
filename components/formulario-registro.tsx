"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { faltando, modeloPorId, nivelDeRisco, type Campo } from "@/lib/formularios"
import { campoBase, rotuloBase } from "@/lib/ui"

type Pessoa = { id: string; nome_completo: string | null }
type Dados = Record<string, unknown>

const botao =
  "min-h-11 border px-6 py-2.5 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"

/**
 * Preenche qualquer modelo de lib/formularios.ts. Sem `registro` cria um novo;
 * com ele, corrige um rascunho ou um registro devolvido. O banco (035) numera,
 * carimba o autor e impede que alguém aprove o que ele mesmo enviou.
 */
export function FormularioRegistro({
  modeloId,
  pessoas,
  registro,
}: {
  modeloId: string
  pessoas: Pessoa[]
  registro?: { id: string; titulo: string; dados: Dados }
}) {
  const modelo = modeloPorId(modeloId)!
  const router = useRouter()
  const [titulo, setTitulo] = useState(registro?.titulo ?? "")
  const [dados, setDados] = useState<Dados>(registro?.dados ?? {})
  const [anonimo, setAnonimo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  const set = (id: string, valor: unknown) => setDados((d) => ({ ...d, [id]: valor }))

  const salvar = async (status: "rascunho" | "enviado") => {
    setErro(null)
    if (status === "enviado") {
      const falta = faltando(modelo, dados)
      if (!titulo.trim()) falta.unshift("Título")
      if (falta.length) return setErro(`Falta preencher: ${falta.join("; ")}.`)
    }
    setSalvando(true)
    const supabase = createClient()
    const valores = { titulo: titulo.trim() || modelo.nome, dados, status }

    if (registro) {
      const { data, error } = await supabase.from("registros").update(valores).eq("id", registro.id).select("id")
      setSalvando(false)
      if (error) return setErro(mensagemSegura(error))
      if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")
      router.refresh()
      return
    }

    const novo = { ...valores, modelo: modelo.id, visibilidade: modelo.visibilidade, anonimo: modelo.id === "denuncia" && anonimo }
    // Denúncia: quem envia não pode ler de volta (só a diretoria lê), então não pede a linha.
    if (modelo.visibilidade === "denuncia") {
      const { error } = await supabase.from("registros").insert(novo)
      setSalvando(false)
      if (error) return setErro(mensagemSegura(error))
      setEnviado(true)
      return
    }
    const { data, error } = await supabase.from("registros").insert(novo).select("id").single()
    setSalvando(false)
    if (error) return setErro(mensagemSegura(error))
    router.push(`/membros/formularios/${data.id}`)
  }

  if (enviado) {
    return (
      <div role="status" className="border border-[var(--gear-amber)] p-6 font-sans text-base font-light leading-relaxed">
        Recebido. A Presidência e a Vice foram as únicas a ver. {anonimo ? "Você não foi identificado(a)." : "Se precisarem de mais informação, vão te procurar."}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <div>
        <label htmlFor="titulo" className={rotuloBase}>Título</label>
        <input id="titulo" maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={modelo.nome} className={campoBase} />
      </div>

      {modelo.secoes.map((secao, i) => (
        <fieldset key={i} className="space-y-6 border-t border-linha pt-6">
          {secao.titulo && <legend className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gear-amber)]">{secao.titulo}</legend>}
          {secao.campos.map((c) => (
            <CampoEditor key={c.id} campo={c} valor={dados[c.id]} aoMudar={(v) => set(c.id, v)} pessoas={pessoas} />
          ))}
        </fieldset>
      ))}

      {modelo.id === "denuncia" && (
        <label className="flex min-h-11 items-center gap-3 font-sans text-sm">
          <input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} className="h-5 w-5 accent-[var(--gear-amber)]" />
          Enviar anonimamente (seu nome não é gravado em lugar nenhum)
        </label>
      )}

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4 font-sans text-sm font-light">{erro}</div>
      )}

      <div className="flex flex-wrap gap-3">
        {modelo.id !== "denuncia" && (
          <button type="button" disabled={salvando} onClick={() => salvar("rascunho")} className={`${botao} border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground`}>
            Salvar rascunho
          </button>
        )}
        <button type="button" disabled={salvando} onClick={() => salvar("enviado")} className={`${botao} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}>
          {salvando ? "Salvando…" : modelo.aprovacao ? `Enviar para ${modelo.aprovacao}` : "Enviar"}
        </button>
      </div>
    </form>
  )
}

function CampoEditor({ campo: c, valor, aoMudar, pessoas }: { campo: Campo; valor: unknown; aoMudar: (v: unknown) => void; pessoas: Pessoa[] }) {
  const id = `campo-${c.id}`
  const rotulo = (
    <label htmlFor={id} className={rotuloBase}>
      {c.rotulo}
      {c.obrigatorio && <span aria-hidden="true" className="text-[var(--gear-amber)]"> *</span>}
    </label>
  )
  const ajuda = c.ajuda && <p className="mt-1 font-sans text-xs font-light text-muted-foreground">{c.ajuda}</p>
  const texto = typeof valor === "string" ? valor : ""
  const lista = Array.isArray(valor) ? (valor as string[]) : []
  const alternar = (item: string) => aoMudar(lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item])

  switch (c.tipo) {
    case "area":
      return <div>{rotulo}<textarea id={id} rows={4} maxLength={8000} value={texto} onChange={(e) => aoMudar(e.target.value)} className={`${campoBase} resize-y`} />{ajuda}</div>
    case "pessoa":
      return (
        <div>{rotulo}
          <select id={id} value={texto} onChange={(e) => aoMudar(e.target.value)} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Escolha…</option>
            {pessoas.map((p) => <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">{p.nome_completo}</option>)}
          </select>{ajuda}
        </div>
      )
    case "opcao":
      return (
        <div>{rotulo}
          <select id={id} value={texto} onChange={(e) => aoMudar(e.target.value)} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Escolha…</option>
            {c.opcoes.map((o) => <option key={o} value={o} className="bg-[var(--gear-ink)]">{o}</option>)}
          </select>{ajuda}
        </div>
      )
    case "multipla":
    case "checklist": {
      const itens: readonly string[] = "itens" in c ? c.itens : c.opcoes
      return (
        <fieldset>
          <legend className={rotuloBase}>{c.rotulo}{c.obrigatorio && <span aria-hidden="true" className="text-[var(--gear-amber)]"> *</span>}</legend>
          {ajuda}
          <div className="mt-2 space-y-1">
            {itens.map((item) => (
              <label key={item} className="flex min-h-11 cursor-pointer items-start gap-3 py-1 font-sans text-sm font-light">
                <input type="checkbox" checked={lista.includes(item)} onChange={() => alternar(item)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gear-amber)]" />
                {item}
              </label>
            ))}
          </div>
        </fieldset>
      )
    }
    case "tabela":
      return <TabelaEditor campo={c} valor={valor} aoMudar={aoMudar} />
    default:
      return (
        <div>{rotulo}
          <input id={id} type={c.tipo === "data" ? "date" : c.tipo === "numero" ? "number" : "text"} maxLength={500} value={texto} onChange={(e) => aoMudar(e.target.value)} className={campoBase} />{ajuda}
        </div>
      )
  }
}

function TabelaEditor({ campo: c, valor, aoMudar }: { campo: Extract<Campo, { tipo: "tabela" }>; valor: unknown; aoMudar: (v: unknown) => void }) {
  const fixas = c.linhas
  const linhas = Array.isArray(valor) ? (valor as string[][]) : fixas ? fixas.map(() => c.colunas.map(() => "")) : []
  const mudar = (l: number, k: number, v: string) => aoMudar(linhas.map((linha, i) => (i === l ? linha.map((x, j) => (j === k ? v : x)) : linha)))
  const risco = c.colunas[0]?.startsWith("Gravidade")

  return (
    <fieldset>
      <legend className={rotuloBase}>{c.rotulo}</legend>
      {c.ajuda && <p className="mt-1 font-sans text-xs font-light text-muted-foreground">{c.ajuda}</p>}
      <div className="mt-3 space-y-3">
        {linhas.map((linha, l) => {
          const nivel = risco ? nivelDeRisco(linha[0] ?? "", linha[1] ?? "") : null
          return (
            <div key={l} className="border border-linha p-3">
              {fixas && <p className="mb-2 font-sans text-sm">{fixas[l]}</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                {c.colunas.map((col, k) => (
                  <label key={col} className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{col}</span>
                    <input value={linha[k] ?? ""} maxLength={500} onChange={(e) => mudar(l, k, e.target.value)} className={`${campoBase} mt-1`} />
                  </label>
                ))}
              </div>
              {nivel && (
                <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.15em] ${nivel.valor > 6 ? "text-[var(--gear-amber)]" : "text-muted-foreground"}`}>
                  Risco {nivel.valor}: {nivel.faixa}
                </p>
              )}
              {!fixas && (
                <button type="button" onClick={() => aoMudar(linhas.filter((_, i) => i !== l))} className="mt-2 min-h-11 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-[var(--gear-amber)] md:min-h-0">
                  Remover linha
                </button>
              )}
            </div>
          )
        })}
      </div>
      {!fixas && (
        <button type="button" onClick={() => aoMudar([...linhas, c.colunas.map(() => "")])} className="mt-3 min-h-11 border border-linha-forte px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:border-foreground hover:text-foreground">
          + Linha
        </button>
      )}
    </fieldset>
  )
}
