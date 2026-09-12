"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

type Props = {
  usuarioId: string
  moduloId: string
  concluido: boolean
  /** Todos os módulos anteriores do mesmo nível já foram concluídos. */
  liberado: boolean
}

export function ModuloCheckbox({ usuarioId, moduloId, concluido, liberado }: Props) {
  const router = useRouter()
  const [salvando, iniciarSalvamento] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  // Um módulo já concluído continua clicável, para poder desmarcar.
  const habilitado = concluido || liberado

  const alternar = async () => {
    setErro(null)
    const supabase = createClient()

    const { error } = await supabase.from("progresso").upsert(
      {
        usuario_id: usuarioId,
        modulo_id: moduloId,
        concluido_em: concluido ? null : new Date().toISOString(),
      },
      // a unicidade está em (usuario_id, modulo_id), não na primary key —
      // sem isto o upsert tentaria conflitar por `id` e inseriria duplicata
      { onConflict: "usuario_id,modulo_id" },
    )

    if (error) {
      setErro(error.message)
      return
    }

    // re-renderiza o Server Component: o que estava travado pode liberar
    iniciarSalvamento(() => router.refresh())
  }

  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={concluido}
        disabled={!habilitado || salvando}
        onClick={alternar}
        data-cursor-hover
        /*
         * A caixa continua com 24px na tela, mas a área clicável é de 44px:
         * o botão mede h-11 w-11 e a margem negativa devolve os 10px de cada
         * lado ao layout, então nada se desloca. Sem isso o alvo de toque era
         * de 24px, metade do mínimo recomendado.
         */
        className="flex h-11 w-11 -m-2.5 shrink-0 items-center justify-center"
        title={habilitado ? undefined : "Conclua o módulo anterior primeiro"}
      >
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 items-center justify-center border transition-colors duration-300 ${
            concluido
              ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
              : habilitado
                ? "border-white/30 hover:border-[var(--gear-amber)]"
                : "border-white/10 cursor-not-allowed"
          }`}
        >
        {concluido && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M3 8.5l3.5 3.5L13 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        )}
        </span>
      </button>

      {erro && (
        <p role="alert" className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
