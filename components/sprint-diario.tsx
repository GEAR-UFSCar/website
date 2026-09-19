"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { iniciais } from "@/lib/administracao"
import { dataHora } from "@/lib/datas"
import { MAX_ATUALIZACAO, type Atualizacao } from "@/lib/sprints"
import { campoBase, botaoDesabilitavel } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

type Props = {
  sprintId: string
  atualizacoes: Atualizacao[]
  /** Espelha pode_editar_sprint() (021): sem isto, só a leitura aparece. */
  podeEscrever: boolean
}

/**
 * Diário de atividade de um sprint: o histórico e, para quem pode escrever
 * naquela frente, o campo para acrescentar.
 *
 * O diário é append-only no banco (021, sem policy de UPDATE nem DELETE), e a
 * tela não finge o contrário — não há botão de editar nem de apagar, porque
 * nenhum dos dois funcionaria.
 */
export function SprintDiario({ sprintId, atualizacoes, podeEscrever }: Props) {
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const limpo = texto.trim()
    if (!limpo) return

    setErro(null)
    setSalvando(true)

    const supabase = createClient()
    /*
     * `autor_id` não é mandado: o trigger da 021 o sobrescreve com auth.uid()
     * de qualquer jeito, e omitir deixa claro na chamada que a assinatura não
     * é escolha do cliente.
     *
     * `.select("id")` para distinguir "nada aconteceu" de "a RLS recusou" —
     * um insert barrado por policy volta com 42501, mas a checagem de linha
     * cobre o caso de a policy existir e o predicado dar falso.
     */
    const { data, error } = await supabase
      .from("sprint_atualizacoes")
      .insert({ sprint_id: sprintId, texto: limpo })
      .select("id")

    if (error) {
      setErro(mensagemSegura(error))
      setSalvando(false)
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha gravada — a política de acesso recusou a atualização.")
      setSalvando(false)
      return
    }

    setTexto("")
    setSalvando(false)
    router.refresh()
  }

  return (
    <section className="mt-6 border-t border-white/10 pt-5">
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        Diário de atividade
        {atualizacoes.length > 0 && ` · ${atualizacoes.length}`}
      </p>

      {atualizacoes.length === 0 ? (
        <p className="mt-4 font-sans text-sm font-light text-muted-foreground">
          Nenhuma atualização registrada.
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {atualizacoes.map((item) => (
            <li key={item.id} className="flex gap-3">
              {/* Avatar pequeno: a coluna de iniciais dá a linha do tempo uma âncora visual. */}
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 font-mono text-[10px] text-muted-foreground"
              >
                {iniciais(item.autor?.nome_completo)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                  {/* autor null = a pessoa saiu da entidade; o registro fica (021) */}
                  {item.autor?.nome_completo?.trim() || "Autor removido"} · {dataHora(item.created_at)}
                </p>
                <p className="mt-1 max-w-[70ch] font-sans text-sm font-light leading-relaxed whitespace-pre-line break-words">
                  {item.texto}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {podeEscrever && (
        <form onSubmit={enviar} className="mt-5">
          <label htmlFor={`atualizacao-${sprintId}`} className="sr-only">
            Nova atualização do diário
          </label>
          <textarea
            id={`atualizacao-${sprintId}`}
            rows={2}
            maxLength={MAX_ATUALIZACAO}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={salvando}
            placeholder="O que andou hoje?"
            className={`${campoBase} resize-y placeholder:text-muted-foreground/50`}
          />

          {erro && (
            <p role="alert" className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
              {erro}
            </p>
          )}

          <button
            type="submit"
            // texto em branco não vira registro, e o botão diz isso antes do clique
            disabled={salvando || !texto.trim()}
            data-cursor-hover
            className={`mt-3 min-h-11 border border-[var(--gear-amber)] bg-transparent px-6 py-2.5 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] ${botaoDesabilitavel}`}
          >
            {salvando ? "Registrando…" : "Registrar atualização"}
          </button>
        </form>
      )}
    </section>
  )
}
