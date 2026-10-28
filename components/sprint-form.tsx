"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { STATUS_SPRINT, type FrenteNome } from "@/lib/administracao"
import type { PessoaResumo, Sprint } from "@/lib/sprints"
import { campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { useEncerrarEdicao } from "@/components/membros/registro-editavel"

type Props = {
  frente: FrenteNome
  usuarioId: string
  /** Membros aprovados, para escolher o responsável. */
  pessoas: NonNullable<PessoaResumo>[]
  /** Presente = edição deste sprint. Status e progresso ficam nos controles do cartão. */
  sprint?: Sprint
}

/**
 * Cria um sprint na frente da página. A frente vem da rota, não do formulário:
 * a RLS (011) só deixa gravar na própria frente quem não é diretoria, e um
 * seletor aqui só ofereceria opções que o banco recusa.
 *
 * O responsável começa em quem está criando porque o quadro abre no filtro
 * "Meus": sprint sem dono sumiria da tela no instante em que foi criado.
 */
export function SprintForm({ frente, usuarioId, pessoas, sprint }: Props) {
  const router = useRouter()
  const encerrar = useEncerrarEdicao()
  const sufixo = sprint?.id ?? "novo"
  const vazio = {
    titulo: "",
    descricao: "",
    status: "Planejado" as string,
    data_inicio: "",
    data_fim: "",
    responsavel_id: usuarioId,
    proximo_passo: "",
  }
  const [campos, setCampos] = useState(
    sprint
      ? {
          titulo: sprint.titulo,
          descricao: sprint.descricao,
          status: sprint.status,
          data_inicio: sprint.data_inicio ?? "",
          data_fim: sprint.data_fim ?? "",
          responsavel_id: sprint.responsavel?.id ?? "",
          proximo_passo: sprint.proximo_passo ?? "",
        }
      : vazio,
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

    // o CHECK de intervalo recusaria, mas o aviso local é melhor
    if (campos.data_inicio && campos.data_fim && campos.data_fim < campos.data_inicio) {
      setErro("O fim do sprint não pode ser antes do início.")
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const valores = {
      titulo: campos.titulo.trim(),
      // descricao é NOT NULL no banco; vazio vira string vazia, não null
      descricao: campos.descricao.trim(),
      data_inicio: campos.data_inicio || null,
      data_fim: campos.data_fim || null,
      responsavel_id: campos.responsavel_id || null,
      proximo_passo: campos.proximo_passo.trim() || null,
    }

    if (sprint) {
      const { data, error } = await supabase.from("sprints").update(valores).eq("id", sprint.id).select("id")
      setSalvando(false)
      if (error) return setErro(mensagemSegura(error))
      if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")
      encerrar?.()
      router.refresh()
      return
    }

    const { error } = await supabase.from("sprints").insert({ ...valores, frente, status: campos.status })

    if (error) {
      setErro(mensagemSegura(error))
      setSalvando(false)
      return
    }

    setCampos(vazio)
    setSalvando(false)
    router.refresh()
  }

  const formulario = (
      <form onSubmit={enviar} className={sprint ? "space-y-5 border border-linha-forte p-5" : "space-y-5 px-6 pb-6"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label htmlFor={`sprint-titulo-${sufixo}`} className={rotuloBase}>
              Título
            </label>
            <input
              id={`sprint-titulo-${sufixo}`}
              required
              maxLength={200}
              value={campos.titulo}
              onChange={set("titulo")}
              disabled={salvando}
              className={campoBase}
            />
          </div>

          {!sprint && (
            <div>
              <label htmlFor="sprint-status" className={rotuloBase}>
                Status
              </label>
              <select id="sprint-status" value={campos.status} onChange={set("status")} disabled={salvando} className={campoBase}>
                {STATUS_SPRINT.map((s) => (
                  <option key={s} value={s} className="bg-[var(--gear-ink)]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor={`sprint-responsavel-${sufixo}`} className={rotuloBase}>
              Responsável
            </label>
            <select
              id={`sprint-responsavel-${sufixo}`}
              value={campos.responsavel_id}
              onChange={set("responsavel_id")}
              disabled={salvando}
              className={campoBase}
            >
              <option value="" className="bg-[var(--gear-ink)]">
                Sem responsável
              </option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--gear-ink)]">
                  {p.nome_completo?.trim() || "Sem nome"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`sprint-inicio-${sufixo}`} className={rotuloBase}>
              Início (opcional)
            </label>
            <input id={`sprint-inicio-${sufixo}`} type="date" value={campos.data_inicio} onChange={set("data_inicio")} disabled={salvando} className={campoBase} />
          </div>

          <div>
            <label htmlFor={`sprint-fim-${sufixo}`} className={rotuloBase}>
              Fim (opcional)
            </label>
            <input id={`sprint-fim-${sufixo}`} type="date" value={campos.data_fim} onChange={set("data_fim")} disabled={salvando} className={campoBase} />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`sprint-proximo-${sufixo}`} className={rotuloBase}>
              Próximo passo (opcional)
            </label>
            <input
              id={`sprint-proximo-${sufixo}`}
              maxLength={200}
              value={campos.proximo_passo}
              onChange={set("proximo_passo")}
              disabled={salvando}
              className={campoBase}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`sprint-descricao-${sufixo}`} className={rotuloBase}>
              Descrição (opcional)
            </label>
            <textarea
              id={`sprint-descricao-${sufixo}`}
              rows={3}
              maxLength={20000}
              value={campos.descricao}
              onChange={set("descricao")}
              disabled={salvando}
              className={`${campoBase} resize-y`}
            />
          </div>
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
          className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50"
        >
          {salvando ? "Salvando…" : sprint ? "Salvar" : "Criar sprint"}
        </button>
      </form>
  )

  if (sprint) return formulario

  return (
    <details className="mt-8 border border-linha">
      <summary className="cursor-pointer list-none p-5 font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
        + NOVO SPRINT EM {frente.toUpperCase()}
      </summary>
      {formulario}
    </details>
  )
}
