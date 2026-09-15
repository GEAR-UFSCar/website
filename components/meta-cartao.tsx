"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { MetaForm } from "@/components/meta-form"
import { dataDoDia } from "@/lib/datas"
import { estaVencida, prazoRelativo, type Meta } from "@/lib/metas"
import { mensagemSegura } from "@/lib/erros"

type Props = {
  meta: Meta
  usuarioId: string
  /** Nome de quem criou. Só nas metas públicas dos outros. */
  autor?: string | null
  /**
   * Mostra concluir/editar/apagar. Falso na lista pública: a RLS de 017
   * recusaria a escrita de qualquer forma, e oferecer o botão para depois
   * mostrar "recusado" seria mentir sobre o que a pessoa pode fazer.
   */
  editavel: boolean
}

const etiqueta =
  "shrink-0 border px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase"

const acao =
  "inline-flex min-h-11 items-center border px-4 py-2.5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50"

export function MetaCartao({ meta, usuarioId, autor, editavel }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, iniciar] = useTransition()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const vencida = estaVencida(meta)
  const travado = ocupado || salvando

  /** Update e delete falham do mesmo jeito: sem erro e sem linha, quando a RLS nega. */
  const conferir = (data: unknown[] | null, error: { message: string } | null) => {
    if (error) {
      setErro(mensagemSegura(error))
      return false
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return false
    }
    return true
  }

  const alternarConcluida = async () => {
    setErro(null)
    setOcupado(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("metas")
      .update({ concluida: !meta.concluida })
      .eq("id", meta.id)
      .select("id")

    setOcupado(false)
    if (!conferir(data, error)) return
    iniciar(() => router.refresh())
  }

  const apagar = async () => {
    setErro(null)
    setOcupado(true)

    const supabase = createClient()
    const { data, error } = await supabase.from("metas").delete().eq("id", meta.id).select("id")

    setOcupado(false)
    if (!conferir(data, error)) return
    setConfirmando(false)
    iniciar(() => router.refresh())
  }

  return (
    <article
      /*
       * Vencida ganha a barra âmbar à esquerda, não o cartão inteiro colorido:
       * numa lista de dez metas atrasadas, o destaque por preenchimento vira
       * parede e deixa de destacar.
       */
      className={`border-t border-white/10 py-6 ${
        vencida ? "border-l-2 border-l-[var(--gear-amber)] pl-5" : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1">
          <h3
            className={`font-sans text-lg md:text-xl font-light leading-snug break-words ${
              meta.concluida ? "text-muted-foreground line-through" : ""
            }`}
          >
            {meta.titulo}
          </h3>

          <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {dataDoDia(meta.prazo)}
            {!meta.concluida && ` · ${prazoRelativo(meta.prazo)}`}
            {autor && ` · ${autor}`}
          </p>

          {meta.descricao && (
            <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground whitespace-pre-line">
              {meta.descricao}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {vencida && (
            <span className={`${etiqueta} border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]`}>
              Vencida
            </span>
          )}
          {meta.concluida && (
            <span className={`${etiqueta} border-white/20 text-muted-foreground`}>Concluída</span>
          )}
          {meta.frente_vinculada && (
            <span className={`${etiqueta} border-[var(--gear-amber)] text-[var(--gear-amber)]`}>
              {meta.frente_vinculada}
            </span>
          )}
          {/* A visibilidade só interessa a quem pode mudá-la. */}
          {editavel && (
            <span className={`${etiqueta} border-white/20 text-muted-foreground`}>
              {meta.visibilidade}
            </span>
          )}
        </div>
      </div>

      {editavel && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={alternarConcluida}
            disabled={travado}
            aria-pressed={meta.concluida}
            data-cursor-hover
            className={`${acao} ${
              meta.concluida
                ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {meta.concluida ? "Reabrir" : "Concluir"}
          </button>

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
            className={`${acao} border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground`}
          >
            {editando ? "Fechar" : "Editar"}
          </button>

          {/*
            Dois cliques em vez de window.confirm: o diálogo do navegador não
            aceita a tipografia do projeto e, em celular, cobre a tela inteira
            para uma pergunta de uma linha.
          */}
          {confirmando ? (
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
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={travado}
                data-cursor-hover
                className={`${acao} border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground`}
              >
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
              className={`${acao} border-white/20 text-muted-foreground hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]`}
            >
              Apagar
            </button>
          )}
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-3 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}

      {editando && (
        <MetaForm usuarioId={usuarioId} meta={meta} aoEncerrar={() => setEditando(false)} />
      )}
    </article>
  )
}
