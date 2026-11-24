"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Pilula } from "@/components/membros/pilula"
import { RegistroEditavel } from "@/components/membros/registro-editavel"
import { ModuloForm } from "@/components/modulo-form"
import { acaoAmbar, acaoDiscreta } from "@/components/tarefa-item"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase } from "@/lib/ui"
import {
  AREAS_COMPETENCIA,
  NIVEIS_ACADEMIA,
  podeEnviarComprovacao,
  type Comprovacao,
  type EstadoComprovacao,
  type Modulo,
} from "@/lib/academia"

const TOM: Record<EstadoComprovacao, "neutro" | "ativo" | "alerta"> = {
  Enviada: "ativo",
  "Em revisão": "ativo",
  Ajustes: "alerta",
  Aprovada: "neutro",
}

type Props = {
  competencias: Modulo[]
  minhas: Comprovacao[]
  guias: { id: string; titulo: string }[]
  gerencia: boolean
  apaga: boolean
}

/** Competências filtráveis por área e nível, com o estado da comprovação de quem vê (043). */
export function CompetenciasLista({ competencias, minhas, guias, gerencia, apaga }: Props) {
  const [area, setArea] = useState("")
  const [nivel, setNivel] = useState("")
  const [situacao, setSituacao] = useState<"" | "aprovadas" | "pendentes">("")
  const minha = useMemo(() => new Map(minhas.map((c) => [c.modulo_id, c])), [minhas])
  const titulos = useMemo(() => new Map(guias.map((g) => [g.id, g.titulo])), [guias])

  const lista = competencias.filter((m) => {
    const aprovada = minha.get(m.id)?.estado === "Aprovada"
    return (!area || m.area === area) && (!nivel || m.nivel === nivel) &&
      (!situacao || (situacao === "aprovadas" ? aprovada : !aprovada))
  })

  return (
    <>
      <div className="mt-8 grid gap-2 sm:grid-cols-3">
        <label className="sr-only" htmlFor="f-area">Área</label>
        <select id="f-area" value={area} onChange={(e) => setArea(e.target.value)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todas as áreas</option>
          {AREAS_COMPETENCIA.map((a) => <option key={a} value={a} className="bg-[var(--gear-ink)]">{a}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-nivel">Nível</label>
        <select id="f-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todos os níveis</option>
          {NIVEIS_ACADEMIA.map((n) => <option key={n} value={n} className="bg-[var(--gear-ink)]">{n}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-situacao">Situação</label>
        <select id="f-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Comprovadas e pendentes</option>
          <option value="aprovadas" className="bg-[var(--gear-ink)]">Só as que comprovei</option>
          <option value="pendentes" className="bg-[var(--gear-ink)]">Só as que faltam</option>
        </select>
      </div>

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {lista.length === 0 && <li className="font-sans text-sm font-light text-muted-foreground">Nenhuma competência com esses filtros.</li>}
        {lista.map((m) => (
          <li key={m.id} className="border border-linha bg-[var(--gear-navy)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-mono text-[11px] tracking-[0.15em] text-[var(--gear-amber)]">
                {m.codigo ?? "LEGADO"} · {m.pontos} pts
              </p>
              {minha.get(m.id)?.estado && <Pilula tom={TOM[minha.get(m.id)!.estado!]}>{minha.get(m.id)!.estado}</Pilula>}
            </div>
            <h3 className="mt-2 font-sans text-base">{m.titulo}</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {[m.area, m.nivel].filter(Boolean).join(" · ")}
            </p>
            {m.criterio_aceite && (
              <p className="mt-3 font-sans text-xs font-light text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em]">Aceite quando · </span>
                {m.criterio_aceite}
              </p>
            )}
            {m.guia_id && (
              <a href={`/membros/conhecimento/${m.guia_id}`} className="mt-2 inline-block font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
                Guia: {titulos.get(m.guia_id) ?? "abrir"} →
              </a>
            )}
            {m.conteudo_url && (
              <a href={m.conteudo_url} target="_blank" rel="noopener noreferrer" className="ml-3 mt-2 inline-block font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
                Material ↗
              </a>
            )}
            <Comprovar competencia={m} atual={minha.get(m.id)} />
            {gerencia && (
              <RegistroEditavel tabela="modulos" id={m.id} apagavel={apaga} formulario={<ModuloForm modulo={m} guias={guias} />} />
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

function Comprovar({ competencia, atual }: { competencia: Modulo; atual?: Comprovacao }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [link, setLink] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async () => {
    setErro(null)
    setOcupado(true)
    const { error } = await createClient().rpc("enviar_comprovacao", { competencia: competencia.id, evidencia: link })
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    setAberto(false)
    setLink("")
    router.refresh()
  }

  return (
    <div className="mt-3">
      {atual?.comentario && atual.estado === "Ajustes" && (
        <p className="mb-2 border-l-2 border-[var(--gear-amber)] pl-2 font-sans text-xs font-light">Revisor: {atual.comentario}</p>
      )}
      {atual?.evidencia_url && (
        <a href={atual.evidencia_url} target="_blank" rel="noopener noreferrer" className="mb-2 block break-all font-mono text-[11px] text-muted-foreground underline underline-offset-4">
          Sua evidência ↗
        </a>
      )}
      {podeEnviarComprovacao(atual?.estado) && !aberto && (
        <button type="button" onClick={() => setAberto(true)} className={acaoAmbar}>
          {atual?.estado ? "Reenviar comprovação" : "Enviar comprovação"}
        </button>
      )}
      {aberto && (
        <form onSubmit={(e) => { e.preventDefault(); void enviar() }} className="grid gap-2">
          <label htmlFor={`ev-${competencia.id}`} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Link da evidência (repositório, vídeo ou relatório)
          </label>
          <input id={`ev-${competencia.id}`} type="url" required maxLength={2000} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} className={campoBase} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || !link.trim()} className={acaoAmbar}>Enviar</button>
            <button type="button" onClick={() => setAberto(false)} className={acaoDiscreta}>Cancelar</button>
          </div>
        </form>
      )}
      {erro && <p role="alert" className="mt-2 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
