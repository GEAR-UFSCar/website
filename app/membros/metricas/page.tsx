import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/membros/page-header"

import { ErroDados } from "@/components/erro-dados"
import { MetricasForm } from "@/components/metricas-form"
import { MetricasProex } from "@/components/metricas-proex"
import { MetricasPublico } from "@/components/metricas-publico"
import { MetricasNovoPeriodo, MetricasPrimeiroPeriodo } from "@/components/metricas-novo-periodo"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { eDiretoria } from "@/lib/administracao"
import { dataHora } from "@/lib/datas"
import {
  COLUNAS_METRICA,
  normalizarMetrica,
  podeEditarMetrica,
  reais,
  type MetricaPeriodo,
} from "@/lib/metricas"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Métricas | GEAR",
  robots: { index: false, follow: false },
}

const ABAS = [
  { id: "interno", rotulo: "Interno", texto: "A cadeia completa, por camada." },
  { id: "proex", rotulo: "ProEx", texto: "Apoio ao relatório institucional." },
  { id: "publico", rotulo: "Público", texto: "O recorte que vai ao site." },
] as const

type Aba = (typeof ABAS)[number]["id"]

const abaValida = (v: string | undefined): Aba =>
  ABAS.some((a) => a.id === v) ? (v as Aba) : "interno"

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; registro?: string }>
}) {
  const { perfil } = await exigirMembroAprovado()
  const { aba: abaBruta, registro: registroBruto } = await searchParams
  const aba = abaValida(abaBruta)

  const supabase = await createClient()

  /*
   * Todos os períodos de uma vez: são poucos por definição (um por semestre,
   * por frente) e a tela precisa do aberto, da lista para escolher e do
   * histórico. Paginar isso seria arquitetura para um problema que não existe.
   */
  const [{ data, error }, { data: valorBruto }] = await Promise.all([
    supabase
      .from("metricas_periodo")
      .select(COLUNAS_METRICA)
      .order("periodo", { ascending: false })
      .order("frente", { nullsFirst: true }),
    /*
     * A soma do inventário vem de uma função security definer (019): a leitura
     * de `patrimonio` exige cargo, e esta tela abre para qualquer membro
     * aprovado. O que atravessa é um número agregado, não a lista de bens.
     */
    supabase.rpc("valor_patrimonio_atual"),
  ])

  const metricas: MetricaPeriodo[] = (data ?? []).map((l) =>
    normalizarMetrica(l as Record<string, unknown>),
  )
  const valorPatrimonio = Number(valorBruto ?? 0)

  const abertas = metricas.filter((m) => m.status === "Em andamento")
  // Registro em foco: o pedido pela URL, senão o primeiro aberto, senão o mais recente.
  const emFoco =
    metricas.find((m) => m.id === registroBruto) ?? abertas[0] ?? metricas[0] ?? null

  const souDiretoria = eDiretoria(perfil?.cargo)
  const podeEditar = emFoco ? podeEditarMetrica(emFoco, perfil ?? null, souDiretoria) : false

  const rotuloDoRegistro = (m: MetricaPeriodo) =>
    `${m.periodo} · ${m.frente ?? "Entidade"}${m.status === "Fechado" ? " (fechado)" : ""}`

  const linkDaAba = (id: Aba) =>
    `/membros/metricas?aba=${id}${emFoco ? `&registro=${emFoco.id}` : ""}`

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Métricas">Insumos viram atividades, atividades viram resultados, resultados viram impacto. A cadeia é o ponto: número solto não diz se a entidade está funcionando.</PageHeader>

      {error && (
        <ErroDados titulo="MÉTRICAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/019_metricas.sql</code> no SQL Editor do
          painel.
        </ErroDados>
      )}

      {!error && metricas.length === 0 && (
        <div className="mt-10 max-w-2xl">
          <p className="font-sans text-sm font-light text-muted-foreground">
            {souDiretoria
              ? "Nenhum período aberto ainda. Abra o semestre atual para começar a registrar; os números da entidade e das frentes entram depois, pelo formulário que aparece aqui."
              : "Nenhum período aberto ainda. A diretoria abre o semestre, e a partir daí os números aparecem aqui."}
          </p>
          {souDiretoria && <MetricasPrimeiroPeriodo />}
        </div>
      )}

      {emFoco && (
        <>
          {/* Seletor de registro + estado */}
          <div className="mt-12 flex flex-col gap-6 border-t border-linha pt-8 lg:flex-row lg:items-end lg:justify-between nao-imprimir">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Período em foco
              </p>
              <p className="mt-2 font-sans text-3xl md:text-4xl font-light tracking-tight">
                {emFoco.periodo}{" "}
                <span className="italic text-muted-foreground">{emFoco.frente ?? "Entidade"}</span>
              </p>
              <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {emFoco.status} · atualizado em {dataHora(emFoco.atualizado_em)}
              </p>
            </div>

            {metricas.length > 1 && (
              <ul className="flex flex-wrap gap-2">
                {metricas.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/membros/metricas?aba=${aba}&registro=${m.id}`}
                      aria-current={m.id === emFoco.id ? "true" : undefined}
                      data-cursor-hover
                      className={`inline-flex min-h-11 items-center border px-4 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                        m.id === emFoco.id
                          ? "border-[var(--gear-amber)] text-[var(--gear-amber)]"
                          : "border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {rotuloDoRegistro(m)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Abas */}
          <nav aria-label="Modos de leitura das métricas" className="mt-10 nao-imprimir">
            <ul className="flex flex-wrap border border-linha-forte">
              {ABAS.map((a) => (
                <li key={a.id} className="flex-1">
                  <Link
                    href={linkDaAba(a.id)}
                    aria-current={a.id === aba ? "page" : undefined}
                    data-cursor-hover
                    className={`block px-4 py-3 text-center font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                      a.id === aba
                        ? "bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground">
              {ABAS.find((a) => a.id === aba)?.texto}
            </p>
          </nav>

          <div className="mt-12">
            {aba === "interno" && (
              <>
                <MetricasForm
                  key={emFoco.id}
                  metrica={emFoco}
                  podeEditar={podeEditar}
                  valorPatrimonio={valorPatrimonio}
                />

                {podeEditar && (
                  <div className="mt-16 border-t border-linha pt-8">
                    <h3 className="font-sans text-2xl font-normal">Virar o período</h3>
                    <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                      Fecha {emFoco.periodo} e abre o seguinte para{" "}
                      {emFoco.frente ?? "a entidade"}, copiando os insumos.
                    </p>
                    <div className="mt-6">
                      <MetricasNovoPeriodo metrica={emFoco} />
                    </div>
                  </div>
                )}
              </>
            )}

            {aba === "proex" && <MetricasProex metrica={emFoco} />}

            {aba === "publico" && (
              <div>
                <p className="mb-8 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  É exatamente isto que aparece em <span className="font-mono">/sobre</span> para
                  quem não é membro, e só isto: insumos, atividades e o funil de retenção não saem
                  daqui.
                </p>
                <MetricasPublico resultados={emFoco.resultados} impacto={emFoco.impacto} />
              </div>
            )}
          </div>

          {aba === "interno" && (
            <p className="mt-12 font-mono text-[10px] tracking-wider text-muted-foreground">
              PATRIMÔNIO SOMADO AGORA: {reais(valorPatrimonio)} · O REGISTRO GUARDA O VALOR DO
              MOMENTO EM QUE FOI SALVO
            </p>
          )}
        </>
      )}
    </section>
  )
}
