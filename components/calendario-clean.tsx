import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Repeat, Search } from "lucide-react"

import { FRENTES, TIPOS_EVENTO } from "@/lib/administracao"
import {
  CAMADAS,
  DIAS_DA_SEMANA,
  ROTULO_DA_CAMADA,
  ROTULO_DA_VISAO,
  VISOES,
  agruparPorDia,
  comEstado,
  deslocarDia,
  deslocarMes,
  diasEntre,
  gradeDoMes,
  mesDaChave,
  rotuloDaSemana,
  rotuloDoDia,
  rotuloDoMes,
  semanaDe,
  diaPorExtenso,
  type EstadoCalendario,
  type ItemAgenda,
  type Visao,
} from "@/lib/agenda"
import { janelaDeHoras, empilhar, diaCompleto, diaDaSemana, partesGear, rotuloDeMinutos, ROTULO_PRESENCA } from "@/lib/calendario"
import { CalendarioAtalhos } from "@/components/calendario-atalhos"
import { AgoraLinha, RolarParaAgora } from "@/components/calendario-agora"
import s from "./calendario-clean.module.css"

export type Prazo = {
  id: string
  titulo: string
  /** "YYYY-MM-DD" em Brasília. */
  dia: string
  /** "Prazo do GEAR" ou "Sua meta". */
  rotulo: string
  frente: string | null
  href: string
}

type Props = {
  estado: EstadoCalendario
  hoje: string
  /** Itens da janela mostrada, já filtrados e ordenados. */
  itens: ItemAgenda[]
  /** Dias do mês de `estado.dia` com algum compromisso — os pontinhos do mini-calendário. */
  marcados: Set<string>
  prazos: Prazo[]
  /** "Bom dia, Michael". */
  saudacao: string
  podeCriarEvento: boolean
  painelAberto: boolean
  /** Quantos dias a Agenda cobre (só o texto do vazio precisa). */
  diasDaAgenda: number
  /** Bloco "Assinar no meu calendário", montado pela página (precisa do token). */
  assinatura: ReactNode
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

const LETRAS = ["S", "T", "Q", "Q", "S", "S", "D"]

/** Altura de uma hora na grade, em px. Também está no CSS (--hora-px) via estilo inline. */
const PX_HORA = 56

/** "hoje", "amanhã", "ontem", "em 3 dias", "há 2 dias". */
function relativo(dia: string, hoje: string) {
  const n = diasEntre(hoje, dia)
  if (n === 0) return "hoje"
  if (n === 1) return "amanhã"
  if (n === -1) return "ontem"
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`
}

/**
 * Calendário de membros: lateral com mini-calendário e filtros, e área
 * principal com prazos em contagem regressiva e as visões Semana, Dia, Mês e
 * Agenda (lista).
 *
 * Server Component: visão, dia e todos os filtros vivem na URL (ver
 * hrefCalendario), e cada clique é um Link. Assim a página busca no servidor só
 * o que vai desenhar, o "hoje" é sempre o de Brasília, e a semana pode ser
 * mandada no grupo. O que precisa de navegador é folha pequena: a linha do
 * "agora", o teclado, a presença e a assinatura.
 */
export function CalendarioClean({
  estado, hoje, itens, marcados, prazos, saudacao, podeCriarEvento, painelAberto, diasDaAgenda, assinatura,
}: Props) {
  const { visao, dia, frente, tipo, q, meu } = estado
  const href = comEstado(estado)
  const mes = mesDaChave(dia)

  const titulo = q
    ? `Resultados para “${q}”`
    : visao === "mes"
      ? rotuloDoMes(mes)
      : visao === "semana"
        ? rotuloDaSemana(dia)
        : visao === "dia"
          ? rotuloDoDia(dia)
          : `A partir de ${diaPorExtenso(dia)}`

  const passo = (sentido: 1 | -1) =>
    visao === "mes"
      ? href({ dia: `${deslocarMes(mes, sentido)}-01` })
      : href({ dia: deslocarDia(dia, visao === "semana" ? 7 * sentido : visao === "agenda" ? 30 * sentido : sentido) })

  const hrefHoje = href({ dia: hoje, q: null })
  const novoHref = podeCriarEvento ? href({ novo: true }) : null
  const filtrosAtivos = Boolean(frente || tipo || q || meu || estado.sem?.length)

  return (
    <div className={s.raiz}>
      <CalendarioAtalhos
        hrefs={{
          hoje: hrefHoje,
          anterior: passo(-1),
          proximo: passo(1),
          semana: href({ visao: "semana" }),
          dia: href({ visao: "dia" }),
          mes: href({ visao: "mes" }),
          agenda: href({ visao: "agenda" }),
          novo: novoHref,
          fechar: painelAberto ? href() : null,
        }}
      />

      {/* ------------------------------ LATERAL ------------------------------ */}
      <aside className={s.lateral}>
        <div className={s.acoes}>
          {novoHref && (
            <Link href={novoHref} scroll={false} className={`${s.botaoPrimario} ${s.soComputador}`} data-cursor-hover>
              <Plus size={16} aria-hidden="true" /> Novo evento
            </Link>
          )}
          <Link
            href="/membros/metas?nova=1"
            className={novoHref ? s.botaoSecundario : s.botaoPrimario}
            data-cursor-hover
          >
            <Plus size={16} aria-hidden="true" /> Nova meta
          </Link>
        </div>

        <MiniCalendario estado={estado} hoje={hoje} marcados={marcados} />

        <nav aria-label="Filtrar por frente">
          <p className={s.secaoTitulo}>Frentes</p>
          <div className={s.filtros}>
            <Link href={href({ frente: null })} scroll={false} data-cursor-hover aria-current={!frente ? "true" : undefined} className={s.filtro} style={corDa(null)}>
              <span className={s.filtroPonto} aria-hidden="true" /> Todas
            </Link>
            {FRENTES.map((f) => (
              <Link key={f} href={href({ frente: f })} scroll={false} data-cursor-hover aria-current={frente === f ? "true" : undefined} className={s.filtro} style={corDa(f)}>
                <span className={s.filtroPonto} aria-hidden="true" /> {f}
              </Link>
            ))}
          </div>
          {/* Reunião geral é da entidade inteira: some do filtro e a pessoa acha que não tem reunião. */}
          {frente && <p className={s.filtroDica}>Eventos gerais continuam aparecendo.</p>}
        </nav>

        <nav aria-label="Filtrar por tipo de evento">
          <p className={s.secaoTitulo}>Tipo de evento</p>
          <div className={s.filtros}>
            <Link href={href({ tipo: null })} scroll={false} data-cursor-hover aria-current={!tipo ? "true" : undefined} className={s.filtro}>
              Todos
            </Link>
            {TIPOS_EVENTO.map((t) => (
              <Link key={t} href={href({ tipo: t })} scroll={false} data-cursor-hover aria-current={tipo === t ? "true" : undefined} className={s.filtro}>
                {t}
              </Link>
            ))}
          </div>
          {tipo && <p className={s.filtroDica}>Metas, sprints e Academia ficam de fora enquanto houver um tipo escolhido.</p>}
        </nav>

        <nav aria-label="O que aparece no calendário">
          <p className={s.secaoTitulo}>Mostrar</p>
          <div className={s.filtros}>
            <Link href={href({ meu: !meu })} scroll={false} data-cursor-hover aria-pressed={meu} role="button" className={s.filtro} data-ativo={meu || undefined}>
              <span className={s.caixa} aria-hidden="true" data-marcada={meu || undefined} /> Só o meu
            </Link>
            {CAMADAS.map((c) => {
              const escondida = estado.sem?.includes(c) ?? false
              const sem = escondida ? (estado.sem ?? []).filter((x) => x !== c) : [...(estado.sem ?? []), c]
              return (
                <Link key={c} href={href({ sem })} scroll={false} data-cursor-hover aria-pressed={!escondida} role="button" className={s.filtro} data-ativo={!escondida || undefined}>
                  <span className={s.caixa} aria-hidden="true" data-marcada={!escondida || undefined} /> {ROTULO_DA_CAMADA[c]}
                </Link>
              )
            })}
          </div>
          {meu && <p className={s.filtroDica}>Eventos a que você respondeu “vou” ou “talvez”, suas metas e seus sprints.</p>}
        </nav>

        <div className={s.legenda}>
          <p className={s.secaoTitulo}>Legenda</p>
          <span><span className={s.amostraEvento} aria-hidden="true" /> Evento do GEAR</span>
          <span><span className={s.amostraMeta} aria-hidden="true" /> Meta (sua ou pública)</span>
          <span><span className={s.amostraSprint} aria-hidden="true" /> Sprint (início e entrega)</span>
          <span><span className={s.amostraModulo} aria-hidden="true" /> Prazo de módulo</span>
        </div>

        <details className={s.assina}>
          <summary className={s.secaoTitulo}>Assinar no meu calendário</summary>
          {assinatura}
        </details>

        <div className={s.atalhos}>
          <p className={s.secaoTitulo}>Atalhos</p>
          <p>
            <kbd>T</kbd> hoje · <kbd>←</kbd> <kbd>→</kbd> período · <kbd>S</kbd> <kbd>D</kbd> <kbd>M</kbd> <kbd>A</kbd> visão ·{" "}
            {podeCriarEvento && <><kbd>N</kbd> novo · </>}
            <kbd>/</kbd> busca · <kbd>Esc</kbd> fecha
          </p>
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
            {/* No celular a lateral desce para o fim da página; as ações principais sobem para cá. */}
            {novoHref && (
              <Link href={novoHref} scroll={false} className={`${s.botaoPrimario} ${s.soCelular}`} data-cursor-hover>
                <Plus size={16} aria-hidden="true" /> Novo evento
              </Link>
            )}
            <div className={s.navData}>
              <Link href={passo(-1)} scroll={false} data-cursor-hover aria-label="Período anterior" className={s.iconeBotao}>
                <ChevronLeft size={16} aria-hidden="true" />
              </Link>
              <Link href={hrefHoje} scroll={false} data-cursor-hover className={s.botaoHoje}>
                Hoje
              </Link>
              <Link href={passo(1)} scroll={false} data-cursor-hover aria-label="Próximo período" className={s.iconeBotao}>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <nav aria-label="Visão do calendário" className={s.abas}>
              {VISOES.map((v) => (
                <Link key={v} href={href({ visao: v, q: v === "agenda" ? q : null })} scroll={false} data-cursor-hover aria-current={v === visao ? "page" : undefined} className={s.aba}>
                  {ROTULO_DA_VISAO[v]}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <form action="/membros/calendario" method="get" role="search" className={s.busca}>
          <Search size={16} aria-hidden="true" className={s.buscaIcone} />
          <input
            id="busca-calendario"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            maxLength={80}
            placeholder="Buscar em eventos, metas e sprints (tecla /)"
            aria-label="Buscar no calendário"
            className={s.buscaCampo}
          />
          <input type="hidden" name="visao" value="agenda" />
          <input type="hidden" name="dia" value={dia} />
          {frente && <input type="hidden" name="frente" value={frente} />}
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          {meu && <input type="hidden" name="meu" value="1" />}
          {estado.sem?.length ? <input type="hidden" name="sem" value={estado.sem.join(",")} /> : null}
          <button type="submit" className={s.buscaBotao} data-cursor-hover>Buscar</button>
          {filtrosAtivos && (
            <Link href={href({ frente: null, tipo: null, q: null, meu: false, sem: [] })} scroll={false} className={s.buscaLimpar} data-cursor-hover>
              Limpar filtros
            </Link>
          )}
        </form>

        {prazos.length > 0 && !q && <Prazos prazos={prazos} hoje={hoje} />}

        {visao === "semana" && (
          <>
            <div className={s.soGrande}>
              <GradeHoras dias={semanaDe(dia)} itens={itens} hoje={hoje} estado={estado} />
            </div>
            <div className={s.soPequeno}>
              <ListaAgenda dias={semanaDe(dia)} itens={itens} hoje={hoje} estado={estado} mostrarVazios />
            </div>
          </>
        )}
        {visao === "dia" && <GradeHoras dias={[dia]} itens={itens} hoje={hoje} estado={estado} />}
        {visao === "mes" && <Mes mes={mes} hoje={hoje} estado={estado} itens={itens} />}
        {visao === "agenda" && (
          <ListaAgenda
            dias={[...new Set(itens.map((i) => i.dia))]}
            itens={itens}
            hoje={hoje}
            estado={estado}
            vazio={q ? `Nada encontrado para “${q}”.` : `Nada marcado nos próximos ${diasDaAgenda} dias${filtrosAtivos ? " com estes filtros" : ""}.`}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------------------- Link de cada item ---------------------------- */
/** Evento abre o painel; meta, sprint e módulo levam à página deles. */
function hrefDoItem(item: ItemAgenda, estado: EstadoCalendario) {
  if (item.origem === "evento" && item.eventoId) {
    return comEstado(estado)({ evento: item.eventoId, ocorrencia: item.ocorrencia ?? item.dia })
  }
  return item.href ?? "/membros/calendario"
}

function rotuloAcessivel(item: ItemAgenda) {
  const quando = item.horario ?? (item.origem === "evento" ? "dia inteiro" : "prazo do dia")
  const resposta = item.resposta ? `, você respondeu: ${ROTULO_PRESENCA[item.resposta]}` : ""
  return `${item.titulo}, ${item.rotulo}, ${diaCompleto(item.dia)}, ${quando}${resposta}`
}

/* ------------------------------ Mini-calendário ----------------------------- */
function MiniCalendario({ estado, hoje, marcados }: { estado: EstadoCalendario; hoje: string; marcados: Set<string> }) {
  const { visao, dia } = estado
  const href = comEstado(estado)
  const mes = mesDaChave(dia)
  const semana = visao === "semana" ? new Set(semanaDe(dia)) : new Set<string>()
  // No mês, clicar num dia abre o Dia; nas outras visões, mantém a visão e muda o dia.
  const destino: Visao = visao === "mes" ? "dia" : visao

  return (
    <div className={s.mini} data-visao={visao}>
      <div className={s.miniTopo}>
        <span className={s.miniTitulo}>{rotuloDoMes(mes)}</span>
        <div className={s.setas}>
          <Link href={href({ dia: `${deslocarMes(mes, -1)}-01` })} scroll={false} data-cursor-hover aria-label="Mês anterior" className={s.iconeBotao}>
            <ChevronLeft size={16} aria-hidden="true" />
          </Link>
          <Link href={href({ dia: `${deslocarMes(mes, 1)}-01` })} scroll={false} data-cursor-hover aria-label="Próximo mês" className={s.iconeBotao}>
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
            href={href({ visao: destino, dia: chave })}
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
            <span className={s.miniPonto} data-ativo={marcados.has(chave) || undefined} aria-hidden="true" />
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
          <li key={p.id}>
            <Link href={p.href} scroll={false} className={s.prazo} style={estilo} data-cursor-hover>
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
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------ Chip (dia inteiro) ------------------------- */
function Chip({ item, estado, className }: { item: ItemAgenda; estado: EstadoCalendario; className: string }) {
  return (
    <Link
      href={hrefDoItem(item, estado)}
      scroll={false}
      data-cursor-hover
      className={className}
      style={corDa(item.frente)}
      data-origem={item.origem}
      data-concluida={item.concluida || undefined}
      data-atrasada={item.atrasada || undefined}
      data-resposta={item.resposta ?? undefined}
      aria-label={rotuloAcessivel(item)}
      title={item.rotulo}
    >
      {item.hora && <span className={s.chipHora}>{item.hora} </span>}
      {item.repete && <Repeat size={10} aria-hidden="true" className={s.chipRepete} />}
      {item.titulo}
    </Link>
  )
}

/**
 * O que o bloco diz sobre horário. Evento que atravessa a meia-noite aparece em
 * dois dias, e cada pedaço fala só do que acontece NAQUELE dia ("22:00 →",
 * "até 02:00"); o intervalo completo fica no painel.
 */
function horarioNoBloco(item: ItemAgenda) {
  const ini = rotuloDeMinutos(item.inicioMin as number)
  const fim = rotuloDeMinutos(item.fimMin as number)
  if (item.continuaDeOntem && item.continuaAmanha) return "continua"
  if (item.continuaDeOntem) return `até ${fim}`
  if (item.continuaAmanha) return `${ini} →`
  return item.semFim ? ini : `${ini}–${fim}`
}

/* ------------------------------ Grade de horas ----------------------------- */
/**
 * Semana (7 colunas) e Dia (1 coluna) na mesma grade, como no Google Agenda:
 * faixa do dia inteiro em cima, horas embaixo, e eventos que se sobrepõem lado
 * a lado. A faixa horária se estica se algum evento cai antes das 7h ou depois
 * das 22h — nada fica fora da tela.
 */
function GradeHoras({
  dias, itens, hoje, estado,
}: { dias: string[]; itens: ItemAgenda[]; hoje: string; estado: EstadoCalendario }) {
  const href = comEstado(estado)
  const doPeriodo = new Set(dias)
  const visiveis = itens.filter((i) => doPeriodo.has(i.dia))
  const porDia = agruparPorDia(visiveis)

  const comHora = visiveis.filter((i) => i.inicioMin != null && i.fimMin != null)
  const { de, ate } = janelaDeHoras(comHora.map((i) => ({ id: i.id, inicio: i.inicioMin as number, fim: i.fimMin as number })))
  const horas = ate - de
  const altura = horas * PX_HORA

  // Para onde a rolagem inicial vai: agora (se a janela mostra hoje) ou o primeiro evento do período.
  const temHoje = dias.includes(hoje)
  const primeiro = comHora.reduce<number | null>((m, i) => (m == null || (i.inicioMin as number) < m ? (i.inicioMin as number) : m), null)
  // "Agora" só serve de alvo se cair dentro das horas desenhadas; às 23h numa grade que acaba às 22h, vale o primeiro evento.
  const agoraMin = partesGear(new Date().toISOString()).minutos
  const alvoMin = temHoje && agoraMin >= de * 60 && agoraMin <= ate * 60 ? agoraMin : (primeiro ?? 8 * 60)

  const colunas = dias.length
  const estiloGrade = { "--colunas": colunas, "--hora-px": `${PX_HORA}px` } as CSSProperties

  return (
    <div className={s.grade} style={estiloGrade} data-colunas={colunas}>
      <div className={s.gradeCabecalho}>
        <span className={s.gradeCanto} aria-hidden="true" />
        {dias.map((chave) => {
          const ehHoje = chave === hoje
          const nome = colunas === 1 ? rotuloDoDia(chave).split(",")[0] : DIAS_DA_SEMANA[(diaDaSemana(chave) + 6) % 7]
          return (
            <Link
              key={chave}
              href={href({ visao: "dia", dia: chave })}
              scroll={false}
              data-cursor-hover
              className={s.gradeDiaTopo}
              data-hoje={ehHoje || undefined}
              aria-label={diaCompleto(chave)}
              aria-current={ehHoje ? "date" : undefined}
            >
              <span className={s.gradeDiaNome}>{nome}{ehHoje ? " · HOJE" : ""}</span>
              <span className={s.gradeDiaNum}>{Number(chave.slice(8, 10))}</span>
              {colunas === 1 && <span className={s.gradeDiaNome}>{diaPorExtenso(chave).replace(/^\d+ de /, "")}</span>}
            </Link>
          )
        })}
      </div>

      <div className={s.gradeInteiro}>
        <span className={s.gradeCanto}>dia todo</span>
        {dias.map((chave) => {
          const lista = (porDia.get(chave) ?? []).filter((i) => i.inicioMin == null)
          const limite = colunas === 1 ? lista.length : 3
          return (
            <div key={chave} className={s.gradeInteiroCelula} data-hoje={chave === hoje || undefined}>
              {lista.slice(0, limite).map((item) => (
                <Chip key={item.id} item={item} estado={estado} className={s.chip} />
              ))}
              {lista.length > limite && (
                <Link href={href({ visao: "dia", dia: chave })} scroll={false} className={s.mesMais} data-cursor-hover>
                  +{lista.length - limite} mais
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* data-lenis-prevent: a rolagem suave da página não pode roubar a roda do mouse daqui. */}
      <div className={s.gradeCorpo} data-grade-corpo data-lenis-prevent tabIndex={0} aria-label="Horários do período">
        <RolarParaAgora alvoMin={alvoMin} de={de} pxPorHora={PX_HORA} />
        <div className={s.gradeHoras} style={{ height: altura }} aria-hidden="true">
          {Array.from({ length: horas }, (_, i) => (
            <span key={i} className={s.gradeHora} style={{ top: i * PX_HORA }}>
              {String(de + i).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {dias.map((chave) => {
          const lista = (porDia.get(chave) ?? []).filter((i) => i.inicioMin != null && i.fimMin != null)
          const posto = new Map(
            empilhar(lista.map((i) => ({ id: i.id, inicio: i.inicioMin as number, fim: i.fimMin as number }))).map((p) => [p.id, p]),
          )
          return (
            <div key={chave} className={s.gradeColuna} style={{ height: altura }} data-hoje={chave === hoje || undefined}>
              {lista.map((item) => {
                const p = posto.get(item.id)
                const topo = ((item.inicioMin as number) - de * 60) * (PX_HORA / 60)
                const h = Math.max(22, ((item.fimMin as number) - (item.inicioMin as number)) * (PX_HORA / 60) - 2)
                const larg = 100 / (p?.colunas ?? 1)
                return (
                  <Link
                    key={item.id}
                    href={hrefDoItem(item, estado)}
                    scroll={false}
                    data-cursor-hover
                    className={s.bloco}
                    style={{ ...corDa(item.frente), top: topo, height: h, left: `${(p?.coluna ?? 0) * larg}%`, width: `calc(${larg}% - 3px)` }}
                    data-curto={h < 44 || undefined}
                    data-resposta={item.resposta ?? undefined}
                    data-continua-ontem={item.continuaDeOntem || undefined}
                    data-continua-amanha={item.continuaAmanha || undefined}
                    aria-label={rotuloAcessivel(item)}
                  >
                    <span className={s.blocoHora}>
                      {item.repete && <Repeat size={10} aria-hidden="true" />} {horarioNoBloco(item)}
                    </span>
                    <span className={s.blocoTitulo}>{item.titulo}</span>
                    {item.local && <span className={s.blocoLocal}>{item.local}</span>}
                  </Link>
                )
              })}
              {chave === hoje && <AgoraLinha de={de} pxPorHora={PX_HORA} horas={horas} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------------------------- Mês ----------------------------------- */
/** Quantos itens cabem numa célula antes do "+N". */
const POR_CELULA = 3

function Mes({ mes, hoje, estado, itens }: { mes: string; hoje: string; estado: EstadoCalendario; itens: ItemAgenda[] }) {
  const href = comEstado(estado)
  const porDia = agruparPorDia(itens)
  return (
    <div className={s.mes}>
      {DIAS_DA_SEMANA.map((d) => (
        <span key={d} className={s.mesCabecalho}>{d}</span>
      ))}
      {gradeDoMes(mes).map((chave) => {
        const lista = porDia.get(chave) ?? []
        return (
          <div
            key={chave}
            className={s.mesCelula}
            data-fora={mesDaChave(chave) !== mes || undefined}
            data-hoje={chave === hoje || undefined}
            data-tem={lista.length > 0 || undefined}
          >
            {/* A área do número cobre a célula toda (::after); os chips ficam por cima. */}
            <Link
              href={href({ visao: "dia", dia: chave })}
              scroll={false}
              data-cursor-hover
              className={s.mesNum}
              aria-label={`${diaPorExtenso(chave)} — ${lista.length === 0 ? "sem compromissos" : `${lista.length} item(ns)`}`}
            >
              {Number(chave.slice(8, 10))}
            </Link>
            {lista.slice(0, POR_CELULA).map((item) => (
              <Chip key={item.id} item={item} estado={estado} className={s.mesChip} />
            ))}
            {lista.length > POR_CELULA && (
              <Link href={href({ visao: "dia", dia: chave })} scroll={false} className={s.mesMais} data-cursor-hover>
                +{lista.length - POR_CELULA} mais
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------------------------------- Lista ---------------------------------- */
/** "Prazo" para o que vale o dia todo, o horário para o que tem hora, "Dia inteiro" para evento sem hora. */
function rotuloDaLinha(item: ItemAgenda) {
  if (item.horario) return item.horario
  if (item.origem === "sprint") return "Sprint"
  return "Prazo"
}

/**
 * Lista por dia: é a visão "Agenda" e também o que a Semana vira no celular,
 * onde sete colunas de horas não cabem. `mostrarVazios` mantém os dias sem
 * compromisso (na semana, saber que quinta está livre também é informação).
 */
function ListaAgenda({
  dias, itens, hoje, estado, mostrarVazios = false, vazio,
}: { dias: string[]; itens: ItemAgenda[]; hoje: string; estado: EstadoCalendario; mostrarVazios?: boolean; vazio?: string }) {
  const porDia = agruparPorDia(itens)
  const lista = mostrarVazios ? dias : dias.filter((d) => porDia.has(d))

  if (lista.length === 0) return <p className={s.vazio}>{vazio ?? "Nada marcado."}</p>

  return (
    <div className={s.agenda}>
      {lista.map((chave) => {
        const doDia = porDia.get(chave) ?? []
        return (
          <section key={chave} className={s.agendaDia} data-hoje={chave === hoje || undefined} aria-label={diaCompleto(chave)}>
            <h3 className={s.agendaTitulo}>
              {diaCompleto(chave)}
              <span className={s.agendaRelativo}>{relativo(chave, hoje)}</span>
            </h3>
            {doDia.length === 0 ? (
              <p className={s.colunaVazia}>Sem compromissos.</p>
            ) : (
              <ul className={s.agendaLista}>
                {doDia.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={hrefDoItem(item, estado)}
                      scroll={false}
                      data-cursor-hover
                      className={s.linha}
                      style={corDa(item.frente)}
                      data-origem={item.origem}
                      data-concluida={item.concluida || undefined}
                      aria-label={rotuloAcessivel(item)}
                    >
                      <span className={s.linhaHora}>{rotuloDaLinha(item)}</span>
                      <span className={s.linhaBarra} aria-hidden="true" />
                      <span className={s.linhaCorpo}>
                        <span className={s.linhaTitulo}>
                          {item.repete && <Repeat size={12} aria-hidden="true" />} {item.titulo}
                        </span>
                        <span className={s.linhaMeta}>
                          {item.rotulo}
                          {item.frente ? ` · ${item.frente}` : ""}
                          {item.local ? ` · ${item.local}` : ""}
                          {item.atrasada && <span className={s.vencida}> · vencida</span>}
                        </span>
                      </span>
                      {item.resposta && (
                        <span className={s.linhaResposta} data-resposta={item.resposta}>
                          {ROTULO_PRESENCA[item.resposta]}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
