"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { campoBase, rotuloBase, botaoDesabilitavel } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import {
  inteiro,
  reais,
  type Atividades,
  type Impacto,
  type Insumos,
  type MetricaPeriodo,
  type Resultados,
} from "@/lib/metricas"

type Props = {
  metrica: MetricaPeriodo
  podeEditar: boolean
  /** Soma viva do inventário, de valor_patrimonio_atual(). */
  valorPatrimonio: number
}

/* --- peças ---------------------------------------------------------------- */

/**
 * Um indicador numérico. O mesmo componente serve para quem edita e para quem
 * só olha — duas versões da mesma grade divergiriam no primeiro campo novo,
 * e a diferença entre ler e editar não é de layout, é de permissão.
 */
function Numero({
  rotulo,
  valor,
  editavel,
  aoMudar,
  sufixo,
  ajuda,
}: {
  rotulo: string
  valor: number
  editavel: boolean
  aoMudar: (v: number) => void
  sufixo?: string
  ajuda?: string
}) {
  const id = `m-${rotulo.replace(/\s+/g, "-").toLowerCase()}`

  return (
    <div>
      <label htmlFor={id} className={rotuloBase}>
        {rotulo}
      </label>
      {editavel ? (
        <input
          id={id}
          type="number"
          min={0}
          step={sufixo === "h" ? "0.5" : "1"}
          value={String(valor)}
          onChange={(e) => aoMudar(Number(e.target.value) || 0)}
          className={campoBase}
        />
      ) : (
        <p className="font-mono text-lg text-foreground">
          {inteiro(valor)}
          {sufixo ? <span className="text-muted-foreground"> {sufixo}</span> : null}
        </p>
      )}
      {ajuda && (
        <p className="mt-2 font-mono text-[10px] leading-snug tracking-wider text-muted-foreground">
          {ajuda}
        </p>
      )}
    </div>
  )
}

/** Cabeçalho de camada da cadeia lógica. */
function Camada({
  ordem,
  nome,
  explicacao,
  children,
}: {
  ordem: string
  nome: string
  explicacao: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-14 first:mt-0">
      <div className="border-t border-white/10 pt-8">
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
          {ordem} — {nome.toUpperCase()}
        </p>
        <h3 className="font-sans text-2xl md:text-3xl font-light italic">{nome}</h3>
        <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
          {explicacao}
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  )
}

/** Lista de texto livre (cursos ofertados). */
function ListaDeTexto({
  rotulo,
  itens,
  editavel,
  aoMudar,
  exemplo,
}: {
  rotulo: string
  itens: string[]
  editavel: boolean
  aoMudar: (v: string[]) => void
  exemplo: string
}) {
  const [novo, setNovo] = useState("")

  const acrescentar = () => {
    const texto = novo.trim()
    if (!texto) return
    aoMudar([...itens, texto])
    setNovo("")
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <p className={rotuloBase}>{rotulo}</p>

      {itens.length === 0 ? (
        <p className="font-sans text-sm font-light text-muted-foreground">Nenhum registrado.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {itens.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-2 border border-white/15 px-3 py-1.5 font-mono text-[11px] text-foreground"
            >
              {item}
              {editavel && (
                <button
                  type="button"
                  onClick={() => aoMudar(itens.filter((_, j) => j !== i))}
                  aria-label={`Remover ${item}`}
                  data-cursor-hover
                  className="text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editavel && (
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              // Enter acrescenta o item; sem isto ele submeteria o formulário
              // inteiro, salvando o que a pessoa ainda estava digitando.
              if (e.key === "Enter") {
                e.preventDefault()
                acrescentar()
              }
            }}
            placeholder={exemplo}
            className={`${campoBase} max-w-sm`}
            aria-label={`Acrescentar em ${rotulo}`}
          />
          <button
            type="button"
            onClick={acrescentar}
            data-cursor-hover
            className="min-h-11 border border-white/20 px-5 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]"
          >
            Acrescentar
          </button>
        </div>
      )}
    </div>
  )
}

/* --- formulário ----------------------------------------------------------- */

export function MetricasForm({ metrica, podeEditar, valorPatrimonio }: Props) {
  const router = useRouter()
  const [insumos, setInsumos] = useState<Insumos>(metrica.insumos)
  const [atividades, setAtividades] = useState<Atividades>(metrica.atividades)
  const [resultados, setResultados] = useState<Resultados>(metrica.resultados)
  const [impacto, setImpacto] = useState<Impacto>(metrica.impacto)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const campoI = <K extends keyof Insumos>(k: K) => (v: Insumos[K]) => {
    setInsumos((a) => ({ ...a, [k]: v }))
    setSalvo(false)
  }
  const campoA = <K extends keyof Atividades>(k: K) => (v: Atividades[K]) => {
    setAtividades((a) => ({ ...a, [k]: v }))
    setSalvo(false)
  }
  const campoR = <K extends keyof Resultados>(k: K) => (v: Resultados[K]) => {
    setResultados((a) => ({ ...a, [k]: v }))
    setSalvo(false)
  }
  const campoM = <K extends keyof Impacto>(k: K) => (v: Impacto[K]) => {
    setImpacto((a) => ({ ...a, [k]: v }))
    setSalvo(false)
  }

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("metricas_periodo")
      .update({
        // valor_patrimonio nunca vem do formulário: é a soma viva do
        // inventário, congelada no registro no momento de salvar.
        insumos: { ...insumos, valor_patrimonio: valorPatrimonio },
        atividades,
        resultados,
        impacto,
      })
      .eq("id", metrica.id)
      .select("id")

    setSalvando(false)

    if (error) {
      setErro(mensagemSegura(error))
      return
    }
    if (!data || data.length === 0) {
      setErro("Nenhuma linha alterada — a política de acesso recusou a mudança.")
      return
    }

    setSalvo(true)
    router.refresh()
  }

  const colocacoes = impacto.colocacoes_competicao

  return (
    <form onSubmit={salvar}>
      <Camada
        ordem="01"
        nome="Insumos"
        explicacao="O que entra: gente, tempo, bens e dinheiro. É a base de comparação — sem ela, um resultado bom não se distingue de um resultado caro."
      >
        <Numero rotulo="Membros ativos" valor={insumos.membros_ativos} editavel={podeEditar} aoMudar={campoI("membros_ativos")} />
        <Numero rotulo="Horas semanais (média)" valor={insumos.horas_semanais_media} editavel={podeEditar} aoMudar={campoI("horas_semanais_media")} sufixo="h" />

        {/* Único campo sem input, de propósito: o número vem do inventário. */}
        <div>
          <p className={rotuloBase}>Valor do patrimônio</p>
          <p className="font-mono text-lg text-[var(--gear-amber)]">{reais(valorPatrimonio)}</p>
          <p className="mt-2 font-mono text-[10px] leading-snug tracking-wider text-muted-foreground">
            SOMADO DE /MEMBROS/ADMINISTRACAO/PATRIMONIO · NÃO SE DIGITA AQUI
          </p>
        </div>

        <Numero rotulo="Patrocínio recebido (R$)" valor={insumos.patrocinio_recebido} editavel={podeEditar} aoMudar={campoI("patrocinio_recebido")} />
      </Camada>

      <Camada
        ordem="02"
        nome="Atividades"
        explicacao="O que a entidade fez com os insumos. Mede esforço, não efeito — reunião realizada não é resultado, é trabalho."
      >
        <Numero rotulo="Sprints concluídos" valor={atividades.sprints_concluidos} editavel={podeEditar} aoMudar={campoA("sprints_concluidos")} />
        <Numero rotulo="Módulos ministrados" valor={atividades.modulos_ministrados} editavel={podeEditar} aoMudar={campoA("modulos_ministrados")} />
        <Numero rotulo="Reuniões realizadas" valor={atividades.reunioes_realizadas} editavel={podeEditar} aoMudar={campoA("reunioes_realizadas")} />
        <Numero rotulo="Eventos de divulgação" valor={atividades.eventos_divulgacao} editavel={podeEditar} aoMudar={campoA("eventos_divulgacao")} />
        <ListaDeTexto
          rotulo="Cursos ofertados"
          itens={atividades.cursos_ofertados}
          editavel={podeEditar}
          aoMudar={campoA("cursos_ofertados")}
          exemplo="Introdução a ROS 2"
        />
      </Camada>

      <Camada
        ordem="03"
        nome="Resultados"
        explicacao="O que as atividades produziram dentro do período. É aqui que esforço vira entrega verificável."
      >
        <Numero rotulo="Projetos de validação concluídos" valor={resultados.projetos_validacao_concluidos} editavel={podeEditar} aoMudar={campoR("projetos_validacao_concluidos")} />
        <Numero rotulo="Publicações submetidas" valor={resultados.publicacoes_submetidas} editavel={podeEditar} aoMudar={campoR("publicacoes_submetidas")} />
        <Numero rotulo="Publicações aceitas" valor={resultados.publicacoes_aceitas} editavel={podeEditar} aoMudar={campoR("publicacoes_aceitas")} />
        <Numero rotulo="Competições disputadas" valor={resultados.competicoes_disputadas} editavel={podeEditar} aoMudar={campoR("competicoes_disputadas")} />
        <Numero rotulo="Membros que completaram a Academia" valor={resultados.membros_completaram_academia} editavel={podeEditar} aoMudar={campoR("membros_completaram_academia")} />
      </Camada>

      <Camada
        ordem="04"
        nome="Impacto"
        explicacao="O que mudou na vida de quem passou pela GEAR e no que a entidade deixa fora dela. É a camada que demora a aparecer — e a única que justifica o resto."
      >
        <Numero rotulo="Membros em estágio, IC ou bolsa" valor={impacto.membros_estagio_ic_bolsa} editavel={podeEditar} aoMudar={campoM("membros_estagio_ic_bolsa")} />
        <Numero rotulo="Projetos que viraram TCC ou pesquisa" valor={impacto.projetos_viraram_tcc_pesquisa} editavel={podeEditar} aoMudar={campoM("projetos_viraram_tcc_pesquisa")} />
        <Numero rotulo="Citações das publicações" valor={impacto.citacoes_publicacoes} editavel={podeEditar} aoMudar={campoM("citacoes_publicacoes")} />
        <Numero rotulo="Parcerias com apoio real" valor={impacto.parcerias_apoio_real} editavel={podeEditar} aoMudar={campoM("parcerias_apoio_real")} />

        {/* Funil: os três degraus juntos, porque o número de um só não diz nada */}
        <div className="sm:col-span-2 lg:col-span-4">
          <p className={rotuloBase}>Funil de retenção</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {(
              [
                ["bootcamp", "Entraram no Bootcamp"],
                ["academia", "Chegaram à Academia"],
                ["frente", "Escolheram uma frente"],
              ] as const
            ).map(([chave, rotulo]) => (
              <Numero
                key={chave}
                rotulo={rotulo}
                valor={impacto.funil_retencao[chave]}
                editavel={podeEditar}
                aoMudar={(v) =>
                  campoM("funil_retencao")({ ...impacto.funil_retencao, [chave]: v })
                }
              />
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground">
            É FUNIL: CADA DEGRAU É SUBCONJUNTO DO ANTERIOR, ENTÃO OS NÚMEROS SÓ DESCEM
          </p>
        </div>

        {/* Colocações: par edição/posição */}
        <div className="sm:col-span-2 lg:col-span-4">
          <p className={rotuloBase}>Colocações em competição</p>
          {colocacoes.length === 0 ? (
            <p className="font-sans text-sm font-light text-muted-foreground">
              Nenhuma colocação registrada.
            </p>
          ) : (
            <ul className="space-y-3">
              {colocacoes.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3">
                  {podeEditar ? (
                    <>
                      <input
                        value={c.edicao}
                        onChange={(e) => {
                          const copia = [...colocacoes]
                          copia[i] = { ...c, edicao: e.target.value }
                          campoM("colocacoes_competicao")(copia)
                        }}
                        placeholder="RoboCup Rescue 2026"
                        aria-label={`Edição da colocação ${i + 1}`}
                        className={`${campoBase} max-w-xs`}
                      />
                      <input
                        value={c.colocacao}
                        onChange={(e) => {
                          const copia = [...colocacoes]
                          copia[i] = { ...c, colocacao: e.target.value }
                          campoM("colocacoes_competicao")(copia)
                        }}
                        placeholder="3º lugar"
                        aria-label={`Colocação ${i + 1}`}
                        className={`${campoBase} max-w-[10rem]`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          campoM("colocacoes_competicao")(colocacoes.filter((_, j) => j !== i))
                        }
                        aria-label={`Remover colocação ${i + 1}`}
                        data-cursor-hover
                        className="min-h-11 px-2 font-mono text-[11px] text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
                      >
                        remover
                      </button>
                    </>
                  ) : (
                    <p className="font-mono text-sm text-foreground">
                      {c.edicao} · <span className="text-[var(--gear-amber)]">{c.colocacao}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {podeEditar && (
            <button
              type="button"
              onClick={() =>
                campoM("colocacoes_competicao")([...colocacoes, { edicao: "", colocacao: "" }])
              }
              data-cursor-hover
              className="mt-4 min-h-11 border border-white/20 px-5 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)]"
            >
              Acrescentar colocação
            </button>
          )}
        </div>
      </Camada>

      {erro && (
        <div role="alert" className="mt-10 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      {podeEditar ? (
        <div className="mt-12 flex flex-wrap items-center gap-5">
          <button
            type="submit"
            disabled={salvando}
            data-cursor-hover
            className={`border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] ${botaoDesabilitavel}`}
          >
            {salvando ? "Salvando…" : "Salvar período"}
          </button>
          {salvo && (
            <p role="status" className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
              Salvo
            </p>
          )}
        </div>
      ) : (
        <p className="mt-12 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
          Você está vendo os números em leitura. Editar este registro é de quem tem cargo na frente
          correspondente — ou da Presidência, no registro geral da entidade.
        </p>
      )}
    </form>
  )
}
