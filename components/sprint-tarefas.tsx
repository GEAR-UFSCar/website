"use client"

import { useEffect, useState } from "react"

import { TarefaForm } from "@/components/tarefa-form"
import { TarefaItem } from "@/components/tarefa-item"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { COLUNAS_TAREFA, ESTADOS_TAREFA, type QuemVe, type Tarefa } from "@/lib/tarefas"

type Pessoa = { id: string; nome_completo: string | null }

/**
 * Tarefas do projeto (042). Busca as próprias tarefas no navegador em vez de
 * vir pelo quadro. ponytail: uma consulta por cartão aberto; se o quadro
 * passar de dezenas de projetos, trazer tudo junto em frente-painel.
 *
 * Quem participa do projeto (040) cria; o fluxo (enviar, revisar) segue
 * acoesDaTarefa(), espelho das funções do banco.
 */
export function SprintTarefas({
  sprintId,
  podeCriar,
  quem,
  pessoas,
}: {
  sprintId: string
  podeCriar: boolean
  quem: QuemVe
  pessoas: Pessoa[]
}) {
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // cada escrita incrementa `versao`, e o efeito relê a lista
  const [versao, setVersao] = useState(0)
  const reler = () => setVersao((v) => v + 1)

  useEffect(() => {
    let vivo = true
    createClient()
      .from("sprint_tarefas")
      .select(COLUNAS_TAREFA)
      .eq("sprint_id", sprintId)
      .order("prazo", { nullsFirst: false })
      .order("created_at")
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) setErro(mensagemSegura(error))
        const lista = (data ?? []) as unknown as Tarefa[]
        // na ordem do fluxo: o que precisa de alguém antes do que já acabou
        lista.sort((a, b) => ESTADOS_TAREFA.indexOf(a.estado) - ESTADOS_TAREFA.indexOf(b.estado))
        setTarefas(lista)
      })
    return () => {
      vivo = false
    }
  }, [sprintId, versao])

  if (tarefas === null) return null
  const concluidas = tarefas.filter((t) => t.estado === "Concluída").length

  return (
    <section className="mt-6 border-t border-linha pt-5">
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        Tarefas{tarefas.length > 0 && ` · ${concluidas}/${tarefas.length} concluídas`}
      </p>

      {tarefas.length === 0 && (
        <p className="mt-3 font-sans text-sm font-light text-muted-foreground">Nenhuma tarefa.</p>
      )}

      <ul className="mt-3 space-y-2">
        {tarefas.map((t) => (
          <TarefaItem key={t.id} tarefa={t} quem={quem} aoMudar={reler} />
        ))}
      </ul>

      {podeCriar && <TarefaForm sprintId={sprintId} pessoas={pessoas} aoCriar={reler} />}

      {erro && (
        <p role="alert" className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">{erro}</p>
      )}
    </section>
  )
}
