"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { ROTULO_STATUS, type Status } from "@/lib/documentos-catalogo"
import { selectInline } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

type Props = {
  documentoId: string
  status: Status
  publico: boolean
  /** Sem arquivo, "vigente" é um selo sem documento por trás; o aviso é só aviso. */
  temArquivo: boolean
}

/**
 * Status e visibilidade pública de um documento. Só renderizado para a
 * diretoria — mas quem barra de verdade é o gatilho `guardar_publicacao_documento`
 * (supabase/025): chamar o endpoint direto com outro cargo recebe erro.
 */
export function DocumentoPublicacao({ documentoId, status, publico, temArquivo }: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const gravar = async (campos: { status?: Status; publico?: boolean }) => {
    setErro(null)
    setSalvando(true)
    const { data, error } = await createClient()
      .from("documentos")
      .update(campos)
      .eq("id", documentoId)
      .select("id")
    setSalvando(false)

    if (error) return setErro(mensagemSegura(error))
    if (!data || data.length === 0) return setErro("Nenhuma linha alterada: a política de acesso recusou.")
    router.refresh()
  }

  return (
    <div className="w-full border-t border-linha pt-4">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
        Publicação (diretoria)
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <label className="sr-only" htmlFor={`status-${documentoId}`}>
          Status do documento
        </label>
        <select
          id={`status-${documentoId}`}
          value={status}
          disabled={salvando}
          onChange={(e) => gravar({ status: e.target.value as Status })}
          className={`${selectInline} !w-auto`}
        >
          {(Object.keys(ROTULO_STATUS) as Status[]).map((s) => (
            <option key={s} value={s} className="bg-[var(--gear-ink)]">
              {ROTULO_STATUS[s]}
            </option>
          ))}
        </select>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          <input
            type="checkbox"
            checked={publico}
            disabled={salvando}
            onChange={(e) => gravar({ publico: e.target.checked })}
            className="h-4 w-4 accent-[var(--gear-amber)]"
          />
          Mostrar no site público
        </label>
      </div>

      {status === "vigente" && publico && !temArquivo && (
        <p className="mt-2 font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          VIGENTE E PÚBLICO, MAS SEM ARQUIVO: O VISITANTE VÊ O TÍTULO E NENHUM LINK. ANEXE O PDF.
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-2 max-w-[28rem] font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
