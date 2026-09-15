"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { FRENTES } from "@/lib/administracao"
import { VISIBILIDADES, type Meta } from "@/lib/metas"
import { hojeISO } from "@/lib/datas"
import { campoBase, rotuloBase, botaoDesabilitavel } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

type Props = {
  usuarioId: string
  /** Presente = edição da meta existente. Ausente = criação. */
  meta?: Meta
  /** Chamado ao terminar a edição (salvou ou cancelou). Só no modo edição. */
  aoEncerrar?: () => void
}

const vazio = (prazo: string) => ({
  titulo: "",
  descricao: "",
  prazo,
  visibilidade: VISIBILIDADES[0] as string,
  frente_vinculada: "",
})

/**
 * Cria ou edita uma meta. É o mesmo formulário nos dois casos de propósito:
 * os campos são idênticos, e duas cópias divergiriam no primeiro campo novo.
 */
export function MetaForm({ usuarioId, meta, aoEncerrar }: Props) {
  const router = useRouter()
  const editando = Boolean(meta)

  const [campos, setCampos] = useState(() =>
    meta
      ? {
          titulo: meta.titulo,
          descricao: meta.descricao ?? "",
          prazo: meta.prazo.slice(0, 10),
          visibilidade: meta.visibilidade,
          frente_vinculada: meta.frente_vinculada ?? "",
        }
      : vazio(hojeISO()),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set =
    (chave: keyof typeof campos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const supabase = createClient()
    const valores = {
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim() || null,
      prazo: campos.prazo,
      visibilidade: campos.visibilidade,
      // vazio = meta pessoal sem vínculo com frente
      frente_vinculada: campos.frente_vinculada || null,
    }

    if (meta) {
      /*
       * `.select("id")` para distinguir "não mudou nada" de "a RLS recusou":
       * um UPDATE barrado por policy volta sem erro e sem linha. Sem isto, a
       * tela diria "salvo" para uma edição que o banco descartou.
       */
      const { data, error } = await supabase
        .from("metas")
        .update(valores)
        .eq("id", meta.id)
        .select("id")

      if (error) {
        setErro(mensagemSegura(error))
        setSalvando(false)
        return
      }
      if (!data || data.length === 0) {
        setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
        setSalvando(false)
        return
      }
    } else {
      const { error } = await supabase.from("metas").insert({
        ...valores,
        /*
         * Mandado porque a coluna é NOT NULL e porque bancos sem a 017
         * aplicada não têm o trigger. Depois dela o valor é irrelevante:
         * carimbar_dono_meta() sobrescreve com auth.uid() antes de gravar.
         */
        usuario_id: usuarioId,
      })

      if (error) {
        setErro(mensagemSegura(error))
        setSalvando(false)
        return
      }
      setCampos(vazio(hojeISO()))
    }

    setSalvando(false)
    router.refresh()
    aoEncerrar?.()
  }

  return (
    <form
      onSubmit={enviar}
      className={editando ? "mt-5 border border-white/15 p-5 space-y-5" : "border border-white/10 p-6 space-y-5"}
    >
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
        {editando ? "EDITANDO META" : "NOVA META"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label htmlFor={`titulo-${meta?.id ?? "nova"}`} className={rotuloBase}>
            Título
          </label>
          <input
            id={`titulo-${meta?.id ?? "nova"}`}
            required
            maxLength={200}
            value={campos.titulo}
            onChange={set("titulo")}
            disabled={salvando}
            className={campoBase}
          />
        </div>

        <div>
          <label htmlFor={`prazo-${meta?.id ?? "nova"}`} className={rotuloBase}>
            Prazo
          </label>
          <input
            id={`prazo-${meta?.id ?? "nova"}`}
            type="date"
            required
            value={campos.prazo}
            onChange={set("prazo")}
            disabled={salvando}
            className={campoBase}
          />
        </div>

        <div>
          <label htmlFor={`frente-${meta?.id ?? "nova"}`} className={rotuloBase}>
            Frente vinculada
          </label>
          <select
            id={`frente-${meta?.id ?? "nova"}`}
            value={campos.frente_vinculada}
            onChange={set("frente_vinculada")}
            disabled={salvando}
            className={campoBase}
          >
            <option value="" className="bg-[var(--gear-ink)]">
              Nenhuma (meta pessoal)
            </option>
            {FRENTES.map((f) => (
              <option key={f} value={f} className="bg-[var(--gear-ink)]">
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`descricao-${meta?.id ?? "nova"}`} className={rotuloBase}>
            Descrição (opcional)
          </label>
          <textarea
            id={`descricao-${meta?.id ?? "nova"}`}
            rows={3}
            maxLength={5000}
            value={campos.descricao}
            onChange={set("descricao")}
            disabled={salvando}
            className={`${campoBase} resize-y`}
          />
        </div>

        {/*
          Visibilidade é escolha de duas opções com consequência de privacidade:
          merece os dois estados visíveis ao mesmo tempo, não um select que
          esconde metade da decisão atrás de um clique.
        */}
        <fieldset className="md:col-span-2">
          <legend className={rotuloBase}>Visibilidade</legend>
          <div className="flex flex-wrap gap-3">
            {VISIBILIDADES.map((v) => {
              const ativo = campos.visibilidade === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCampos((a) => ({ ...a, visibilidade: v }))}
                  disabled={salvando}
                  aria-pressed={ativo}
                  data-cursor-hover
                  className={`min-h-11 border px-5 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 disabled:opacity-50 ${
                    ativo
                      ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                      : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              )
            })}
          </div>
          <p className="mt-3 font-sans text-xs font-light leading-relaxed text-muted-foreground">
            {campos.visibilidade === "Pública"
              ? "Qualquer membro aprovado vê esta meta e o seu nome. Continua só você editando."
              : "Só você vê esta meta."}
          </p>
        </fieldset>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={salvando}
          data-cursor-hover
          className={`border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] ${botaoDesabilitavel}`}
        >
          {salvando ? "Salvando…" : editando ? "Salvar" : "Criar meta"}
        </button>

        {editando && (
          <button
            type="button"
            onClick={aoEncerrar}
            disabled={salvando}
            data-cursor-hover
            className="border border-white/20 bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
