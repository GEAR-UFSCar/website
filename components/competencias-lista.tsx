"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Pilula } from "@/components/membros/pilula"
import { AREAS_COMPETENCIA, formatarDuracao, NIVEIS_ACADEMIA, type Comprovacao, type EstadoComprovacao, type Modulo } from "@/lib/academia"
import { campoBase } from "@/lib/ui"

const TOM: Record<EstadoComprovacao, "neutro" | "ativo" | "alerta"> = {
  Enviada: "ativo",
  "Em revisão": "ativo",
  Ajustes: "alerta",
  Aprovada: "neutro",
}

type Props = {
  competencias: Modulo[]
  minhas: Comprovacao[]
  /** 047: lições feitas/total e minutos somados, por competência. */
  progresso: Record<string, { feitas: number; total: number; minutos: number }>
}

const opcao = "bg-[var(--gear-ink)]"

/**
 * Catálogo da Academia: cada cartão é a porta da competência. Critério,
 * material, lições e comprovação moram na página dela; aqui só o que ajuda a
 * escolher (área, nível, pontos, duração, quanto já fiz).
 * Módulos legados (sem código, de antes da 043) ficam fora, menos os que a
 * pessoa já comprovou, até ela pedir para ver.
 */
export function CompetenciasLista({ competencias, minhas, progresso }: Props) {
  const [area, setArea] = useState("")
  const [nivel, setNivel] = useState("")
  const [situacao, setSituacao] = useState<"" | "aprovadas" | "pendentes" | "andamento">("")
  const [legado, setLegado] = useState(false)
  const minha = useMemo(() => new Map(minhas.map((c) => [c.modulo_id, c])), [minhas])
  const titulos = useMemo(() => new Map(competencias.map((m) => [m.id, m.codigo ?? m.titulo])), [competencias])
  const legados = competencias.filter((m) => !m.codigo && !minha.get(m.id)?.estado).length

  const lista = competencias.filter((m) => {
    const estado = minha.get(m.id)?.estado
    const p = progresso[m.id]
    const andamento = (p?.feitas ?? 0) > 0 || (estado != null && estado !== "Aprovada")
    return (legado || m.codigo || estado) && (!area || m.area === area) && (!nivel || m.nivel === nivel) &&
      (!situacao || (situacao === "aprovadas" ? estado === "Aprovada" : situacao === "andamento" ? andamento && estado !== "Aprovada" : estado !== "Aprovada"))
  })

  return (
    <>
      <div className="mt-8 grid gap-2 sm:grid-cols-3">
        <label className="sr-only" htmlFor="f-area">Área</label>
        <select id="f-area" value={area} onChange={(e) => setArea(e.target.value)} className={campoBase}>
          <option value="" className={opcao}>Todas as áreas</option>
          {AREAS_COMPETENCIA.map((a) => <option key={a} value={a} className={opcao}>{a}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-nivel">Nível</label>
        <select id="f-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} className={campoBase}>
          <option value="" className={opcao}>Todos os níveis</option>
          {NIVEIS_ACADEMIA.map((n) => <option key={n} value={n} className={opcao}>{n}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-situacao">Situação</label>
        <select id="f-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)} className={campoBase}>
          <option value="" className={opcao}>Todas</option>
          <option value="andamento" className={opcao}>Em andamento</option>
          <option value="pendentes" className={opcao}>Ainda não comprovadas</option>
          <option value="aprovadas" className={opcao}>Comprovadas</option>
        </select>
      </div>

      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.length === 0 && <li className="font-sans text-sm font-light text-muted-foreground">Nenhuma competência com esses filtros.</li>}
        {lista.map((m) => {
          const estado = minha.get(m.id)?.estado
          const p = progresso[m.id]
          const pct = p?.total ? Math.round((p.feitas / p.total) * 100) : 0
          const duracao = formatarDuracao(p?.minutos || m.duracao_estimada)
          return (
            <li key={m.id}>
              <Link
                href={`/membros/aprendizagem/${m.id}`}
                className="group flex h-full flex-col border border-linha bg-[var(--gear-navy)] p-4 transition-colors hover:border-[var(--gear-amber)] focus-visible:border-[var(--gear-amber)]"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] tracking-[0.15em] text-[var(--gear-amber)]">
                    {m.codigo ?? "LEGADO"} · {m.pontos} pts
                  </span>
                  {estado && <Pilula tom={TOM[estado]}>{estado}</Pilula>}
                </span>
                <span className="mt-2 font-sans text-base group-hover:text-[var(--gear-amber)]">{m.titulo}</span>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {[m.area, m.nivel, duracao].filter(Boolean).join(" · ")}
                </span>
                {m.requisito_id && titulos.get(m.requisito_id) && (
                  <span className="mt-2 font-sans text-xs font-light text-muted-foreground">Recomendado antes: {titulos.get(m.requisito_id)}</span>
                )}
                <span className="mt-auto pt-4">
                  {p?.total ? (
                    <>
                      <span className="block h-1 bg-linha" aria-hidden>
                        <span className="block h-1 bg-[var(--gear-amber)]" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {p.feitas}/{p.total} lições
                      </span>
                    </>
                  ) : (
                    <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sem lições ainda</span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {legados > 0 && (
        <button type="button" onClick={() => setLegado((v) => !v)} className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground underline underline-offset-4 hover:text-foreground">
          {legado ? "Esconder módulos legados" : `Mostrar ${legados} módulo(s) legado(s), de antes das competências`}
        </button>
      )}
    </>
  )
}
