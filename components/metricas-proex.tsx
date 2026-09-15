"use client"

import { useState } from "react"

import { Aviso } from "@/components/aviso"
import { inteiro, type MetricaPeriodo } from "@/lib/metricas"

/**
 * Semanas letivas de um semestre na UFSCar. Entra na conta da carga horária
 * porque o que a entidade registra é hora SEMANAL — e o formulário da ProEx
 * pede o total. O multiplicador fica visível na tela de propósito: número
 * estimado que se apresenta como medido é o que faz relatório perder
 * credibilidade na primeira conferência.
 */
const SEMANAS_LETIVAS = 18

export function MetricasProex({ metrica }: { metrica: MetricaPeriodo }) {
  const [copiado, setCopiado] = useState(false)

  const { insumos, atividades, resultados } = metrica
  const cargaTotal = Math.round(insumos.horas_semanais_media * SEMANAS_LETIVAS)
  const cargaEquipe = cargaTotal * insumos.membros_ativos

  const linhas = [
    `GEAR — Grupo de Extensão em Automação e Robótica · Período ${metrica.periodo}` +
      (metrica.frente ? ` · Frente ${metrica.frente}` : " · Entidade"),
    "",
    "PARTICIPANTES",
    `Alunos participantes (membros ativos): ${inteiro(insumos.membros_ativos)}`,
    `Alunos que concluíram a formação interna: ${inteiro(resultados.membros_completaram_academia)}`,
    "",
    "CARGA HORÁRIA",
    `Carga horária semanal média por participante: ${insumos.horas_semanais_media} h`,
    `Carga horária semestral por participante: ${inteiro(cargaTotal)} h (${insumos.horas_semanais_media} h × ${SEMANAS_LETIVAS} semanas letivas)`,
    `Carga horária semestral somada da equipe: ${inteiro(cargaEquipe)} h`,
    "",
    "AÇÕES FORMATIVAS",
    `Módulos ministrados: ${inteiro(atividades.modulos_ministrados)}`,
    `Cursos ofertados: ${atividades.cursos_ofertados.length > 0 ? atividades.cursos_ofertados.join("; ") : "nenhum no período"}`,
    `Eventos de divulgação: ${inteiro(atividades.eventos_divulgacao)}`,
    "",
    "PRODUÇÃO",
    `Publicações submetidas: ${inteiro(resultados.publicacoes_submetidas)}`,
    `Publicações aceitas: ${inteiro(resultados.publicacoes_aceitas)}`,
    `Projetos concluídos: ${inteiro(resultados.projetos_validacao_concluidos)}`,
    `Competições disputadas: ${inteiro(resultados.competicoes_disputadas)}`,
  ]

  const texto = linhas.join("\n")

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      /*
       * clipboard exige contexto seguro e permissão; em http:// simples ele
       * recusa. O texto continua na tela, selecionável — o botão é atalho, não
       * a única via.
       */
      setCopiado(false)
    }
  }

  return (
    <div>
      {/* Fica visível na tela E no papel: é o mal-entendido mais caro possível aqui. */}
      <Aviso titulo="ATENÇÃO" className="max-w-3xl">
        Isto ajuda a preencher o formulário oficial da ProExWeb — não é o formulário em si. Nada
        enviado aqui chega à Pró-Reitoria.
      </Aviso>

      <div className="mt-8 flex flex-wrap gap-3 nao-imprimir">
        <button
          type="button"
          onClick={copiar}
          data-cursor-hover
          className="min-h-11 border border-[var(--gear-amber)] px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"
        >
          {copiado ? "Copiado ✓" : "Copiar texto"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          data-cursor-hover
          className="min-h-11 border border-white/20 px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"
        >
          Imprimir / PDF
        </button>
        <p className="flex min-h-11 items-center font-mono text-[10px] tracking-wider text-muted-foreground">
          OU CTRL/CMD + P
        </p>
      </div>

      {/*
        <pre> e não uma tabela: o destino é um campo de texto do ProExWeb, e o
        que se cola tem de sair com as mesmas quebras de linha que se vê aqui.
      */}
      <pre className="mt-8 max-w-3xl overflow-x-auto border border-white/10 bg-[var(--gear-navy)] p-6 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
        {texto}
      </pre>

      <p className="mt-6 max-w-[62ch] font-mono text-[10px] leading-relaxed tracking-wider text-muted-foreground">
        A CARGA SEMESTRAL É ESTIMADA A PARTIR DA MÉDIA SEMANAL × {SEMANAS_LETIVAS} SEMANAS LETIVAS.
        CONFIRA CONTRA O CALENDÁRIO ACADÊMICO DO SEMESTRE ANTES DE ENVIAR.
      </p>
    </div>
  )
}
