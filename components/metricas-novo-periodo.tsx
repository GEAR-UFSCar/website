"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { proximoPeriodo, type MetricaPeriodo } from "@/lib/metricas"

/**
 * Fecha o período corrente e abre o seguinte.
 *
 * O QUE É COPIADO, E POR QUÊ
 * Só os INSUMOS. Membros ativos, horas médias, patrimônio e patrocínio mudam
 * pouco de um semestre para outro e servem de ponto de partida a corrigir.
 * Atividades, Resultados e Impacto começam zerados porque são justamente o que
 * o novo período tem de produzir — herdá-los faria a entidade começar o
 * semestre já "tendo feito" o que fez no anterior, que é a maneira mais
 * silenciosa de um painel de métricas passar a mentir.
 *
 * Dois passos sem transação: o insert vem PRIMEIRO. Se ele falhar, nada muda
 * e a pessoa tenta de novo. Na ordem inversa, uma falha deixaria o período
 * corrente fechado e nenhum aberto — a entidade sem onde registrar.
 */
export function MetricasNovoPeriodo({ metrica }: { metrica: MetricaPeriodo }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const proximo = proximoPeriodo(metrica.periodo)

  const virar = async () => {
    setErro(null)
    setSalvando(true)
    const supabase = createClient()

    const { error: erroInsert } = await supabase.from("metricas_periodo").insert({
      periodo: proximo,
      frente: metrica.frente,
      insumos: metrica.insumos,
      atividades: {},
      resultados: {},
      impacto: {},
    })

    if (erroInsert) {
      setErro(mensagemSegura(erroInsert))
      setSalvando(false)
      return
    }

    const { data, error } = await supabase
      .from("metricas_periodo")
      .update({ status: "Fechado" })
      .eq("id", metrica.id)
      .select("id")

    setSalvando(false)

    if (error) {
      setErro(
        `${mensagemSegura(error)} O período ${proximo} foi criado, mas ${metrica.periodo} continua aberto.`,
      )
      return
    }
    if (!data || data.length === 0) {
      setErro(`O período ${proximo} foi criado, mas ${metrica.periodo} não pôde ser fechado.`)
      return
    }

    setConfirmando(false)
    router.refresh()
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        data-cursor-hover
        className="min-h-11 border border-white/20 px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]"
      >
        Novo período
      </button>
    )
  }

  return (
    <div className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-5">
      <p className="max-w-[52ch] font-sans text-sm font-light leading-relaxed text-foreground">
        Fechar <span className="font-mono">{metrica.periodo}</span> e abrir{" "}
        <span className="font-mono text-[var(--gear-amber)]">{proximo}</span>? Os insumos são
        copiados como ponto de partida; atividades, resultados e impacto começam zerados. Período
        fechado vira histórico e ninguém mais o edita.
      </p>

      {erro && (
        <p role="alert" className="mt-4 font-mono text-[11px] leading-snug text-[var(--gear-amber)]">
          {erro}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={virar}
          disabled={salvando}
          data-cursor-hover
          className="min-h-11 border border-[var(--gear-amber)] bg-[var(--gear-amber)] px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--gear-ink)] disabled:opacity-50"
        >
          {salvando ? "Virando…" : `Fechar e abrir ${proximo}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={salvando}
          data-cursor-hover
          className="min-h-11 border border-white/20 px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
