"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { FRENTES } from "@/lib/administracao"
import { mensagemSegura } from "@/lib/erros"
import { selectInline } from "@/lib/ui"

/**
 * Trilha do membro, definida pela Presidência na mesma tela em que aprova.
 * Sem trilha a pessoa não escreve em quadro nenhum (038), e quem tem cargo não
 * troca a própria (023): este select é o caminho.
 */
export function FrenteSelect({ perfilId, valor, nome }: { perfilId: string; valor: string | null; nome?: string | null }) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const mudar = async (nova: string) => {
    setErro(null)
    const { data, error } = await createClient()
      .from("perfis")
      .update({ frente: nova === "" ? null : nova })
      .eq("id", perfilId)
      .select("id")
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nenhuma linha alterada: a política de acesso recusou.")
    iniciar(() => router.refresh())
  }

  // valor fora da lista (texto antigo) aparece como está, em vez de sumir
  const atual = valor?.trim() ?? ""
  const opcoes = atual && !(FRENTES as readonly string[]).includes(atual) ? [atual, ...FRENTES] : [...FRENTES]

  return (
    <div>
      <select value={atual} disabled={salvando} onChange={(e) => mudar(e.target.value)} aria-label={`Trilha de ${nome ?? "membro"}`} className={selectInline}>
        <option value="" className="bg-[var(--gear-ink)]">Sem trilha</option>
        {opcoes.map((f) => <option key={f} value={f} className="bg-[var(--gear-ink)]">{f}</option>)}
      </select>
      {erro && <p role="alert" className="mt-1 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </div>
  )
}
