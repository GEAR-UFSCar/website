"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { dataLonga } from "@/lib/datas"
import { mensagemSegura } from "@/lib/erros"

export type Pendente = {
  id: string
  nome_completo: string | null
  curso: string | null
  frente: string | null
  created_at: string
}

/** Dias inteiros desde o cadastro — a régua de "há quanto tempo espera". */
function diasDeEspera(iso: string) {
  const dia = 86_400_000
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / dia))
}

function esperaEmTexto(dias: number) {
  if (dias === 0) return "hoje"
  if (dias === 1) return "há 1 dia"
  return `há ${dias} dias`
}

/**
 * Fila de aprovação, separada da tabela geral de cargos.
 *
 * Antes, quem esperava aparecia misturado a todos os perfis, ordenado por
 * nome, com o botão de aprovar numa coluna no meio da linha. Numa entidade com
 * 40 membros, o pendente era achado por varredura visual — e quem se cadastrou
 * há três semanas parecia igual a quem se cadastrou ontem.
 *
 * A espera longa é destacada porque é o único dado aqui que piora sozinho: a
 * pessoa está do outro lado, sem acesso, sem saber se alguém viu.
 */
export function AprovacaoPendentes({ pendentes }: { pendentes: Pendente[] }) {
  const router = useRouter()
  const [marcados, setMarcados] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const alternar = (id: string) =>
    setMarcados((atual) => (atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]))

  const todosMarcados = pendentes.length > 0 && marcados.length === pendentes.length

  const aprovarMarcados = async () => {
    if (marcados.length === 0) return
    setErro(null)
    setSalvando(true)

    /*
     * Um PATCH com `in`, não um por linha: são N requisições contra uma, e o
     * banco aplica tudo na mesma transação. O trigger guardar_cargo() (014)
     * continua avaliando linha a linha — inclusive recusando a própria, que
     * por isso nunca entra nesta lista.
     */
    const supabase = createClient()
    const { data, error } = await supabase
      .from("perfis")
      .update({ aprovado: true })
      .in("id", marcados)
      .select("id")

    setSalvando(false)

    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return
    }
    if (data.length < marcados.length) {
      setErro(`${data.length} de ${marcados.length} aprovados. O restante foi recusado pelo banco.`)
    }

    setMarcados([])
    router.refresh()
  }

  if (pendentes.length === 0) {
    return (
      <div className="mt-12 border-t border-white/10 pt-8">
        <h2 className="font-sans text-2xl md:text-3xl font-light italic">Fila de aprovação</h2>
        <p className="mt-4 font-sans text-sm font-light text-muted-foreground">
          Ninguém esperando. Todo cadastro novo aparece aqui até ser aprovado.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-12 border-t border-[var(--gear-amber)] pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-sans text-2xl md:text-3xl font-light italic">Fila de aprovação</h2>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
          {pendentes.length} pessoa(s) sem acesso
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMarcados(todosMarcados ? [] : pendentes.map((p) => p.id))}
          disabled={salvando}
          data-cursor-hover
          className="inline-flex min-h-11 items-center border border-white/20 px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
        </button>

        <button
          type="button"
          onClick={aprovarMarcados}
          disabled={salvando || marcados.length === 0}
          data-cursor-hover
          className="inline-flex min-h-11 items-center border border-[var(--gear-amber)] bg-[var(--gear-amber)] px-5 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-ink)] transition-opacity duration-300 disabled:opacity-40"
        >
          {salvando ? "Aprovando…" : `Aprovar ${marcados.length || ""} selecionado(s)`}
        </button>
      </div>

      {erro && (
        <p role="alert" className="mt-4 font-mono text-[11px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}

      <ul className="mt-6">
        {pendentes.map((p) => {
          const dias = diasDeEspera(p.created_at)
          const marcado = marcados.includes(p.id)

          return (
            <li key={p.id} className="border-t border-white/10">
              <label
                className="flex cursor-pointer items-start gap-4 py-4"
                data-cursor-hover
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(p.id)}
                  disabled={salvando}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--gear-amber)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-base font-light break-words">
                    {p.nome_completo?.trim() || "sem nome preenchido"}
                  </p>
                  <p className="mt-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {p.curso?.trim() || "curso não informado"} · {p.frente ?? "frente a definir"} ·
                    cadastro em {dataLonga(p.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 border px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase ${
                    // Uma semana é o corte: a partir daí a demora é da diretoria,
                    // não do fluxo.
                    dias >= 7
                      ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                      : "border-white/20 text-muted-foreground"
                  }`}
                >
                  {esperaEmTexto(dias)}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
