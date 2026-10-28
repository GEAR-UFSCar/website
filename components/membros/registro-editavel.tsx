"use client"

import { createContext, useContext, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"

/** Formulário em modo edição chama isto depois de salvar, para se fechar. */
const EncerrarEdicao = createContext<(() => void) | null>(null)
export const useEncerrarEdicao = () => useContext(EncerrarEdicao)

type Props = {
  tabela: "avisos" | "eventos" | "sprints" | "atas" | "documentos"
  id: string
  /** Formulário já preenchido com o registro, montado só ao clicar em Editar. */
  formulario: ReactNode
  /**
   * Atas e documentos não têm policy de DELETE: são registro oficial, e o
   * caminho é corrigir, não sumir. Sem o botão, a tela não promete o que o
   * banco vai recusar.
   */
  apagavel?: boolean
  className?: string
}

const acao =
  "inline-flex min-h-11 items-center border px-4 py-2.5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"
const neutra = "border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground"

/**
 * Editar e apagar para qualquer registro da área de membros. O mesmo desenho
 * de meta-cartao.tsx (dois cliques para apagar, em vez de window.confirm),
 * num componente só, para os cinco tipos não divergirem.
 */
export function RegistroEditavel({ tabela, id, formulario, apagavel = true, className = "mt-4" }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [atualizando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const travado = ocupado || atualizando

  const apagar = async () => {
    setErro(null)
    setOcupado(true)
    const { data, error } = await createClient().from(tabela).delete().eq("id", id).select("id")
    setOcupado(false)

    if (error) return setErro(mensagemSegura(error))
    // delete sem erro e sem linha = a RLS recusou
    if (!data || data.length === 0) return setErro("Nada foi apagado, a política de acesso recusou.")
    setConfirmando(false)
    iniciar(() => router.refresh())
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setEditando((a) => !a)
            setConfirmando(false)
            setErro(null)
          }}
          disabled={travado}
          aria-expanded={editando}
          data-cursor-hover
          className={`${acao} ${neutra}`}
        >
          {editando ? "Fechar" : "Editar"}
        </button>

        {apagavel &&
          (confirmando ? (
            <>
              <button
                type="button"
                onClick={apagar}
                disabled={travado}
                data-cursor-hover
                className={`${acao} border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]`}
              >
                Apagar mesmo
              </button>
              <button type="button" onClick={() => setConfirmando(false)} disabled={travado} data-cursor-hover className={`${acao} ${neutra}`}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmando(true)
                setErro(null)
              }}
              disabled={travado}
              data-cursor-hover
              className={`${acao} border-linha-forte text-muted-foreground hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]`}
            >
              Apagar
            </button>
          ))}
      </div>

      {erro && (
        <p role="alert" className="mt-3 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}

      {editando && (
        <EncerrarEdicao.Provider value={() => setEditando(false)}>
          <div className="mt-5">{formulario}</div>
        </EncerrarEdicao.Provider>
      )}
    </div>
  )
}
