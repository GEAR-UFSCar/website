"use client"

import { SprintStatus } from "@/components/sprint-status"
import { SprintProgresso } from "@/components/sprint-progresso"
import { SprintDiario } from "@/components/sprint-diario"
import { iniciais } from "@/lib/administracao"
import { dataLonga } from "@/lib/datas"
import { aparenciaDoStatus, type Atualizacao, type Sprint } from "@/lib/sprints"

type Props = {
  sprint: Sprint
  atualizacoes: Atualizacao[]
  /** Espelha pode_editar_sprint() (021): diretoria, ou cargo na mesma frente. */
  podeEscrever: boolean
  usuarioId: string
}

/** data_inicio/data_fim são DATE puro: parsear como local evita cair um dia. */
const dataSimples = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number)
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Um sprint como cartão: quem toca, em que pé está, o que vem a seguir e o
 * que andou até aqui.
 *
 * É Client Component porque vive dentro do quadro filtrável — o filtro roda no
 * navegador, então os cartões que ele monta e desmonta também. Os dados já
 * vieram prontos do servidor; aqui não há consulta nenhuma até alguém editar.
 */
export function SprintCartao({ sprint, atualizacoes, podeEscrever, usuarioId }: Props) {
  const aparencia = aparenciaDoStatus(sprint.status)
  const responsavel = sprint.responsavel?.nome_completo?.trim()

  return (
    <article className="border border-white/10 bg-[var(--gear-navy)] p-6 md:p-8">
      {/* Cabeçalho: quem toca, à esquerda; em que pé está, à direita. */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 font-mono text-[11px] text-muted-foreground"
          >
            {iniciais(sprint.responsavel?.nome_completo)}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
              Responsável
            </p>
            <p className="font-sans text-sm font-light break-words">
              {/* sem responsável é estado real (020), e a tela diz isso */}
              {responsavel || "Ainda sem responsável"}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase ${aparencia.badge}`}
        >
          {sprint.status}
        </span>
      </header>

      <h3 className="mt-6 font-sans text-xl md:text-2xl font-light leading-snug text-balance">
        {sprint.titulo}
      </h3>

      <p className="mt-3 max-w-[70ch] font-sans text-sm font-light leading-relaxed text-muted-foreground whitespace-pre-line">
        {sprint.descricao}
      </p>

      {/* Barra de progresso */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Progresso
          </p>
          <p className="font-mono text-[11px] tabular-nums text-foreground">{sprint.progresso}%</p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={sprint.progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso de ${sprint.titulo}`}
          className="mt-2 h-2 w-full bg-white/10"
        >
          {/*
            O preenchimento muda de tratamento com o status (lib/sprints.ts):
            bloqueado sai listrado, porque uma barra cheia e lisa em cima de um
            sprint parado conta a metade boa da história.
          */}
          <div
            style={{ width: `${sprint.progresso}%` }}
            className={`h-full transition-[width] duration-500 ${aparencia.barra}`}
          />
        </div>
      </div>

      {/* Caixa PRÓXIMO PASSO */}
      <div className="mt-6 border-l-2 border-[var(--gear-amber)] bg-[var(--gear-ink)] p-4">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gear-amber)]">
          Próximo passo
        </p>
        <p className="mt-2 max-w-[70ch] font-sans text-sm font-light leading-relaxed">
          {sprint.proximo_passo?.trim() || "Ainda não declarado."}
        </p>
      </div>

      <p className="mt-5 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
        {sprint.data_inicio ? dataSimples(sprint.data_inicio) : "sem início"}
        {" → "}
        {sprint.data_fim ? dataSimples(sprint.data_fim) : "sem fim"}
        {" · "}
        Atualizado em {dataLonga(sprint.updated_at)}
      </p>

      {/* Controles de quem tem cargo na frente. Ficam juntos e rotulados. */}
      {podeEscrever && (
        <div className="mt-5 flex flex-wrap items-start gap-5 border-t border-white/10 pt-5">
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Mudar status
            </p>
            <div className="w-44">
              <SprintStatus id={sprint.id} valor={sprint.status} usuarioId={usuarioId} />
            </div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Mudar progresso
            </p>
            <SprintProgresso id={sprint.id} valor={sprint.progresso} />
          </div>
        </div>
      )}

      <SprintDiario
        sprintId={sprint.id}
        atualizacoes={atualizacoes}
        podeEscrever={podeEscrever}
      />
    </article>
  )
}
