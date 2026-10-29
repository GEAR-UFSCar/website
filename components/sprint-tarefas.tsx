"use client"

import { useEffect, useState } from "react"
import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { dataDoDia, hojeISO } from "@/lib/datas"
import { campoBase } from "@/lib/ui"

type Tarefa = {
  id: string
  titulo: string
  prazo: string | null
  feita: boolean
  responsavel_id: string | null
  responsavel: { nome_completo: string | null } | null
}

type Pessoa = { id: string; nome_completo: string | null }

const acao =
  "inline-flex min-h-11 items-center border px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 md:min-h-0"

/**
 * Checklist do sprint (033). Busca as próprias tarefas no navegador em vez de
 * vir pelo quadro: assim o cartão não obriga frente-painel e sprints-quadro a
 * carregar mais uma lista. ponytail: uma consulta por cartão aberto; se o
 * quadro passar de dezenas de sprints, trazer tudo junto em frente-painel.
 *
 * Quem edita o sprint cria, atribui e apaga; o responsável marca como feita.
 */
export function SprintTarefas({
  sprintId,
  podeEscrever,
  usuarioId,
  pessoas,
}: {
  sprintId: string
  podeEscrever: boolean
  usuarioId: string
  pessoas: Pessoa[]
}) {
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [novo, setNovo] = useState({ titulo: "", responsavel_id: "", prazo: "" })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // cada escrita incrementa `versao`, e o efeito relê a lista
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let vivo = true
    createClient()
      .from("sprint_tarefas")
      .select("id, titulo, prazo, feita, responsavel_id, responsavel:perfis!sprint_tarefas_responsavel_id_fkey(nome_completo)")
      .eq("sprint_id", sprintId)
      .order("feita")
      .order("prazo", { nullsFirst: false })
      .order("created_at")
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) setErro(mensagemSegura(error))
        setTarefas((data ?? []) as unknown as Tarefa[])
      })
    return () => {
      vivo = false
    }
  }, [sprintId, versao])

  const executar = async (fn: () => PromiseLike<{ error: { code?: string; message: string } | null }>) => {
    setErro(null)
    setOcupado(true)
    const { error } = await fn()
    setOcupado(false)
    if (error) {
      setErro(mensagemSegura(error))
      return false
    }
    setVersao((v) => v + 1)
    return true
  }

  const criar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const titulo = novo.titulo.trim()
    if (!titulo) return
    void executar(() =>
      createClient()
        .from("sprint_tarefas")
        .insert({ sprint_id: sprintId, titulo, responsavel_id: novo.responsavel_id || null, prazo: novo.prazo || null }),
    ).then((ok) => ok && setNovo({ titulo: "", responsavel_id: novo.responsavel_id, prazo: "" }))
  }

  if (tarefas === null) return null
  const feitas = tarefas.filter((t) => t.feita).length
  const hoje = hojeISO()

  return (
    <section className="mt-6 border-t border-linha pt-5">
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        Tarefas{tarefas.length > 0 && ` · ${feitas}/${tarefas.length}`}
      </p>

      {tarefas.length === 0 && (
        <p className="mt-3 font-sans text-sm font-light text-muted-foreground">Nenhuma tarefa.</p>
      )}

      <ul className="mt-3 space-y-2">
        {tarefas.map((t) => {
          const podeMarcar = podeEscrever || t.responsavel_id === usuarioId
          const atrasada = !t.feita && t.prazo !== null && t.prazo < hoje
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-3">
              <input
                type="checkbox"
                checked={t.feita}
                disabled={!podeMarcar || ocupado}
                onChange={() =>
                  void executar(() => createClient().from("sprint_tarefas").update({ feita: !t.feita }).eq("id", t.id))
                }
                aria-label={`Marcar "${t.titulo}" como ${t.feita ? "pendente" : "feita"}`}
                className="h-5 w-5 accent-[var(--gear-amber)]"
              />
              <span className={`flex-1 font-sans text-sm ${t.feita ? "text-muted-foreground line-through" : ""}`}>
                {t.titulo}
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t.responsavel?.nome_completo?.split(" ")[0] ?? "sem responsável"}
                  {t.prazo && (
                    <span className={atrasada ? "text-[var(--gear-amber)]" : ""}> · {dataDoDia(t.prazo)}</span>
                  )}
                </span>
              </span>
              {podeEscrever && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void executar(() => createClient().from("sprint_tarefas").delete().eq("id", t.id))}
                  aria-label={`Apagar tarefa "${t.titulo}"`}
                  className={`${acao} border-linha-forte text-muted-foreground hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]`}
                >
                  Apagar
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {podeEscrever && (
        <form onSubmit={criar} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <label htmlFor={`tarefa-${sprintId}`} className="sr-only">Nova tarefa</label>
          <input
            id={`tarefa-${sprintId}`}
            maxLength={200}
            placeholder="Nova tarefa…"
            value={novo.titulo}
            onChange={(e) => setNovo((a) => ({ ...a, titulo: e.target.value }))}
            disabled={ocupado}
            className={`${campoBase} placeholder:text-muted-foreground/50`}
          />
          <label htmlFor={`tarefa-resp-${sprintId}`} className="sr-only">Responsável</label>
          <select
            id={`tarefa-resp-${sprintId}`}
            value={novo.responsavel_id}
            onChange={(e) => setNovo((a) => ({ ...a, responsavel_id: e.target.value }))}
            disabled={ocupado}
            className={campoBase}
          >
            <option value="" className="bg-[var(--gear-ink)]">Sem responsável</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">{p.nome_completo}</option>
            ))}
          </select>
          <label htmlFor={`tarefa-prazo-${sprintId}`} className="sr-only">Prazo</label>
          <input
            id={`tarefa-prazo-${sprintId}`}
            type="date"
            value={novo.prazo}
            onChange={(e) => setNovo((a) => ({ ...a, prazo: e.target.value }))}
            disabled={ocupado}
            className={campoBase}
          />
          <button
            type="submit"
            disabled={ocupado || !novo.titulo.trim()}
            className={`${acao} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}
          >
            Adicionar
          </button>
        </form>
      )}

      {erro && (
        <p role="alert" className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">{erro}</p>
      )}
    </section>
  )
}
