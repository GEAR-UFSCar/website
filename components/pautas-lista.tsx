"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { TarefaItem } from "@/components/tarefa-item"
import { campoBase } from "@/lib/ui"
import type { QuemVe, Tarefa } from "@/lib/tarefas"

/** Pautas abertas (044): tarefas sem responsável, filtráveis por nível e área. */
export function PautasLista({ pautas, quem }: { pautas: Tarefa[]; quem: QuemVe }) {
  const router = useRouter()
  const [nivel, setNivel] = useState("")
  const [area, setArea] = useState("")
  const areas = [...new Set(pautas.map((p) => p.area).filter((a): a is string => Boolean(a)))].sort()
  const lista = pautas.filter((p) => (!nivel || p.nivel === nivel) && (!area || p.area === area))

  return (
    <>
      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        <label className="sr-only" htmlFor="p-nivel">Nível</label>
        <select id="p-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todos os níveis</option>
          {["Fundamental", "Principal", "Avançada"].map((n) => <option key={n} value={n} className="bg-[var(--gear-ink)]">{n}</option>)}
        </select>
        <label className="sr-only" htmlFor="p-area">Área</label>
        <select id="p-area" value={area} onChange={(e) => setArea(e.target.value)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todas as áreas</option>
          {areas.map((a) => <option key={a} value={a} className="bg-[var(--gear-ink)]">{a}</option>)}
        </select>
      </div>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {lista.length === 0 && (
          <li className="font-sans text-sm font-light text-muted-foreground">
            Nenhuma pauta aberta com esses filtros. Viu algo que precisa ser feito? Crie a tarefa em Projetos e tarefas, sem responsável.
          </li>
        )}
        {lista.map((t) => (
          <TarefaItem key={t.id} tarefa={t} quem={quem} mostrarProjeto aoMudar={() => router.refresh()} />
        ))}
      </ul>
    </>
  )
}
