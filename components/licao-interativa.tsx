"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { acaoAmbar, acaoDiscreta } from "@/components/tarefa-item"
import type { Questao } from "@/lib/academia"
import { mensagemSegura } from "@/lib/erros"
import { createClient } from "@/lib/supabase/client"

type Props = { licaoId: string; feita: boolean; proximaHref: string | null }

/** Marca a lição como feita e segue para a próxima (ou desmarca). */
function useConcluir({ licaoId, proximaHref }: Omit<Props, "feita">) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const concluir = async () => {
    setErro(null)
    const { error } = await createClient().from("licoes_feitas").insert({ licao_id: licaoId })
    // 23505 = já estava feita (outra aba): segue igual
    if (error && error.code !== "23505") return setErro(mensagemSegura(error))
    iniciar(() => {
      if (proximaHref) router.push(proximaHref)
      router.refresh()
    })
  }
  const desmarcar = async () => {
    setErro(null)
    const { error } = await createClient().from("licoes_feitas").delete().eq("licao_id", licaoId)
    if (error) return setErro(mensagemSegura(error))
    iniciar(() => router.refresh())
  }
  return { concluir, desmarcar, pendente, erro }
}

export function ConcluirLicao(props: Props) {
  const { concluir, desmarcar, pendente, erro } = useConcluir(props)
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {props.feita ? (
        <>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gear-amber)]">✓ Lição feita</span>
          {props.proximaHref && <a href={props.proximaHref} className={acaoAmbar}>Próxima lição →</a>}
          <button type="button" onClick={desmarcar} disabled={pendente} className={acaoDiscreta}>Desmarcar</button>
        </>
      ) : (
        <button type="button" onClick={concluir} disabled={pendente} className={acaoAmbar}>
          {props.proximaHref ? "Concluir e seguir →" : "Concluir lição"}
        </button>
      )}
      {erro && <p role="alert" className="font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}

/**
 * Quiz com resposta na hora (Khan Academy, Duolingo): escolhe, confere, vê a
 * explicação e tenta de novo até acertar. Acertou tudo → libera concluir.
 * É treino: o gabarito vem junto da lição e nada disso dá ponto.
 */
export function QuizLicao({ questoes, ...props }: Props & { questoes: Questao[] }) {
  const [escolha, setEscolha] = useState<(number | null)[]>(() => questoes.map(() => null))
  const [conferida, setConferida] = useState<boolean[]>(() => questoes.map(() => false))
  const certas = questoes.filter((q, i) => conferida[i] && escolha[i] === q.correta).length

  return (
    <div className="mt-6 space-y-6">
      {questoes.map((q, i) => {
        const acertou = conferida[i] && escolha[i] === q.correta
        return (
          <fieldset key={i} className="border border-linha bg-[var(--gear-navy)] p-4">
            <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Questão {i + 1}</legend>
            <p className="font-sans text-base">{q.pergunta}</p>
            <div className="mt-3 grid gap-2">
              {q.opcoes.map((o, j) => (
                <label key={j} className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 font-sans text-sm font-light ${
                  conferida[i] && j === escolha[i] ? (acertou ? "border-[var(--gear-amber)]" : "border-linha-forte opacity-60") : "border-linha"}`}>
                  <input type="radio" name={`q-${props.licaoId}-${i}`} checked={escolha[i] === j} disabled={acertou}
                    onChange={() => { setEscolha((a) => a.map((v, k) => (k === i ? j : v))); setConferida((a) => a.map((v, k) => (k === i ? false : v))) }} />
                  {o}
                </label>
              ))}
            </div>
            {!acertou && (
              <button type="button" disabled={escolha[i] === null} onClick={() => setConferida((a) => a.map((v, k) => (k === i ? true : v)))} className={`${acaoDiscreta} mt-3`}>
                Conferir
              </button>
            )}
            {conferida[i] && (
              <p role="status" className="mt-3 border-l-2 border-[var(--gear-amber)] pl-3 font-sans text-sm font-light">
                {acertou ? "Certo." : "Ainda não. Tente outra opção."}
                {acertou && q.explicacao ? ` ${q.explicacao}` : ""}
              </p>
            )}
          </fieldset>
        )
      })}
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{certas}/{questoes.length} certas</p>
      {(props.feita || certas === questoes.length) && <ConcluirLicao {...props} />}
    </div>
  )
}
