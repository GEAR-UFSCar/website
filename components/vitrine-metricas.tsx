import { createClientePublico } from "@/lib/supabase/publico"
import { MetricasPublico } from "@/components/metricas-publico"
import { Surge } from "@/components/surge"
import {
  normalizarImpacto,
  normalizarResultados,
  type Impacto,
  type Resultados,
} from "@/lib/metricas"

/*
 * Vitrine pública dos números do período aberto.
 *
 * Lê a VIEW `metricas_publicas` (019), nunca a tabela: a view é o recorte que
 * alguém decidiu publicar, campo por campo, e é ela que atravessa a RLS. Ler
 * `metricas_periodo` daqui exigiria abrir a tabela inteira para anônimo, que é
 * exatamente o que a view existe para evitar.
 *
 * Silêncio é a falha correta: sem a 019 aplicada, sem período aberto ou sem
 * número nenhum preenchido, a seção não renderiza. Uma página pública não
 * mostra a um visitante que falta rodar migração — e uma vitrine de zeros é
 * pior que vitrine nenhuma.
 */
export async function VitrineMetricas() {
  // Cliente sem cookies: é o que deixa /sobre continuar estática com ISR.
  const supabase = createClientePublico()

  const { data, error } = await supabase
    .from("metricas_publicas")
    .select("periodo, frente, projetos_concluidos, competicoes_disputadas, publicacoes_aceitas, publicacoes_submetidas, parcerias, colocacoes")
    .is("frente", null)
    .order("periodo", { ascending: false })
    .limit(1)

  if (error || !data?.length) return null

  const linha = data[0] as Record<string, unknown>

  /*
   * A view devolve cada indicador como jsonb solto (`resultados -> 'campo'`),
   * então aqui eles voltam a ser os objetos que MetricasPublico espera — e
   * passam pelo mesmo normalizador do resto do sistema, que é o que garante
   * que um campo ausente vire 0 em vez de "NaN" na tela.
   */
  const resultados: Resultados = normalizarResultados({
    projetos_validacao_concluidos: linha.projetos_concluidos,
    competicoes_disputadas: linha.competicoes_disputadas,
    publicacoes_aceitas: linha.publicacoes_aceitas,
    publicacoes_submetidas: linha.publicacoes_submetidas,
  })
  const impacto: Impacto = normalizarImpacto({
    parcerias_apoio_real: linha.parcerias,
    colocacoes_competicao: linha.colocacoes,
  })

  const temNumero =
    Object.values(resultados).some((v) => typeof v === "number" && v > 0) ||
    impacto.parcerias_apoio_real > 0 ||
    impacto.colocacoes_competicao.length > 0

  if (!temNumero) return null

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32">
      <Surge className="mb-12">
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
          06 — O QUE SAIU DISSO
        </p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">Números do semestre</h2>
        <p className="mt-6 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
          Período {String(linha.periodo)}, em andamento. São os números que a entidade fecha
          internamente — publicados aqui como estão, sem arredondar para cima.
        </p>
      </Surge>

      <Surge delay={0.1}>
        {/* ocultarZeros: vitrine é para o que aconteceu, não para o que falta */}
        <MetricasPublico resultados={resultados} impacto={impacto} ocultarZeros />
      </Surge>
    </section>
  )
}
