import Link from "next/link"

import { EstadoVazio } from "@/components/membros/estado-vazio"
import { Pilula } from "@/components/membros/pilula"
import { Secao } from "@/components/membros/secao"
import { ErroDados } from "@/components/erro-dados"
import type { ErroDeDados } from "@/lib/erros"
import { hrefDoSprint } from "@/lib/administracao"
import type { ItemPrazo, PedidoDeResposta, ProximaAcao } from "@/lib/hoje"
import { aparenciaDoStatus, type Sprint } from "@/lib/sprints"
import { prazoRelativo } from "@/lib/metas"
import { formatarDuracao } from "@/lib/academia"

const linha = "flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-linha py-3"
const verMais = "font-mono text-[11px] text-[var(--gear-amber)] hover:underline"

export function BlocoAgora({ sprints, erro, rotaFrente }: { sprints: Sprint[]; erro: ErroDeDados | null; rotaFrente: string }) {
  return (
    <Secao titulo="Agora" className="mt-10">
      {erro ? (
        <ErroDados titulo="SPRINTS INDISPONÍVEIS" erro={erro}>
          Rode <code>supabase/020_sprints_responsavel_e_proximo_passo.sql</code> e{" "}
          <code>supabase/021_sprints_progresso_bloqueado_e_diario.sql</code>.
        </ErroDados>
      ) : sprints.length === 0 ? (
        <EstadoVazio href={rotaFrente} acao="Ver sprints da frente">
          Você não é responsável por nenhum sprint em aberto.
        </EstadoVazio>
      ) : (
        <ul>
          {sprints.map((s) => {
            const aparencia = aparenciaDoStatus(s.status)
            return (
              <li key={s.id} className={linha}>
                <Link href={hrefDoSprint(s.frente, s.id)} className="min-w-0 flex-1 basis-64 font-sans text-base hover:text-[var(--gear-amber)]">
                  {s.titulo}
                  <span className="block font-sans text-sm font-light text-muted-foreground">
                    {s.proximo_passo?.trim() || "Próximo passo ainda não declarado."}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <Pilula tom={s.status === "Bloqueado" ? "alerta" : "ativo"}>{s.status}</Pilula>
                  <div
                    role="progressbar"
                    aria-valuenow={s.progresso}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso de ${s.titulo}`}
                    className="h-1.5 w-20 bg-linha"
                  >
                    <div style={{ width: `${s.progresso}%` }} className={`h-full ${aparencia.barra}`} />
                  </div>
                  <span className="w-9 text-right font-mono text-xs tabular-nums">{s.progresso}%</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Secao>
  )
}

export function BlocoPrazos({
  atrasados,
  proximos,
  hoje,
  erros,
}: {
  atrasados: ItemPrazo[]
  proximos: ItemPrazo[]
  hoje: string
  erros: { titulo: string; erro: ErroDeDados; dica: string }[]
}) {
  const vazio = atrasados.length === 0 && proximos.length === 0
  return (
    <Secao titulo="Prazos dos próximos 7 dias">
      {erros.map((e) => (
        <ErroDados key={e.titulo} titulo={e.titulo} erro={e.erro} className="mb-4">
          {e.dica}
        </ErroDados>
      ))}
      {vazio ? (
        <EstadoVazio href="/membros/calendario" acao="Abrir calendário">
          Nada marcado para esta semana.
        </EstadoVazio>
      ) : (
        <ul>
          {[...atrasados, ...proximos].map((i) => (
            <li key={i.id} className={linha}>
              <Link href={i.href} className="min-w-0 flex-1 basis-64 font-sans text-base hover:text-[var(--gear-amber)]">
                {i.titulo}
                <span className="block font-sans text-sm font-light text-muted-foreground">{i.detalhe}</span>
              </Link>
              {i.dia < hoje && <Pilula tom="alerta">Atrasada</Pilula>}
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {prazoRelativo(i.dia)}
                {i.hora ? `, ${i.hora}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}

export type AvisoResumo = { id: string; titulo: string; conteudo: string; fixado: boolean }

export function BlocoAvisos({ avisos, erro }: { avisos: AvisoResumo[]; erro: ErroDeDados | null }) {
  return (
    <Secao titulo="Avisos" acoes={<Link href="/membros/mural" className={verMais}>Ver mural →</Link>}>
      {erro ? (
        <ErroDados titulo="MURAL INDISPONÍVEL" erro={erro}>
          Rode <code>supabase/008_eventos_avisos_sprints.sql</code>.
        </ErroDados>
      ) : avisos.length === 0 ? (
        <EstadoVazio>Nenhum aviso publicado.</EstadoVazio>
      ) : (
        <ul>
          {avisos.map((a) => (
            <li key={a.id} className={linha}>
              <div className="min-w-0 flex-1 basis-64">
                <p className="font-sans text-base">{a.titulo}</p>
                <p className="line-clamp-1 font-sans text-sm font-light text-muted-foreground">{a.conteudo}</p>
              </div>
              {a.fixado && <Pilula tom="ativo">Fixado</Pilula>}
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}

export type ModuloAtual = {
  titulo: string
  nivel: string
  posicao: string
  prazo: string | null
  duracao: number | null
  percentual: number
}

export function BlocoAcademia({ atual }: { atual: ModuloAtual }) {
  return (
    <Secao titulo="Academia" acoes={<Link href="/membros/aprendizagem" className={verMais}>Abrir →</Link>}>
      <p className="font-sans text-base">{atual.titulo}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {atual.nivel}, módulo {atual.posicao}
        {atual.duracao ? `, ${formatarDuracao(atual.duracao)}` : ""}
        {atual.prazo ? `, prazo ${prazoRelativo(atual.prazo)}` : ""}
      </p>
      <div
        role="progressbar"
        aria-valuenow={atual.percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso na formação"
        className="mt-3 h-1.5 w-full max-w-md bg-linha"
      >
        <div style={{ width: `${atual.percentual}%` }} className="h-full bg-[var(--gear-amber)]" />
      </div>
      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{atual.percentual}% da formação</p>
    </Secao>
  )
}

/** Votar, responder, corrigir, devolver: o que espera você fora dos sprints. Vazio, some. */
export function BlocoPedeResposta({ pedidos }: { pedidos: PedidoDeResposta[] }) {
  if (pedidos.length === 0) return null
  return (
    <Secao titulo="Esperando por você">
      <ul>
        {pedidos.map((p) => (
          <li key={p.id} className={linha}>
            <Link href={p.href} className="flex-1 font-sans text-base hover:text-[var(--gear-amber)]">
              {p.texto}
            </Link>
            <Pilula tom={p.alerta ? "alerta" : "ativo"}>{p.quantos}</Pilula>
          </li>
        ))}
      </ul>
    </Secao>
  )
}

export function BlocoPendencias({
  aprovacoes,
  bloqueados,
  registros,
  compras,
}: {
  aprovacoes: number | null
  bloqueados: number | null
  registros?: number | null
  /** undefined: quem vê não decide compras, a linha não aparece. */
  compras?: number | null
}) {
  return (
    <Secao titulo="Pendências da diretoria">
      <ul>
        <li className={linha}>
          <Link href="/membros/administracao/cargos" className="flex-1 font-sans text-base hover:text-[var(--gear-amber)]">
            Membros aguardando aprovação
          </Link>
          <Pilula tom={aprovacoes ? "alerta" : "neutro"}>{aprovacoes ?? "?"}</Pilula>
        </li>
        <li className={linha}>
          <span className="flex-1 font-sans text-base">Sprints bloqueados na entidade</span>
          <Pilula tom={bloqueados ? "alerta" : "neutro"}>{bloqueados ?? "?"}</Pilula>
        </li>
        {registros !== undefined && (
          <li className={linha}>
            <Link href="/membros/formularios" className="flex-1 font-sans text-base hover:text-[var(--gear-amber)]">
              Registros esperando aprovação
            </Link>
            <Pilula tom={registros ? "alerta" : "neutro"}>{registros ?? "?"}</Pilula>
          </li>
        )}
        {compras !== undefined && (
          <li className={linha}>
            <Link href="/membros/compras" className="flex-1 font-sans text-base hover:text-[var(--gear-amber)]">
              Pedidos de compra pendentes
            </Link>
            <Pilula tom={compras ? "alerta" : "neutro"}>{compras ?? "?"}</Pilula>
          </li>
        )}
      </ul>
    </Secao>
  )
}


/* ----------------------------------------------------------------------------
 * Destaque e números: o que a tela Hoje mostra ANTES das listas.
 * -------------------------------------------------------------------------- */

type Texto = { eyebrow: string; titulo: string; porque: string; href: string; cta: string; urgente: boolean }

/** Traduz a escolha de lib/hoje.ts em texto. A decisão é de lá; aqui é só redação. */
function redigir(acao: ProximaAcao, hoje: string, hrefSprint: (id: string) => string, rotaFrente: string): Texto {
  switch (acao.tipo) {
    case "bloqueado":
      return {
        eyebrow: "Destrave primeiro",
        titulo: acao.sprint.titulo,
        porque: "O seu sprint está bloqueado. Registre o que trava e chame a diretoria da frente: bloqueio que fica calado atrasa quem depende dele.",
        href: hrefSprint(acao.sprint.id),
        cta: "Abrir o sprint",
        urgente: true,
      }
    case "atrasada":
      return {
        eyebrow: "Atrasada",
        titulo: acao.item.titulo,
        porque: `Passou do prazo (${prazoRelativo(acao.item.dia)}). Conclua, reagende ou apague: meta vencida no quadro só ensina a ignorar o quadro.`,
        href: acao.item.href,
        cta: "Abrir metas",
        urgente: true,
      }
    case "hoje":
      return {
        eyebrow: "É hoje",
        titulo: acao.item.titulo,
        porque: `${acao.item.detalhe}${acao.item.hora ? `, às ${acao.item.hora}` : ""}.`,
        href: acao.item.href,
        cta: acao.item.origem === "evento" ? "Ver no calendário" : "Abrir metas",
        urgente: false,
      }
    case "andamento":
      return {
        eyebrow: "Em andamento",
        titulo: acao.sprint.titulo,
        porque: acao.sprint.proximo_passo?.trim()
          ? `Próximo passo: ${acao.sprint.proximo_passo.trim()}`
          : "Você ainda não declarou o próximo passo deste sprint. Escrever uma linha já destrava a semana.",
        href: hrefSprint(acao.sprint.id),
        cta: "Atualizar o sprint",
        urgente: false,
      }
    case "proximo":
      return {
        eyebrow: "Próximo da fila",
        titulo: acao.item.titulo,
        porque: `${acao.item.detalhe}, ${prazoRelativo(acao.item.dia)}${acao.item.hora ? `, às ${acao.item.hora}` : ""}.`,
        href: acao.item.href,
        cta: "Abrir",
        urgente: false,
      }
    case "modulo":
      return {
        eyebrow: "Sua formação",
        titulo: acao.titulo,
        porque: "Nada urgente hoje. É um bom momento para avançar na Academia.",
        href: "/membros/aprendizagem",
        cta: "Continuar o módulo",
        urgente: false,
      }
    default:
      return {
        eyebrow: "Tudo em dia",
        titulo: "Nada pede você agora.",
        porque: "Sem sprint em aberto, sem prazo na semana e sem atraso. Se há trabalho a fazer, ele ainda não está no quadro da frente.",
        href: rotaFrente,
        cta: "Ver o quadro da frente",
        urgente: false,
      }
  }
}

export function ProximaAcaoCard({
  acao,
  hoje,
  hrefSprint,
  rotaFrente,
}: {
  acao: ProximaAcao
  hoje: string
  hrefSprint: (id: string) => string
  rotaFrente: string
}) {
  const t = redigir(acao, hoje, hrefSprint, rotaFrente)
  return (
    <section
      aria-labelledby="proxima-acao"
      className={`border border-linha-forte bg-[var(--gear-navy)]/50 p-5 md:p-7 ${
        t.urgente ? "border-l-4 border-l-[var(--gear-amber)]" : "border-l-4 border-l-linha-forte"
      }`}
    >
      <p
        className={`font-mono text-[10px] tracking-[0.25em] uppercase ${
          t.urgente ? "text-[var(--gear-amber)]" : "text-muted-foreground"
        }`}
      >
        {t.eyebrow}
      </p>
      <h2 id="proxima-acao" className="mt-2 font-sans text-2xl font-normal leading-snug tracking-tight text-balance md:text-3xl">
        {t.titulo}
      </h2>
      <p className="mt-3 max-w-[60ch] font-sans text-sm font-light leading-relaxed text-muted-foreground md:text-base">{t.porque}</p>
      <Link
        href={t.href}
        className="mt-5 inline-flex min-h-11 items-center border border-[var(--gear-amber)] bg-[var(--gear-amber)] px-6 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--gear-ink)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--gear-amber)]"
      >
        {t.cta} →
      </Link>
    </section>
  )
}

export type Numero = { rotulo: string; valor: string; href: string; alerta?: boolean }

export function FaixaNumeros({ itens }: { itens: Numero[] }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-px border border-linha bg-linha md:grid-cols-4">
      {itens.map((n) => (
        <li key={n.rotulo} className="bg-[var(--gear-ink)]">
          <Link href={n.href} className="block min-h-11 p-4 transition-colors duration-200 hover:bg-[var(--gear-navy)]/60">
            <span
              className={`block font-sans text-3xl font-light tabular-nums ${
                n.alerta ? "text-[var(--gear-amber)]" : ""
              }`}
            >
              {n.valor}
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{n.rotulo}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
