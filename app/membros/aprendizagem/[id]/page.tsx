import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Comprovar } from "@/components/competencias-lista"
import { LicaoForm } from "@/components/licao-form"
import { ConcluirLicao, QuizLicao } from "@/components/licao-interativa"
import { Markdown } from "@/components/markdown"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { RegistroEditavel } from "@/components/membros/registro-editavel"
import { temCargo } from "@/lib/administracao"
import {
  COLUNAS_COMPROVACAO,
  COLUNAS_LICAO,
  COLUNAS_MODULO,
  embedDoVideo,
  formatarDuracao,
  ordenarLicoes,
  proximaLicao,
  type Comprovacao,
  type Licao,
  type Modulo,
} from "@/lib/academia"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Competência · Academia GEAR | GEAR",
  robots: { index: false, follow: false },
}

const rotulo = "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
const ICONE: Record<Licao["tipo"], string> = { texto: "▤", video: "▶", quiz: "?" }

/**
 * Uma competência como curso (047): lições em ordem à esquerda, a aberta à
 * direita, e no fim a comprovação que vale ponto (043). Como Coursera/Udemy:
 * abre na primeira lição que falta, e "concluir" leva à seguinte.
 */
export default async function CompetenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ licao?: string }>
}) {
  const [{ id }, { licao: pedida }] = await Promise.all([params, searchParams])
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  const [mR, licoesR, feitasR, minhaR] = await Promise.all([
    supabase.from("modulos").select(COLUNAS_MODULO).eq("id", id).maybeSingle(),
    supabase.from("licoes").select(COLUNAS_LICAO).eq("modulo_id", id),
    supabase.from("licoes_feitas").select("licao_id").eq("usuario_id", user.id),
    supabase.from("progresso").select(COLUNAS_COMPROVACAO).eq("usuario_id", user.id).eq("modulo_id", id).maybeSingle(),
  ])
  const m = mR.data as Modulo | null
  if (!m) notFound()

  const [requisitoR, guiaR] = await Promise.all([
    m.requisito_id ? supabase.from("modulos").select("id, codigo, titulo").eq("id", m.requisito_id).maybeSingle() : null,
    m.guia_id ? supabase.from("artigos").select("id, titulo").eq("id", m.guia_id).maybeSingle() : null,
  ])
  const requisito = requisitoR?.data
  const guia = guiaR?.data

  const licoes = ((licoesR.data ?? []) as Licao[]).sort(ordenarLicoes)
  const feitas = new Set((feitasR.data ?? []).map((f) => f.licao_id))
  const feitasAqui = licoes.filter((l) => feitas.has(l.id)).length
  const atual = licoes.find((l) => l.id === pedida) ?? proximaLicao(licoes, feitas) ?? licoes[0] ?? null
  const indice = atual ? licoes.indexOf(atual) : -1
  const seguinte = indice >= 0 ? licoes[indice + 1] : undefined
  const proximaHref = seguinte ? `/membros/aprendizagem/${id}?licao=${seguinte.id}` : null
  const minutos = licoes.reduce((s, l) => s + (l.duracao_min ?? 0), 0) || m.duracao_estimada
  const gerencia = temCargo(perfil?.cargo)
  const pct = licoes.length ? Math.round((feitasAqui / licoes.length) * 100) : 0

  return (
    <section className={paginaMembros}>
      <Link href="/membros/aprendizagem" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        ← Academia
      </Link>
      <PageHeader titulo={m.titulo}>
        {[m.codigo ?? "LEGADO", m.area, m.nivel, `${m.pontos} pts`, formatarDuracao(minutos)].filter(Boolean).join(" · ")}
      </PageHeader>

      {m.descricao && <p className="mt-4 max-w-[72ch] font-sans text-sm font-light text-muted-foreground">{m.descricao}</p>}
      {requisito && (
        <p className="mt-3 font-sans text-sm font-light">
          <span className={rotulo}>Recomendado antes · </span>
          <Link href={`/membros/aprendizagem/${requisito.id}`} className="text-[var(--gear-amber)] underline underline-offset-4">
            {requisito.codigo ? `${requisito.codigo} ` : ""}{requisito.titulo}
          </Link>
        </p>
      )}

      {licoes.length > 0 && (
        <div className="mt-6 max-w-md">
          <div className="h-1 bg-linha" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Lições feitas">
            <div className="h-1 bg-[var(--gear-amber)]" style={{ width: `${pct}%` }} />
          </div>
          <p className={`${rotulo} mt-2`}>{feitasAqui} de {licoes.length} lições · {pct}%</p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Lições" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="border border-linha">
            {licoes.length === 0 && (
              <li className="p-4 font-sans text-sm font-light text-muted-foreground">
                Ainda sem lições.{m.conteudo_url || guia ? " Use o material e o guia abaixo." : ""}
              </li>
            )}
            {licoes.map((l, i) => (
              <li key={l.id} className="border-b border-linha last:border-b-0">
                <Link
                  href={`/membros/aprendizagem/${id}?licao=${l.id}`}
                  aria-current={l.id === atual?.id ? "step" : undefined}
                  className={`flex min-h-11 items-start gap-3 p-3 font-sans text-sm font-light transition-colors hover:bg-[var(--gear-navy)] ${l.id === atual?.id ? "bg-[var(--gear-navy)] text-foreground" : "text-muted-foreground"}`}
                >
                  <span aria-hidden className={`mt-0.5 w-4 font-mono text-xs ${feitas.has(l.id) ? "text-[var(--gear-amber)]" : ""}`}>
                    {feitas.has(l.id) ? "✓" : ICONE[l.tipo]}
                  </span>
                  <span className="flex-1">
                    {i + 1}. {l.titulo}
                    {l.duracao_min && <span className="ml-2 font-mono text-[10px]">{l.duracao_min}min</span>}
                    <span className="sr-only">{feitas.has(l.id) ? " (feita)" : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-col gap-2">
            {guia && (
              <Link href={`/membros/conhecimento/${guia.id}`} className="font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
                Guia: {guia.titulo} →
              </Link>
            )}
            {m.conteudo_url && (
              <a href={m.conteudo_url} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
                Material externo ↗
              </a>
            )}
          </div>
        </nav>

        <div className="min-w-0">
          {atual && (
            <article>
              <p className={rotulo}>Lição {indice + 1} de {licoes.length}</p>
              <h2 className="mt-2 font-sans text-2xl">{atual.titulo}</h2>
              {atual.tipo === "video" && <Video url={atual.video_url} />}
              {atual.corpo.trim() && <Markdown texto={atual.corpo} />}
              {atual.tipo === "quiz" ? (
                <QuizLicao key={atual.id} questoes={atual.questoes} licaoId={atual.id} feita={feitas.has(atual.id)} proximaHref={proximaHref} />
              ) : (
                <ConcluirLicao licaoId={atual.id} feita={feitas.has(atual.id)} proximaHref={proximaHref} />
              )}
              {gerencia && (
                <RegistroEditavel tabela="licoes" id={atual.id} className="mt-6" formulario={<LicaoForm moduloId={id} licao={atual} />} />
              )}
            </article>
          )}

          <div className="mt-12 border border-linha bg-[var(--gear-navy)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--gear-amber)]">Comprovação · vale {m.pontos} pts</p>
            {m.criterio_aceite ? (
              <p className="mt-2 font-sans text-sm font-light">
                <span className={rotulo}>Aceite quando · </span>{m.criterio_aceite}
              </p>
            ) : (
              <p className="mt-2 font-sans text-sm font-light text-muted-foreground">Módulo legado, sem critério de aceite.</p>
            )}
            {minhaR.data?.estado && <p className={`${rotulo} mt-2`}>Situação: {minhaR.data.estado}</p>}
            <Comprovar competencia={m} atual={(minhaR.data ?? undefined) as Comprovacao | undefined} />
          </div>

          {gerencia && (
            <Recolhivel rotulo="Nova lição" aberto={licoes.length === 0} className="mt-8">
              <LicaoForm moduloId={id} proximaOrdem={(licoes.at(-1)?.ordem ?? 0) + 1} />
            </Recolhivel>
          )}
        </div>
      </div>
    </section>
  )
}

function Video({ url }: { url: string | null }) {
  const embed = embedDoVideo(url)
  if (!embed) {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block font-mono text-[11px] text-[var(--gear-amber)] underline underline-offset-4">
        Assistir o vídeo ↗
      </a>
    ) : null
  }
  return (
    <div className="mt-4 aspect-video w-full border border-linha">
      <iframe
        src={embed}
        title="Vídeo da lição"
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  )
}
