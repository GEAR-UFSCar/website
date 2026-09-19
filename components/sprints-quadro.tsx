"use client"

import { useMemo, useState } from "react"

import { SprintCartao } from "@/components/sprint-cartao"
import { campoBase } from "@/lib/ui"
import type { StatusSprint } from "@/lib/administracao"
import { FILTROS_STATUS, corresponde, type Atualizacao, type Sprint } from "@/lib/sprints"

type Props = {
  sprints: Sprint[]
  /** Diário já agrupado por sprint no servidor — o cartão só consome. */
  atualizacoes: Record<string, Atualizacao[]>
  podeEscrever: boolean
  usuarioId: string
}

/**
 * Busca e filtros sobre os sprints da frente, e os cartões que sobrarem.
 *
 * FILTRA NO NAVEGADOR, de propósito. Uma frente tem dezenas de sprints, não
 * milhares: a consulta já trouxe todos, e refazer a ida ao Supabase a cada
 * tecla digitada custaria latência para reencontrar linhas que já estão na
 * memória. Se um dia uma frente passar de algumas centenas, o lugar de mudar
 * é aqui — vira `.ilike()` no servidor e paginação.
 *
 * As contagens dos chips seguem a BUSCA, não o total: com "mecanum" digitado,
 * "Concluído · 0" é a resposta certa, e um "Concluído · 7" que não leva a nada
 * seria só um chip mentindo.
 */
export function SprintsQuadro({ sprints, atualizacoes, podeEscrever, usuarioId }: Props) {
  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState<StatusSprint | null>(null)

  const porBusca = useMemo(() => sprints.filter((s) => corresponde(s, busca)), [sprints, busca])

  const contagens = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const sprint of porBusca) {
      mapa.set(sprint.status, (mapa.get(sprint.status) ?? 0) + 1)
    }
    return mapa
  }, [porBusca])

  const visiveis = status ? porBusca.filter((s) => s.status === status) : porBusca

  return (
    <>
      <div className="mt-10">
        <label htmlFor="busca-sprints" className="sr-only">
          Buscar sprint por título ou responsável
        </label>
        <input
          id="busca-sprints"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título ou responsável…"
          className={`${campoBase} min-h-11 placeholder:text-muted-foreground/50`}
        />

        {/*
          Os chips são <button>, não links: o estado não é uma rota. Filtrar
          não é navegar, e pôr isto na URL encheria o histórico do navegador de
          passos que ninguém quer desfazer um a um.
        */}
        <div role="group" aria-label="Filtrar por status" className="mt-4 flex flex-wrap gap-2">
          {FILTROS_STATUS.map((filtro) => {
            const ativo = filtro.valor === status
            const quantos = filtro.valor === null ? porBusca.length : (contagens.get(filtro.valor) ?? 0)

            return (
              <button
                key={filtro.rotulo}
                type="button"
                onClick={() => setStatus(filtro.valor)}
                aria-pressed={ativo}
                data-cursor-hover
                className={`min-h-11 border px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                  ativo
                    ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                    : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {filtro.rotulo}
                <span className="ml-2 tabular-nums opacity-70">{quantos}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/*
        aria-live: o filtro muda a lista sem recarregar a página, e sem isto
        quem usa leitor de tela clica num chip e não recebe notícia nenhuma.
      */}
      <p aria-live="polite" className="mt-6 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {visiveis.length} SPRINT(S)
        {status ? ` · ${status.toUpperCase()}` : ""}
      </p>

      {visiveis.length === 0 ? (
        <p className="mt-8 max-w-2xl font-sans text-sm font-light text-muted-foreground">
          {sprints.length === 0
            ? "Nenhum sprint registrado nesta frente ainda."
            : "Nenhum sprint corresponde à busca e ao filtro escolhidos."}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {visiveis.map((sprint) => (
            <SprintCartao
              key={sprint.id}
              sprint={sprint}
              atualizacoes={atualizacoes[sprint.id] ?? []}
              podeEscrever={podeEscrever}
              usuarioId={usuarioId}
            />
          ))}
        </div>
      )}
    </>
  )
}
