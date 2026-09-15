import { inteiro, type Impacto, type Resultados } from "@/lib/metricas"

type Props = {
  resultados: Resultados
  impacto: Impacto
  /** Some os zeros: vitrine com "0 publicações" é pior que não ter o número. */
  ocultarZeros?: boolean
}

/**
 * O recorte apresentável das métricas — usado na aba Público da área de
 * membros e na vitrine de /sobre. Server Component: são números e texto, não
 * há nada para o navegador fazer aqui.
 *
 * Os campos são os mesmos que a view `metricas_publicas` (019) expõe. Se um
 * número novo entrar aqui, precisa entrar lá também, e vice-versa — a view é
 * quem decide o que é publicável.
 */
export function MetricasPublico({ resultados, impacto, ocultarZeros = false }: Props) {
  const numeros = [
    { valor: resultados.projetos_validacao_concluidos, rotulo: "Projetos concluídos" },
    { valor: resultados.competicoes_disputadas, rotulo: "Competições disputadas" },
    { valor: resultados.publicacoes_aceitas, rotulo: "Publicações aceitas" },
    { valor: resultados.publicacoes_submetidas, rotulo: "Publicações submetidas" },
    { valor: impacto.parcerias_apoio_real, rotulo: "Parcerias com apoio real" },
  ].filter((n) => !ocultarZeros || n.valor > 0)

  const colocacoes = impacto.colocacoes_competicao.filter((c) => c.edicao.trim() || c.colocacao.trim())

  if (numeros.length === 0 && colocacoes.length === 0) {
    return (
      <p className="font-sans text-sm font-light text-muted-foreground">
        Nenhum número fechado para este período ainda.
      </p>
    )
  }

  return (
    <div>
      {numeros.length > 0 && (
        <dl className="grid grid-cols-2 gap-px bg-white/10 md:grid-cols-3 lg:grid-cols-5">
          {numeros.map((n) => (
            <div key={n.rotulo} className="bg-[var(--gear-ink)] p-6">
              <dd className="font-sans text-4xl md:text-5xl font-light tracking-tight text-[var(--gear-amber)]">
                {inteiro(n.valor)}
              </dd>
              <dt className="mt-3 font-mono text-[10px] md:text-[9px] leading-snug tracking-[0.2em] uppercase text-muted-foreground">
                {n.rotulo}
              </dt>
            </div>
          ))}
        </dl>
      )}

      {colocacoes.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-3">
          {colocacoes.map((c, i) => (
            <li
              key={i}
              className="border border-[var(--gear-amber)] px-4 py-2 font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--gear-amber)]"
            >
              {c.colocacao}
              {c.edicao ? <span className="text-muted-foreground"> · {c.edicao}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
