"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"

const botaoBase =
  "inline-flex min-h-11 items-center border px-4 py-2.5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"

/**
 * Aprova ou revoga um membro. Só renderizado para a diretoria — e o trigger
 * guardar_cargo() (014, 024) é quem barra de fato, inclusive a tentativa de
 * alguém mexer na própria aprovação ou de tirar o último da diretoria.
 *
 * APROVAR é um clique; REVOGAR pede confirmação. Antes os dois eram o mesmo
 * botão alternando, e um clique sem querer em "Aprovado" cortava o acesso da
 * pessoa na hora — sem aviso para quem clicou nem para quem perdeu o acesso.
 */
export function AprovacaoToggle({
  perfilId,
  aprovado,
  ehVoce,
  nome,
}: {
  perfilId: string
  aprovado: boolean
  /** Ninguém altera a própria aprovação; o banco recusa e o botão nem aparece. */
  ehVoce: boolean
  /** Para a pergunta de confirmação dizer DE QUEM é o acesso. */
  nome?: string | null
}) {
  const router = useRouter()
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  if (ehVoce) {
    return (
      <span className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
        {aprovado ? "Aprovado" : "Pendente"} · você
      </span>
    )
  }

  const gravar = async (novo: boolean) => {
    setErro(null)
    setConfirmando(false)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("perfis")
      .update({ aprovado: novo })
      .eq("id", perfilId)
      .select("id")

    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    // update sem erro e sem linha afetada = a política de acesso recusou
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return
    }

    iniciar(() => router.refresh())
  }

  if (confirmando) {
    return (
      <div role="group" aria-label="Confirmar revogação" className="flex max-w-[20rem] flex-col gap-2">
        <p className="font-mono text-[10px] md:text-[9px] leading-snug tracking-[0.1em] text-foreground">
          Revogar o acesso{nome ? ` de ${nome.split(" ")[0]}` : ""}? A pessoa deixa de ver a área de
          membros na hora.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => gravar(false)}
            disabled={salvando}
            data-cursor-hover
            className={`${botaoBase} border-[var(--gear-amber)] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]`}
          >
            Sim, revogar
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={salvando}
            data-cursor-hover
            autoFocus
            className={`${botaoBase} border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground`}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => (aprovado ? setConfirmando(true) : gravar(true))}
        disabled={salvando}
        aria-pressed={aprovado}
        title={aprovado ? "Clique para revogar o acesso" : undefined}
        data-cursor-hover
        className={`${botaoBase} ${
          aprovado
            ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
            : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        {aprovado ? "Aprovado" : "Aprovar"}
      </button>

      {erro && (
        <p
          role="alert"
          className="mt-1 max-w-[18rem] font-mono text-[10px] md:text-[9px] leading-snug text-[var(--gear-amber)]"
        >
          {erro}
        </p>
      )}
    </div>
  )
}
