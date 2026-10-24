"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { RESPOSTAS_PRESENCA, ROTULO_PRESENCA, type RespostaPresenca } from "@/lib/calendario"
import s from "./calendario-clean.module.css"

/**
 * "Vou / Talvez / Não vou" para UMA ocorrência do evento. Clicar na resposta
 * que já está marcada desfaz — sem um botão "limpar" a mais.
 *
 * A resposta aparece na hora (otimista) e volta atrás se o banco recusar. É
 * confirmação de presença, não frequência: o registro de quem esteve lá,
 * para certificado, é outra rotina.
 */
export function EventoPresenca({
  eventoId, dia, usuarioId, atual,
}: { eventoId: string; dia: string; usuarioId: string; atual: RespostaPresenca | null }) {
  const router = useRouter()
  const [resposta, setResposta] = useState<RespostaPresenca | null>(atual)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function responder(nova: RespostaPresenca) {
    if (ocupado) return
    const anterior = resposta
    const proxima = anterior === nova ? null : nova
    setResposta(proxima)
    setErro(null)
    setOcupado(true)

    const supabase = createClient()
    const { error } = proxima
      ? await supabase
          .from("eventos_presencas")
          .upsert(
            { evento_id: eventoId, usuario_id: usuarioId, dia, resposta: proxima, atualizado_em: new Date().toISOString() },
            { onConflict: "evento_id,usuario_id,dia" },
          )
      : await supabase
          .from("eventos_presencas")
          .delete()
          .eq("evento_id", eventoId)
          .eq("usuario_id", usuarioId)
          .eq("dia", dia)

    setOcupado(false)
    if (error) {
      setResposta(anterior)
      setErro(mensagemSegura(error))
      return
    }
    router.refresh()
  }

  return (
    <div>
      <div className={s.presenca} role="group" aria-label="Sua presença neste dia">
        {RESPOSTAS_PRESENCA.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => responder(r)}
            disabled={ocupado}
            aria-pressed={resposta === r}
            data-resposta={r}
            data-cursor-hover
            className={s.presencaBotao}
          >
            {ROTULO_PRESENCA[r]}
          </button>
        ))}
      </div>
      {erro && (
        <p role="alert" className={s.erroInline}>
          {erro}
        </p>
      )}
    </div>
  )
}
