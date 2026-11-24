"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { TarefaForm } from "@/components/tarefa-form"
import { TarefaItem } from "@/components/tarefa-item"
import { campoBase } from "@/lib/ui"
import { ESTADOS_TAREFA, type EstadoTarefa, type QuemVe, type Tarefa } from "@/lib/tarefas"

type Props = {
  tarefas: Tarefa[]
  projetos: { id: string; nome: string }[]
  pessoas: { id: string; nome_completo: string | null }[]
  quem: QuemVe
}

const chip = (ativo: boolean) =>
  `min-h-11 border px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase md:min-h-0 ${
    ativo ? "border-[var(--gear-amber)] text-[var(--gear-amber)]" : "border-linha-forte text-muted-foreground hover:text-foreground"
  }`

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/**
 * Todas as tarefas, de todos os projetos e sem projeto, em quadro (uma coluna
 * por estado) ou lista. Filtra no navegador: são dezenas, não milhares.
 */
export function TarefasQuadro({ tarefas, projetos, pessoas, quem }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<"quadro" | "lista">("quadro")
  const [busca, setBusca] = useState("")
  const [projeto, setProjeto] = useState("")
  const [estado, setEstado] = useState<EstadoTarefa | "">("")
  const [minhas, setMinhas] = useState(false)
  const reler = () => router.refresh()

  const filtradas = useMemo(() => {
    const termo = normalizar(busca)
    return tarefas.filter(
      (t) =>
        (!termo || normalizar(`${t.titulo} ${t.responsavel?.nome_completo ?? ""}`).includes(termo)) &&
        (!projeto || (projeto === "sem" ? !t.sprint_id : t.sprint_id === projeto)) &&
        (!estado || t.estado === estado) &&
        (!minhas || t.responsavel_id === quem.usuarioId),
    )
  }, [tarefas, busca, projeto, estado, minhas, quem.usuarioId])

  return (
    <>
      <TarefaForm projetos={projetos} pessoas={pessoas} aoCriar={reler} />

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button type="button" className={chip(vista === "quadro")} onClick={() => setVista("quadro")}>Quadro</button>
        <button type="button" className={chip(vista === "lista")} onClick={() => setVista("lista")}>Lista</button>
        <button type="button" className={chip(minhas)} onClick={() => setMinhas((m) => !m)} aria-pressed={minhas}>Só as minhas</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="sr-only" htmlFor="busca-tarefa">Buscar</label>
        <input id="busca-tarefa" type="search" placeholder="Buscar tarefa ou pessoa…" value={busca} onChange={(e) => setBusca(e.target.value)} className={campoBase} />
        <label className="sr-only" htmlFor="filtro-projeto">Projeto</label>
        <select id="filtro-projeto" value={projeto} onChange={(e) => setProjeto(e.target.value)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todos os projetos</option>
          <option value="sem" className="bg-[var(--gear-ink)]">Sem projeto</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">{p.nome}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filtro-estado">Estado</label>
        <select id="filtro-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoTarefa | "")} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todos os estados</option>
          {ESTADOS_TAREFA.map((e) => (
            <option key={e} value={e} className="bg-[var(--gear-ink)]">{e}</option>
          ))}
        </select>
      </div>

      {vista === "lista" ? (
        <ul className="mt-6 space-y-2">
          {filtradas.length === 0 && <li className="font-sans text-sm font-light text-muted-foreground">Nenhuma tarefa com esses filtros.</li>}
          {filtradas.map((t) => (
            <TarefaItem key={t.id} tarefa={t} quem={quem} mostrarProjeto aoMudar={reler} />
          ))}
        </ul>
      ) : (
        // no celular as colunas empilham; da tela média em diante, rolam de lado
        <div className="mt-6 grid gap-4 md:grid-flow-col md:auto-cols-[minmax(16rem,1fr)] md:overflow-x-auto md:pb-2">
          {ESTADOS_TAREFA.filter((e) => !estado || e === estado).map((e) => {
            const doEstado = filtradas.filter((t) => t.estado === e)
            return (
              <section key={e} aria-label={e}>
                <h2 className="mb-3 flex items-baseline justify-between border-b border-linha pb-2 font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {e} <span className="tabular-nums">{doEstado.length}</span>
                </h2>
                <ul className="space-y-2">
                  {doEstado.length === 0 && (
                    <li className="border border-dashed border-linha px-3 py-4 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60">Nenhuma</li>
                  )}
                  {doEstado.map((t) => (
                    <TarefaItem key={t.id} tarefa={t} quem={quem} mostrarProjeto aoMudar={reler} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
