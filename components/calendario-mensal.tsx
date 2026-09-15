"use client"

import { useState } from "react"
import Link from "next/link"

import {
  DIAS_DA_SEMANA,
  agruparPorDia,
  deslocarMes,
  diaDaSemanaPorExtenso,
  diaPorExtenso,
  gradeDoMes,
  mesDaChave,
  rotuloDoMes,
  type ItemAgenda,
} from "@/lib/agenda"

type Props = {
  /** "YYYY-MM" — o mês desenhado. Vem da URL, resolvido no servidor. */
  mes: string
  itens: ItemAgenda[]
  /** Hoje calculado no SERVIDOR. Se viesse de new Date() aqui, o primeiro
   *  render do cliente poderia divergir do HTML do servidor. */
  hoje: string
}

/** Quantos cabem numa célula antes do "+N". Dois é o que cabe sem cortar altura. */
const POR_CELULA = 2

/**
 * Cor é informação, não enfeite: âmbar = compromisso da entidade, mist = meta
 * pessoal. Prazo institucional sai em contorno âmbar (não preenchido) porque
 * é marco, não encontro — e ver os dois no mesmo tom apagaria a diferença
 * justamente na semana cheia, que é quando ela importa.
 */
function estiloDoPill(item: ItemAgenda) {
  if (item.origem === "meta") {
    if (item.concluida) return "border-white/15 bg-transparent text-muted-foreground line-through"
    if (item.atrasada) return "border-[var(--gear-mist)] bg-transparent text-[var(--gear-mist)]"
    return "border-[var(--gear-mist)] bg-[var(--gear-mist)] text-[var(--gear-ink)]"
  }
  if (item.rotulo === "Prazo") return "border-[var(--gear-amber)] bg-transparent text-[var(--gear-amber)]"
  return "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
}

export function CalendarioMensal({ mes, itens, hoje }: Props) {
  const grade = gradeDoMes(mes)
  const porDia = agruparPorDia(itens)

  /*
   * Seleção inicial: hoje, quando o mês na tela é o de hoje; senão o dia 1º.
   * Abrir num mês futuro com o painel vazio e sem seleção visível faz a grade
   * parecer não-clicável.
   */
  const [selecionado, setSelecionado] = useState(
    mesDaChave(hoje) === mes ? hoje : `${mes}-01`,
  )

  const doDia = porDia.get(selecionado) ?? []
  const eventosNoMes = itens.filter((i) => i.origem === "evento").length
  const metasNoMes = itens.filter((i) => i.origem === "meta").length

  const navegacao =
    "inline-flex min-h-11 items-center justify-center border border-white/20 px-4 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]"

  return (
    <div>
      {/* CABEÇALHO: mês à esquerda, navegação à direita */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Visão mensal
          </p>
          <h2 className="mt-2 font-sans text-3xl md:text-5xl font-light tracking-tight">
            {rotuloDoMes(mes)}
          </h2>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/membros/calendario?mes=${deslocarMes(mes, -1)}`}
            scroll={false}
            data-cursor-hover
            aria-label={`Ir para ${rotuloDoMes(deslocarMes(mes, -1))}`}
            className={`${navegacao} w-11`}
          >
            ◀
          </Link>
          <Link
            href="/membros/calendario"
            scroll={false}
            data-cursor-hover
            className={navegacao}
          >
            Hoje
          </Link>
          <Link
            href={`/membros/calendario?mes=${deslocarMes(mes, 1)}`}
            scroll={false}
            data-cursor-hover
            aria-label={`Ir para ${rotuloDoMes(deslocarMes(mes, 1))}`}
            className={`${navegacao} w-11`}
          >
            ▶
          </Link>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        {/* GRADE */}
        <div>
          <div className="grid grid-cols-7 border-b border-white/15">
            {DIAS_DA_SEMANA.map((dia) => (
              <div
                key={dia}
                className="pb-3 text-center font-mono text-[10px] md:text-[9px] tracking-[0.2em] text-muted-foreground"
              >
                {dia}
              </div>
            ))}
          </div>

          {/*
            gap-px sobre o fundo claro desenha as linhas da grade sem precisar
            de border em cada célula — border de célula duplica na fronteira e
            engrossa a linha do meio.
          */}
          <div className="mt-px grid grid-cols-7 gap-px bg-white/10">
            {grade.map((chave) => {
              const doMes = mesDaChave(chave) === mes
              const ehHoje = chave === hoje
              const ehSelecionado = chave === selecionado
              const lista = porDia.get(chave) ?? []
              const excedente = lista.length - POR_CELULA

              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setSelecionado(chave)}
                  aria-pressed={ehSelecionado}
                  aria-label={`${diaPorExtenso(chave)}, ${diaDaSemanaPorExtenso(chave)} — ${
                    lista.length === 0 ? "sem compromissos" : `${lista.length} item(ns)`
                  }`}
                  data-cursor-hover
                  className={`flex min-h-24 flex-col gap-1 p-2 text-left transition-colors duration-200 md:min-h-28 ${
                    ehSelecionado ? "bg-[var(--gear-navy)]" : "bg-[var(--gear-ink)] hover:bg-white/5"
                  } ${doMes ? "" : "opacity-40"}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[11px] ${
                      ehHoje
                        ? "rounded-full bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                        : ehSelecionado
                          ? "text-[var(--gear-amber)]"
                          : "text-muted-foreground"
                    }`}
                  >
                    {Number(chave.slice(8, 10))}
                  </span>

                  <span className="flex min-w-0 flex-col gap-1">
                    {lista.slice(0, POR_CELULA).map((item) => (
                      <span
                        key={item.id}
                        title={item.titulo}
                        className={`truncate border px-1.5 py-0.5 font-mono text-[10px] md:text-[9px] leading-tight ${estiloDoPill(item)}`}
                      >
                        {item.titulo}
                      </span>
                    ))}
                    {excedente > 0 && (
                      <span className="px-1.5 font-mono text-[10px] md:text-[9px] text-muted-foreground">
                        +{excedente}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Legenda: sem ela, três cores de pill viram adivinhação. */}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] md:text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-[var(--gear-amber)]" /> Reunião / sprint
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 border border-[var(--gear-amber)]" /> Prazo da entidade
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-[var(--gear-mist)]" /> Meta pessoal
            </span>
          </div>
        </div>

        {/* PAINEL DO DIA */}
        <aside className="border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          {/*
            O indicador diz o que os dados são de fato: uma agenda compartilhada
            (eventos da entidade + metas públicas dos outros) contada neste mês.
            Não diz "tempo real" porque não há assinatura de realtime aqui — a
            página busca no servidor a cada navegação.
          */}
          <p className="flex items-center gap-2 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gear-amber)]" />
            Agenda compartilhada · {eventosNoMes} evento(s) · {metasNoMes} meta(s)
          </p>

          <h3 className="mt-5 font-sans text-2xl md:text-3xl font-light tracking-tight">
            {diaPorExtenso(selecionado)}
          </h3>
          <p className="mt-1 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {diaDaSemanaPorExtenso(selecionado)}
            {selecionado === hoje ? " · hoje" : ""}
          </p>

          <div className="mt-6">
            {doDia.length === 0 ? (
              <p className="font-sans text-sm font-light leading-relaxed text-muted-foreground">
                Nenhum compromisso registrado para este dia.
              </p>
            ) : (
              <ul className="space-y-5">
                {doDia.map((item) => (
                  <li key={item.id} className="border-t border-white/10 pt-4">
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={`mt-1 h-2 w-2 shrink-0 border ${estiloDoPill(item)}`}
                      />
                      <div className="min-w-0">
                        {/* Sem truncar: é o ponto do painel existir. */}
                        <p
                          className={`font-sans text-base font-light leading-snug break-words ${
                            item.concluida ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {item.titulo}
                        </p>
                        <p className="mt-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          {item.hora ? `${item.hora} · ` : ""}
                          {item.rotulo}
                          {item.frente ? ` · ${item.frente}` : ""}
                          {item.atrasada ? " · vencida" : ""}
                        </p>
                        {item.descricao && (
                          <p className="mt-2 font-sans text-sm font-light leading-relaxed text-muted-foreground whitespace-pre-line">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
