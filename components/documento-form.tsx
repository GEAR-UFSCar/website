"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { CATEGORIAS, TIPOS_ACEITOS, enviarArquivo, validarArquivo } from "@/lib/documentos"
import { campoBase, rotuloBase, botaoDesabilitavel } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

type Origem = "arquivo" | "link" | "nenhum"

const vazio = {
  titulo: "",
  categoria: CATEGORIAS[0] as string,
  versao: "",
  link: "",
}

/** Cadastra um documento novo. Só renderizado para quem tem cargo. */
export function DocumentoForm() {
  const router = useRouter()
  const [campos, setCampos] = useState(vazio)
  const [origem, setOrigem] = useState<Origem>("arquivo")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set =
    (chave: keyof typeof campos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)

    const titulo = campos.titulo.trim()
    if (origem === "arquivo" && !arquivo) {
      setErro("Escolha o arquivo ou troque a origem para link externo.")
      return
    }
    if (origem === "link" && !/^https?:\/\//i.test(campos.link.trim())) {
      setErro("O link externo precisa começar com http:// ou https://.")
      return
    }
    if (arquivo) {
      const recusa = validarArquivo(arquivo)
      if (recusa) {
        setErro(recusa)
        return
      }
    }

    setSalvando(true)
    const supabase = createClient()

    /*
     * Sobe primeiro, grava depois — a mesma ordem de documento-anexo.tsx, pelo
     * mesmo motivo: linha apontando para objeto que não existe vira link morto
     * na tela, enquanto objeto sem linha é só desperdício de bucket.
     */
    let arquivoUrl: string | null = null
    if (origem === "arquivo" && arquivo) {
      const { caminho, erro: erroUpload } = await enviarArquivo(supabase, arquivo, titulo)
      if (erroUpload || !caminho) {
        setErro(mensagemSegura(erroUpload))
        setSalvando(false)
        return
      }
      arquivoUrl = caminho
    } else if (origem === "link") {
      arquivoUrl = campos.link.trim()
    }

    const { error } = await supabase.from("documentos").insert({
      titulo,
      categoria: campos.categoria,
      // a 006 não inventa "1.0" quando a versão é desconhecida; aqui também não
      versao: campos.versao.trim() || null,
      arquivo_url: arquivoUrl,
    })

    if (error) {
      setErro(mensagemSegura(error))
      setSalvando(false)
      return
    }

    setCampos(vazio)
    setArquivo(null)
    setOrigem("arquivo")
    setSalvando(false)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-white/10 p-6 space-y-5">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
        NOVO DOCUMENTO
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label htmlFor="doc-titulo" className={rotuloBase}>
            Título
          </label>
          <input
            id="doc-titulo"
            required
            maxLength={200}
            value={campos.titulo}
            onChange={set("titulo")}
            disabled={salvando}
            className={campoBase}
          />
          <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
            O TÍTULO É ÚNICO E VIRA O NOME DO ARQUIVO NO ACERVO
          </p>
        </div>

        <div>
          <label htmlFor="doc-categoria" className={rotuloBase}>
            Categoria
          </label>
          <select
            id="doc-categoria"
            value={campos.categoria}
            onChange={set("categoria")}
            disabled={salvando}
            className={campoBase}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c} className="bg-[var(--gear-ink)]">
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-versao" className={rotuloBase}>
            Versão (opcional)
          </label>
          <input
            id="doc-versao"
            maxLength={40}
            placeholder="1.0"
            value={campos.versao}
            onChange={set("versao")}
            disabled={salvando}
            className={campoBase}
          />
        </div>

        <fieldset className="md:col-span-2">
          <legend className={rotuloBase}>Arquivo</legend>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["arquivo", "Enviar arquivo"],
                ["link", "Link externo"],
                ["nenhum", "Cadastrar sem arquivo"],
              ] as [Origem, string][]
            ).map(([valor, texto]) => {
              const ativo = origem === valor
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setOrigem(valor)
                    setErro(null)
                  }}
                  disabled={salvando}
                  aria-pressed={ativo}
                  data-cursor-hover
                  className={`min-h-11 border px-5 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 ${
                    ativo
                      ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                      : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {texto}
                </button>
              )
            })}
          </div>

          {origem === "arquivo" && (
            <div className="mt-4">
              <input
                type="file"
                accept={TIPOS_ACEITOS.join(",")}
                disabled={salvando}
                onChange={(e) => {
                  setArquivo(e.target.files?.[0] ?? null)
                  setErro(null)
                }}
                className="block w-full font-mono text-[11px] text-muted-foreground file:mr-4 file:min-h-11 file:cursor-pointer file:border file:border-white/20 file:bg-transparent file:px-4 file:py-2.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-muted-foreground hover:file:border-[var(--gear-amber)] hover:file:text-[var(--gear-amber)]"
              />
              <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
                ATÉ 20 MB · {TIPOS_ACEITOS.join(" ").toUpperCase()}
              </p>
            </div>
          )}

          {origem === "link" && (
            <div className="mt-4">
              <label htmlFor="doc-link" className="sr-only">
                Link externo
              </label>
              <input
                id="doc-link"
                type="url"
                placeholder="https://…"
                value={campos.link}
                onChange={set("link")}
                disabled={salvando}
                className={campoBase}
              />
              <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
                PARA DOCUMENTO HOSPEDADO FORA — O LINK NÃO É ASSINADO NEM PROTEGIDO
              </p>
            </div>
          )}

          {origem === "nenhum" && (
            <p className="mt-4 font-sans text-sm font-light leading-relaxed text-muted-foreground">
              O documento entra na lista marcado como não anexado, e qualquer pessoa com cargo pode
              subir o arquivo depois pela própria lista.
            </p>
          )}
        </fieldset>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={salvando}
        data-cursor-hover
        className={`border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] ${botaoDesabilitavel}`}
      >
        {salvando ? "Salvando…" : "Cadastrar documento"}
      </button>
    </form>
  )
}
