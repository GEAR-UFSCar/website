"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { TIPOS_ACEITOS, enviarArquivo, validarArquivo } from "@/lib/documentos"
import { mensagemSegura } from "@/lib/erros"

type Props = {
  documentoId: string
  titulo: string
  /** Já existe arquivo? Muda o verbo do botão, e só isso. */
  temArquivo: boolean
}

/**
 * Anexa ou substitui o arquivo de um documento já cadastrado.
 *
 * Dois passos, nesta ordem: sobe ao bucket, depois grava o caminho na linha.
 * Invertido, uma falha no upload deixaria `arquivo_url` apontando para um
 * objeto inexistente — e a página mostraria "abrir documento" num link morto.
 * Falhando na ordem certa, o pior caso é um objeto órfão no bucket, que não
 * quebra tela nenhuma.
 */
export function DocumentoAnexo({ documentoId, titulo, temArquivo }: Props) {
  const router = useRouter()
  const campo = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const aoEscolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setErro(null)

    const recusa = validarArquivo(arquivo)
    if (recusa) {
      setErro(recusa)
      return
    }

    setEnviando(true)
    const supabase = createClient()

    const { caminho, erro: erroUpload } = await enviarArquivo(supabase, arquivo, titulo)
    if (erroUpload || !caminho) {
      setErro(mensagemSegura(erroUpload))
      setEnviando(false)
      return
    }

    const { data, error } = await supabase
      .from("documentos")
      .update({ arquivo_url: caminho })
      .eq("id", documentoId)
      .select("id")

    setEnviando(false)
    // o campo precisa ser limpo, senão escolher o MESMO arquivo de novo não
    // dispara onChange e a tela parece travada
    if (campo.current) campo.current.value = ""

    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return
    }

    router.refresh()
  }

  return (
    <div className="shrink-0">
      <label
        data-cursor-hover
        className={`inline-flex min-h-11 cursor-pointer items-center border px-4 py-2.5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 ${
          enviando
            ? "border-white/10 text-muted-foreground"
            : "border-white/20 text-muted-foreground hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]"
        }`}
      >
        {enviando ? "Enviando…" : temArquivo ? "Substituir arquivo" : "Anexar arquivo"}
        <input
          ref={campo}
          type="file"
          accept={TIPOS_ACEITOS.join(",")}
          disabled={enviando}
          onChange={(e) => aoEscolher(e.target.files?.[0])}
          className="sr-only"
        />
      </label>

      {erro && (
        <p role="alert" className="mt-2 max-w-[22rem] font-mono text-[10px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}
    </div>
  )
}
