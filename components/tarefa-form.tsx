import { useState } from "react"
import type React from "react"

import { acaoAmbar } from "@/components/tarefa-item"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase } from "@/lib/ui"

type Opcao = { id: string; nome: string }

/**
 * Nova tarefa. "Pronto quando…" é obrigatório aqui e no banco (GE010).
 * Com `sprintId` fixo, a tarefa nasce no projeto do cartão; com `projetos`,
 * a pessoa escolhe (ou deixa sem projeto). Só é importado por Client Components.
 */
export function TarefaForm({
  sprintId,
  projetos,
  pessoas,
  aoCriar,
}: {
  sprintId?: string
  projetos?: Opcao[]
  pessoas: { id: string; nome_completo: string | null }[]
  aoCriar: () => void
}) {
  const vazio = { titulo: "", pronto_quando: "", responsavel_id: "", prazo: "", sprint_id: sprintId ?? "", nivel: "", area: "", roteiro: "" }
  const [f, setF] = useState(vazio)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const muda = (campo: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((a) => ({ ...a, [campo]: e.target.value }))

  const criar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const { error } = await createClient().from("sprint_tarefas").insert({
      titulo: f.titulo.trim(),
      pronto_quando: f.pronto_quando.trim(),
      sprint_id: f.sprint_id || null,
      responsavel_id: f.responsavel_id || null,
      prazo: f.prazo || null,
      nivel: f.nivel || null,
      area: f.area.trim() || null,
      roteiro: f.roteiro.trim() || null,
    })
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    setF({ ...vazio, sprint_id: f.sprint_id })
    aoCriar()
  }

  const id = sprintId ?? "geral"
  return (
    <form onSubmit={criar} className="@container mt-4 border border-dashed border-linha-forte p-3">
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        <label className="sr-only" htmlFor={`t-titulo-${id}`}>Nova tarefa</label>
        <input id={`t-titulo-${id}`} required maxLength={200} placeholder="Nova tarefa…" value={f.titulo} onChange={muda("titulo")} disabled={ocupado} className={campoBase} />
        <label className="sr-only" htmlFor={`t-pronto-${id}`}>Pronto quando</label>
        <input id={`t-pronto-${id}`} required maxLength={1000} placeholder="Pronto quando… (obrigatório)" value={f.pronto_quando} onChange={muda("pronto_quando")} disabled={ocupado} className={campoBase} />
        {projetos && (
          <>
            <label className="sr-only" htmlFor={`t-proj-${id}`}>Projeto</label>
            <select id={`t-proj-${id}`} value={f.sprint_id} onChange={muda("sprint_id")} disabled={ocupado} className={campoBase}>
              <option value="" className="bg-[var(--gear-ink)]">Sem projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">{p.nome}</option>
              ))}
            </select>
          </>
        )}
        <label className="sr-only" htmlFor={`t-resp-${id}`}>Responsável</label>
        <select id={`t-resp-${id}`} value={f.responsavel_id} onChange={muda("responsavel_id")} disabled={ocupado} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Sem responsável (pauta aberta)</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">{p.nome_completo}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`t-prazo-${id}`}>Prazo</label>
        <input id={`t-prazo-${id}`} type="date" value={f.prazo} onChange={muda("prazo")} disabled={ocupado} className={campoBase} />
        <details className="@md:col-span-2">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-[var(--gear-amber)]">
            Nível, área e primeiros passos (ajuda quem vai assumir)
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-2 @md:grid-cols-2">
            <label className="sr-only" htmlFor={`t-nivel-${id}`}>Nível de dificuldade</label>
            <select id={`t-nivel-${id}`} value={f.nivel} onChange={muda("nivel")} disabled={ocupado} className={campoBase}>
              <option value="" className="bg-[var(--gear-ink)]">Nível de dificuldade</option>
              {["Fundamental", "Principal", "Avançada"].map((n) => <option key={n} value={n} className="bg-[var(--gear-ink)]">{n}</option>)}
            </select>
            <label className="sr-only" htmlFor={`t-area-${id}`}>Área</label>
            <input id={`t-area-${id}`} maxLength={60} placeholder="Área (ex.: ROS 2, Eletrônica)" value={f.area} onChange={muda("area")} disabled={ocupado} className={campoBase} />
            <label className="sr-only" htmlFor={`t-roteiro-${id}`}>Primeiros passos</label>
            <textarea id={`t-roteiro-${id}`} rows={3} maxLength={4000} placeholder={"Primeiros passos\n1. …"} value={f.roteiro} onChange={muda("roteiro")} disabled={ocupado} className={`${campoBase} @md:col-span-2`} />
          </div>
        </details>
        <button type="submit" disabled={ocupado || !f.titulo.trim() || !f.pronto_quando.trim()} className={acaoAmbar}>
          Adicionar
        </button>
      </div>
      {erro && <p role="alert" className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">{erro}</p>}
    </form>
  )
}
