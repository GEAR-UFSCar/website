import Link from "next/link"

import { EstadoVazio } from "@/components/membros/estado-vazio"
import { Pilula } from "@/components/membros/pilula"
import { Secao } from "@/components/membros/secao"
import { ErroDados } from "@/components/erro-dados"
import type { ErroDeDados } from "@/lib/erros"
import type { ItemPrazo } from "@/lib/hoje"
import { aparenciaDoStatus, type Sprint } from "@/lib/sprints"
import { prazoRelativo } from "@/lib/metas"
import { formatarDuracao } from "@/lib/academia"

const linha = "flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-linha py-3"
const verMais = "font-mono text-[11px] text-[var(--gear-amber)] hover:underline"

export function BlocoAgora({ sprints, erro, rotaFrente }: { sprints: Sprint[]; erro: ErroDeDados | null; rotaFrente: string }) {
  return (
    <Secao titulo="Agora" className="mt-0">
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
                <Link href={`${rotaFrente}#sprint-${s.id}`} className="min-w-0 flex-1 basis-64 font-sans text-base hover:text-[var(--gear-amber)]">
                  {s.titulo}
                  <span className="block font-sans text-sm font-light text-muted-foreground">
                    {s.proximo_passo?.trim() || "Próximo passo ainda não declarado."}
                  </span>
                </Link>
                <Pilula tom={s.status === "Bloqueado" ? "alerta" : "ativo"}>{s.status}</Pilula>
                <div
                  role="progressbar"
                  aria-valuenow={s.progresso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso de ${s.titulo}`}
                  className="h-1.5 w-28 bg-linha"
                >
                  <div style={{ width: `${s.progresso}%` }} className={`h-full ${aparencia.barra}`} />
                </div>
                <span className="w-10 text-right font-mono text-xs tabular-nums">{s.progresso}%</span>
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

export function BlocoPendencias({ aprovacoes, bloqueados }: { aprovacoes: number | null; bloqueados: number | null }) {
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
      </ul>
    </Secao>
  )
}
