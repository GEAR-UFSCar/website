import type { CSSProperties } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { FRENTES } from "@/lib/administracao"
import {
  DIAS_DA_SEMANA,
  ROTULO_DA_VISAO,
  VISOES,
  agruparPorDia,
  deslocarDia,
  deslocarMes,
  diaPorExtenso,
  diasEntre,
  gradeDoMes,
  hrefCalendario,
  mesDaChave,
  rotuloDaSemana,
  rotuloDoDia,
  rotuloDoMes,
  semanaDe,
  type ItemAgenda,
  type Visao,
} from "@/lib/agenda"
import s from "./calendario-clean.module.css"

export type Prazo = {
  id: string
  titulo: string
  /** "YYYY-MM-DD" em Brasília. */
  dia: string
  /** "Prazo da GEAR" ou "Sua meta". */
  rotulo: string
  frente: string | null
}

type Props = {
  visao: Visao
  /** Dia de referência ("YYYY-MM-DD"). Na visão mensal, o mês é o deste dia. */
  dia: string
  hoje: string
  frente: string | null
  /** Itens da grade do mês de `dia`, já filtrados pela frente. */
  itens: ItemAgenda[]
  prazos: Prazo[]
  /** "Bom dia, Michael". */
  saudacao: string
  podeCriarEvento: boolean
}

/*
 * Cor por frente. "cor" pinta ponto e contorno; "claro" é o fundo do cartão;
 * "texto" é o tom claro legível sobre "claro" no fundo escuro. Item sem frente
 * é da entidade inteira e fica no cinza.
 */
const CORES: Record<string, { cor: string; claro: string; texto: string }> = {
  Geral: { cor: "#7C8C9A", claro: "rgba(124, 140, 154, 0.18)", texto: "#C9D3DB" },
  Competição: { cor: "#FF7A2F", claro: "rgba(255, 122, 47, 0.16)", texto: "#FFB48A" },
  Pesquisa: { cor: "#3B8FD1", claro: "rgba(59, 143, 209, 0.18)", texto: "#8CC4EE" },
  Projetos: { cor: "#2BA877", claro: "rgba(43, 168, 119, 0.18)", texto: "#7FDDB5" },
}

function corDa(frente: string | null): CSSProperties {
  const c = CORES[frente ?? "Geral"] ?? CORES.Geral
  return { "--cor": c.cor, "--claro": c.claro, "--texto": c.texto } as CSSProperties
}

/** "14:00", "até 23:59" para prazo, "Dia todo" para meta. */
function rotuloDaHora(item: ItemAgenda) {
  if (!item.hora) return "Dia todo"
  return item.rotulo === "Prazo" ? `até ${item.hora}` : item.hora
}

const LETRAS = ["S", "T", "Q", "Q", "S", "S", "D"]

/**
 * Calendário de membros no estilo "Clean": lateral com mini-calendário e
 * filtro de frente, e área principal com prazos em contagem regressiva e as
 * visões Semana / Dia / Mês.
 *
 * Server Component, sem estado no cliente: visão, dia e frente vivem na URL
 * (ver hrefCalendario), e cada clique é um Link. Assim a página busca no
 * servidor só o que vai desenhar, o "hoje" é sempre o de Brasília, e o link
 * da semana pode ser mandado no grupo.
 */
export function CalendarioClean({ visao, dia, hoje, frente, itens, prazos, saudacao, podeCriarEvento }: Props) {
  const porDia = agruparPorDia(itens)
  const mes = mesDaChave(dia)

  const titulo = visao === "mes" ? rotuloDoMes(mes) : visao === "semana" ? rotuloDaSemana(dia) : rotuloDoDia(dia)
  const passo = (sentido: 1 | -1) =>
    visao === "mes"
      ? hrefCalendario({ visao, dia: `${deslocarMes(mes, sentido)}-01`, frente })
      : hrefCalendario({ visao, dia: deslocarDia(dia, visao === "semana" ? 7 * sentido : sentido), frente })

  return (
    <div className={s.raiz}>
      {/* ------------------------------ LATERAL ------------------------------ */}
      <aside className={s.lateral}>
        <div className={s.acoes}>
          <Link href="/membros/metas" className={s.botaoPrimario} data-cursor-hover>
            <Plus size={16} aria-hidden="true" /> Nova meta
          </Link>
          {podeCriarEvento && (
            <a href="#novo-evento" className={s.botaoSecundario} data-cursor-hover>
              <Plus size={16} aria-hidden="true" /> Novo evento da GEAR
            </a>
          )}
        </div>

        <MiniCalendario visao={visao} dia={dia} hoje={hoje} frente={frente} porDia={porDia} />

        <nav aria-label="Filtrar por frente">
          <p className={s.secaoTitulo}>Frentes</p>
          <div className={s.filtros}>
            <Link
              href={hrefCalendario({ visao, dia })}
              scroll={false}
              data-cursor-hover
              aria-current={!frente ? "true" : undefined}
              className={s.filtro}
              style={corDa(null)}
            >
              <span className={s.filtroPonto} aria-hidden="true" /> Todas
            </Link>
            {FRENTES.map((f) => (
              <Link
                key={f}
                href={hrefCalendario({ visao, dia, frente: f })}
                scroll={false}
                data-cursor-hover
                aria-current={frente === f ? "true" : undefined}
                className={s.filtro}
                style={corDa(f)}
              >
                <span className={s.filtroPonto} aria-hidden="true" /> {f}
              </Link>
            ))}
          </div>
          {/* Reunião geral é da entidade inteira: some do filtro e a pessoa acha que não tem reunião. */}
          {frente && <p className={s.filtroDica}>Eventos gerais continuam aparecendo.</p>}
        </nav>

        <div className={s.legenda}>
          <p className={s.secaoTitulo}>Legenda</p>
          <span><span className={s.amostraEvento} aria-hidden="true" /> Evento da GEAR</span>
          <span><span className={s.amostraMeta} aria-hidden="true" /> Meta (sua ou pública)</span>
        </div>
      </aside>

      {/* ------------------------------ CONTEÚDO ----------------------------- */}
      <div className={s.conteudo}>
        <div className={s.topo}>
          <div>
            <p className={s.saudacao}>{saudacao}</p>
            <h2 className={s.titulo}>{titulo}</h2>
          </div>
          <div className={s.controles}>
            {/* No celular a lateral desce para o fim da página; a ação principal sobe para cá. */}
            <Link href="/membros/metas" className={`${s.botaoPrimario} ${s.soCelular}`} data-cursor-hover>
              <Plus size={16} aria-hidden="true" /> Nova meta
            </Link>
            <div className={s.navData}>
              <Link href={passo(-1)} scroll={false} data-cursor-hover aria-label="Período anterior" className={s.iconeBotao}>
                <ChevronLeft size={16} aria-hidden="true" />
              </Link>
              <Link href={hrefCalendario({ visao, dia: hoje, frente })} scroll={false} data-cursor-hover className={s.botaoHoje}>
                Hoje
              </Link>
              <Link href={passo(1)} scroll={false} data-cursor-hover aria-label="Próximo período" className={s.iconeBotao}>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <nav aria-label="Visão do calendário" className={s.abas}>
              {VISOES.map((v) => (
                <Link
                  key={v}
                  href={hrefCalendario({ visao: v, dia, frente })}
                  scroll={false}
                  data-cursor-hover
                  aria-current={v === visao ? "page" : undefined}
                  className={s.aba}
                >
                  {ROTULO_DA_VISAO[v]}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {prazos.length > 0 && <Prazos prazos={prazos} hoje={hoje} />}

        {visao === "semana" && <Semana dia={dia} hoje={hoje} frente={frente} porDia={porDia} />}
        {visao === "mes" && <Mes mes={mes} hoje={hoje} frente={frente} porDia={porDia} />}
        {visao === "dia" && <Dia itens={porDia.get(dia) ?? []} />}
      </div>
    </div>
  )
}

/* ------------------------------ Mini-calendário ----------------------------- */
function MiniCalendario({
  visao, dia, hoje, frente, porDia,
}: { visao: Visao; dia: string; hoje: string; frente: string | null; porDia: Map<string, ItemAgenda[]> }) {
  const mes = mesDaChave(dia)
  const semana = visao === "semana" ? new Set(semanaDe(dia)) : new Set<string>()
  // No mês, clicar num dia abre o Dia; nas outras visões, mantém a visão e muda o dia.
  const destino: Visao = visao === "mes" ? "dia" : visao

  return (
    <div className={s.mini}>
      <div className={s.miniTopo}>
        <span className={s.miniTitulo}>{rotuloDoMes(mes)}</span>
        <div className={s.setas}>
          <Link href={hrefCalendario({ visao, dia: `${deslocarMes(mes, -1)}-01`, frente })} scroll={false} data-cursor-hover aria-label="Mês anterior" className={s.iconeBotao}>
            <ChevronLeft size={16} aria-hidden="true" />
          </Link>
          <Link href={hrefCalendario({ visao, dia: `${deslocarMes(mes, 1)}-01`, frente })} scroll={false} data-cursor-hover aria-label="Próximo mês" className={s.iconeBotao}>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className={s.miniGrade}>
        {LETRAS.map((l, i) => (
          <span key={i} className={s.miniLetra} aria-hidden="true">{l}</span>
        ))}
        {gradeDoMes(mes).map((chave) => (
          <Link
            key={chave}
            href={hrefCalendario({ visao: destino, dia: chave, frente })}
            scroll={false}
            data-cursor-hover
            className={s.miniDia}
            data-hoje={chave === hoje || undefined}
            data-fora={mesDaChave(chave) !== mes || undefined}
            data-selecionado={chave === dia || undefined}
            data-semana={semana.has(chave) || undefined}
            aria-label={diaPorExtenso(chave)}
          >
            {Number(chave.slice(8, 10))}
            <span className={s.miniPonto} data-ativo={porDia.has(chave) || undefined} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------- Prazos --------------------------------- */
/**
 * Contagem regressiva dos próximos prazos — "D–3" se lê mais rápido que
 * "19 de outubro". Laranja só nos próximos 2 dias: se tudo for urgente, nada é.
 */
function Prazos({ prazos, hoje }: { prazos: Prazo[]; hoje: string }) {
  return (
    <ul className={s.prazos} aria-label="Próximos prazos">
      {prazos.map((p) => {
        const faltam = diasEntre(hoje, p.dia)
        const estilo = faltam <= 2 ? corDa("Competição") : corDa(p.frente)
        return (
          <li key={p.id} className={s.prazo} style={estilo}>
            <span className={s.prazoNum} aria-label={faltam === 0 ? "Vence hoje" : `Faltam ${faltam} dias`}>
              {faltam === 0 ? (
                <span className={s.prazoHoje}>HOJE</span>
              ) : (
                <>
                  <small aria-hidden="true">D–</small>
                  <strong aria-hidden="true">{String(faltam).padStart(2, "0")}</strong>
                </>
              )}
            </span>
            <span className={s.prazoTexto}>
              <span className={s.prazoTitulo}>{p.titulo}</span>
              <span className={s.prazoMeta}>
                {diaPorExtenso(p.dia)} · {p.rotulo}
                {p.frente ? ` · ${p.frente}` : ""}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------ Cartão de item ----------------------------- */
function Cartao({ item }: { item: ItemAgenda }) {
  return (
    <li
      className={s.cartao}
      style={corDa(item.frente)}
      data-meta={item.origem === "meta" || undefined}
      data-concluida={item.concluida || undefined}
      title={item.descricao ?? undefined}
    >
      <span className={s.cartaoHora}>{rotuloDaHora(item)}</span>
      <span className={s.cartaoTitulo}>{item.titulo}</span>
      <span className={s.cartaoRodape}>
        {item.rotulo}
        {item.frente ? ` · ${item.frente}` : ""}
        {item.atrasada && <span className={s.vencida}> · vencida</span>}
      </span>
    </li>
  )
}

/* --------------------------------- Semana --------------------------------- */
function Semana({ dia, hoje, frente, porDia }: { dia: string; hoje: string; frente: string | null; porDia: Map<string, ItemAgenda[]> }) {
  return (
    <div className={s.semana}>
      {semanaDe(dia).map((chave, i) => {
        const lista = porDia.get(chave) ?? []
        const ehHoje = chave === hoje
        return (
          <section key={chave} className={s.coluna} data-hoje={ehHoje || undefined} aria-label={rotuloDoDia(chave)}>
            {/* O topo da coluna abre o Dia, onde as descrições aparecem inteiras. */}
            <Link href={hrefCalendario({ visao: "dia", dia: chave, frente })} scroll={false} data-cursor-hover className={s.colunaTopo}>
              <span className={s.colunaDia}>{DIAS_DA_SEMANA[i]}{ehHoje ? " · HOJE" : ""}</span>
              <span className={s.colunaNum}>{Number(chave.slice(8, 10))}</span>
            </Link>
            {lista.length === 0 ? (
              <p className={s.colunaVazia}>—</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {lista.map((item) => <Cartao key={item.id} item={item} />)}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* ---------------------------------- Mês ----------------------------------- */
/** Quantos itens cabem numa célula antes do "+N". */
const POR_CELULA = 3

function Mes({ mes, hoje, frente, porDia }: { mes: string; hoje: string; frente: string | null; porDia: Map<string, ItemAgenda[]> }) {
  return (
    <div className={s.mes}>
      {DIAS_DA_SEMANA.map((d) => (
        <span key={d} className={s.mesCabecalho}>{d}</span>
      ))}
      {gradeDoMes(mes).map((chave) => {
        const lista = porDia.get(chave) ?? []
        return (
          <Link
            key={chave}
            href={hrefCalendario({ visao: "dia", dia: chave, frente })}
            scroll={false}
            data-cursor-hover
            className={s.mesCelula}
            data-fora={mesDaChave(chave) !== mes || undefined}
            data-hoje={chave === hoje || undefined}
            data-tem={lista.length > 0 || undefined}
            aria-label={`${diaPorExtenso(chave)} — ${lista.length === 0 ? "sem compromissos" : `${lista.length} item(ns)`}`}
          >
            <span className={s.mesNum}>{Number(chave.slice(8, 10))}</span>
            {lista.slice(0, POR_CELULA).map((item) => (
              <span key={item.id} className={s.mesChip} style={corDa(item.frente)} data-meta={item.origem === "meta" || undefined}>
                {item.hora && <span className={s.mesChipHora}>{item.hora} </span>}
                {item.titulo}
              </span>
            ))}
            {lista.length > POR_CELULA && <span className={s.mesMais}>+{lista.length - POR_CELULA} mais</span>}
          </Link>
        )
      })}
    </div>
  )
}

/* ---------------------------------- Dia ----------------------------------- */
function Dia({ itens }: { itens: ItemAgenda[] }) {
  if (itens.length === 0) {
    return <p className={s.vazio}>Nada marcado neste dia.</p>
  }
  return (
    <ol className={s.diaLista}>
      {itens.map((item) => (
        <li key={item.id} className={s.diaItem} style={corDa(item.frente)} data-meta={item.origem === "meta" || undefined}>
          <span className={s.diaHora}>{rotuloDaHora(item)}</span>
          <div className={s.diaCorpo}>
            <span className={s.diaTitulo} style={item.concluida ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
              {item.titulo}
            </span>
            <span className={s.diaMeta}>
              <span className={s.pill}>{item.frente ?? "Geral"}</span>
              <span>{item.rotulo}</span>
              {item.atrasada && <span className={s.vencida}>vencida</span>}
            </span>
            {item.descricao && <p className={s.diaDescricao}>{item.descricao}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

