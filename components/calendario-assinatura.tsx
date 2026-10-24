"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, RefreshCw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import s from "./calendario-clean.module.css"

/**
 * Assinar o calendário do GEAR no Google Agenda, Apple Calendário ou Outlook.
 *
 * O link carrega um segredo: quem o tem lê os EVENTOS da entidade (os mesmos
 * que qualquer membro aprovado já lê) e nada mais — metas, sprints e perfis não
 * saem por ele. "Gerar novo link" troca o segredo e o antigo para de funcionar
 * na hora. Não é um recurso de risco alto, mas o link não deve ir para fora do
 * grupo: o texto diz isso.
 */
export function CalendarioAssinatura({
  usuarioId, token, origem, indisponivel = false,
}: { usuarioId: string; token: string | null; origem: string; indisponivel?: boolean }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const endereco = token ? `${origem}/api/calendario/${token}.ics` : null
  const webcal = endereco ? endereco.replace(/^https?:/, "webcal:") : null

  async function gerar(renovar: boolean) {
    setOcupado(true)
    setErro(null)
    const supabase = createClient()
    const { error } = renovar
      ? await supabase.from("calendario_assinaturas").update({ token: crypto.randomUUID() }).eq("usuario_id", usuarioId)
      : await supabase.from("calendario_assinaturas").insert({ usuario_id: usuarioId })
    setOcupado(false)
    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    router.refresh()
  }

  async function desativar() {
    setOcupado(true)
    setErro(null)
    const supabase = createClient()
    const { error } = await supabase.from("calendario_assinaturas").delete().eq("usuario_id", usuarioId)
    setOcupado(false)
    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    router.refresh()
  }

  async function copiar() {
    if (!endereco) return
    try {
      await navigator.clipboard.writeText(endereco)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sem permissão de área de transferência (http, iframe): o campo ao lado já vem selecionável.
      setErro("Não consegui copiar sozinho. Selecione o endereço no campo e copie.")
    }
  }

  if (indisponivel) {
    return (
      <div className={s.assinatura}>
        <p className={s.assinaturaTexto}>
          A assinatura depende da migração <code>supabase/027_calendario_completo.sql</code>, que ainda não foi
          aplicada neste banco.
        </p>
      </div>
    )
  }

  return (
    <div className={s.assinatura}>
      {!endereco ? (
        <>
          <p className={s.assinaturaTexto}>
            Veja os eventos do GEAR dentro do seu próprio calendário, no celular e no computador.
          </p>
          <button type="button" onClick={() => gerar(false)} disabled={ocupado} className={s.acao} data-cursor-hover>
            {ocupado ? "Gerando…" : "Gerar meu link"}
          </button>
        </>
      ) : (
        <>
          <label htmlFor="cal-link" className={s.assinaturaRotulo}>
            Seu endereço de assinatura
          </label>
          <div className={s.assinaturaLinha}>
            <input
              id="cal-link" readOnly value={endereco} className={s.assinaturaCampo}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" onClick={copiar} className={s.iconeBotao} aria-label="Copiar endereço" data-cursor-hover>
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
          </div>
          <ul className={s.assinaturaLista}>
            <li>
              <strong>Google Agenda:</strong> em “Outras agendas”, escolha “Por URL” e cole o endereço.
            </li>
            <li>
              <strong>Apple e Outlook:</strong>{" "}
              <a href={webcal ?? undefined} className={s.assinaturaLink}>
                abrir direto no aplicativo
              </a>
              .
            </li>
          </ul>
          <p className={s.assinaturaAviso}>
            Os aplicativos atualizam a assinatura sozinhos, de tempos em tempos — um evento novo pode levar horas
            para aparecer lá. Só os eventos do GEAR vão no link; metas e sprints, não. Não compartilhe o endereço
            fora do grupo.
          </p>
          <div className={s.assinaturaAcoes}>
            <button type="button" onClick={() => gerar(true)} disabled={ocupado} className={s.acao} data-cursor-hover>
              <RefreshCw size={14} aria-hidden="true" /> Gerar novo link
            </button>
            <button type="button" onClick={desativar} disabled={ocupado} className={s.acao} data-cursor-hover>
              Desativar
            </button>
          </div>
        </>
      )}
      {erro && (
        <p role="alert" className={s.erroInline}>
          {erro}
        </p>
      )}
    </div>
  )
}
