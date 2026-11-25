"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { useEncerrarEdicao } from "@/components/membros/registro-editavel"
import { escreverQuiz, lerQuiz, TIPOS_LICAO, type Licao, type TipoLicao } from "@/lib/academia"
import { mensagemSegura } from "@/lib/erros"
import { createClient } from "@/lib/supabase/client"
import { botaoEnviar, campoBase, rotuloBase } from "@/lib/ui"

const NOME_TIPO: Record<TipoLicao, string> = { texto: "Texto", video: "Vídeo", quiz: "Quiz" }

const EXEMPLO_QUIZ = `? Qual comando lista os tópicos ativos?
- ros2 node list
* ros2 topic list
> "topic list" mostra tópicos; "node list", os nós.`

/** Lição de uma competência (047). Sem `licao` cria a próxima; com `licao` corrige aquela. */
export function LicaoForm({ moduloId, licao, proximaOrdem = 1 }: { moduloId: string; licao?: Licao; proximaOrdem?: number }) {
  const router = useRouter()
  const encerrar = useEncerrarEdicao()
  const sufixo = licao?.id ?? "nova"
  const inicial = () => ({
    titulo: licao?.titulo ?? "",
    tipo: (licao?.tipo ?? "texto") as TipoLicao,
    ordem: String(licao?.ordem ?? proximaOrdem),
    duracao_min: licao?.duracao_min ? String(licao.duracao_min) : "",
    corpo: licao?.corpo ?? "",
    video_url: licao?.video_url ?? "",
    quiz: licao?.questoes?.length ? escreverQuiz(licao.questoes) : "",
  })
  const [c, setC] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC((a) => ({ ...a, [k]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    let questoes: Licao["questoes"] = []
    if (c.tipo === "quiz") {
      const q = lerQuiz(c.quiz)
      if ("erro" in q) return setErro(q.erro)
      questoes = q.questoes
    }
    const valores = {
      modulo_id: moduloId,
      titulo: c.titulo.trim(),
      tipo: c.tipo,
      ordem: Number(c.ordem) || 1,
      duracao_min: c.duracao_min ? Number(c.duracao_min) : null,
      corpo: c.corpo,
      video_url: c.tipo === "video" ? c.video_url.trim() : null,
      questoes,
    }
    setSalvando(true)
    const supabase = createClient()
    const { data, error } = licao
      ? await supabase.from("licoes").update(valores).eq("id", licao.id).select("id")
      : await supabase.from("licoes").insert(valores).select("id")
    setSalvando(false)
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")
    if (licao) encerrar?.()
    else setC({ ...inicial(), ordem: String(Number(c.ordem) + 1) })
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="space-y-5 border border-linha p-6">
      <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] md:text-[9px]">{licao ? "CORRIGINDO LIÇÃO" : "NOVA LIÇÃO"}</p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor={`lt-${sufixo}`} className={rotuloBase}>Título</label>
          <input id={`lt-${sufixo}`} required maxLength={200} value={c.titulo} onChange={set("titulo")} disabled={salvando} className={campoBase} />
        </div>
        <div>
          <label htmlFor={`ltipo-${sufixo}`} className={rotuloBase}>Tipo</label>
          <select id={`ltipo-${sufixo}`} value={c.tipo} onChange={set("tipo")} disabled={salvando} className={campoBase}>
            {TIPOS_LICAO.map((t) => <option key={t} value={t} className="bg-[var(--gear-ink)]">{NOME_TIPO[t]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`lo-${sufixo}`} className={rotuloBase}>Ordem</label>
            <input id={`lo-${sufixo}`} type="number" min={1} required value={c.ordem} onChange={set("ordem")} disabled={salvando} className={campoBase} />
          </div>
          <div>
            <label htmlFor={`ld-${sufixo}`} className={rotuloBase}>Min</label>
            <input id={`ld-${sufixo}`} type="number" min={1} max={600} value={c.duracao_min} onChange={set("duracao_min")} disabled={salvando} className={campoBase} />
          </div>
        </div>

        {c.tipo === "video" && (
          <div className="md:col-span-4">
            <label htmlFor={`lv-${sufixo}`} className={rotuloBase}>Link do vídeo (YouTube vira player; outro link abre fora)</label>
            <input id={`lv-${sufixo}`} type="url" required pattern="https://.+" maxLength={2000} placeholder="https://www.youtube.com/watch?v=…" value={c.video_url} onChange={set("video_url")} disabled={salvando} className={campoBase} />
          </div>
        )}

        {c.tipo === "quiz" && (
          <div className="md:col-span-4">
            <label htmlFor={`lq-${sufixo}`} className={rotuloBase}>
              Questões: <code>?</code> pergunta, <code>-</code> opção, <code>*</code> opção certa, <code>&gt;</code> explicação
            </label>
            <textarea id={`lq-${sufixo}`} required rows={8} value={c.quiz} onChange={set("quiz")} placeholder={EXEMPLO_QUIZ} disabled={salvando} className={`${campoBase} resize-y font-mono text-xs`} />
          </div>
        )}

        <div className="md:col-span-4">
          <label htmlFor={`lc-${sufixo}`} className={rotuloBase}>
            {c.tipo === "texto" ? "Conteúdo (markdown)" : "Texto de apoio (markdown, opcional)"}
          </label>
          <textarea id={`lc-${sufixo}`} required={c.tipo === "texto"} rows={c.tipo === "texto" ? 12 : 4} maxLength={50000} value={c.corpo} onChange={set("corpo")} disabled={salvando} className={`${campoBase} resize-y font-mono text-xs`} />
        </div>
      </div>

      {erro && <p role="alert" className="border border-[var(--gear-amber)] p-3 font-sans text-sm font-light">{erro}</p>}

      <button type="submit" disabled={salvando} data-cursor-hover
        className={botaoEnviar}>
        {salvando ? "Salvando…" : licao ? "Salvar correção" : "Adicionar lição"}
      </button>
    </form>
  )
}
