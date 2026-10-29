import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { VotacaoForm, VotarBotoes } from "@/components/votacao"
import { temCargo } from "@/lib/administracao"
import { agoraISO, dataHora } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"
import { apurar, type Regra } from "@/lib/votacoes"

export const metadata: Metadata = {
  title: "Assembleia | GEAR",
  robots: { index: false, follow: false },
}

type Votacao = {
  id: string
  titulo: string
  descricao: string | null
  secreta: boolean
  opcoes: string[]
  regra: Regra
  abre_em: string
  fecha_em: string
}

/**
 * Deliberações e eleições por meio remoto, com registro e identificação dos
 * participantes (Regimento art. 38). Votam fundadores e efetivos (art. 11 § 1º).
 */
export default async function AssembleiaPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()
  const agora = agoraISO()

  const [votR, partR, euR] = await Promise.all([
    supabase.from("votacoes").select("id, titulo, descricao, secreta, opcoes, regra, abre_em, fecha_em").order("fecha_em", { ascending: false }).limit(40),
    supabase.from("votacao_participacao").select("votacao_id, usuario_id, perfis(nome_completo)"),
    supabase.from("perfis").select("categoria").eq("id", user.id).maybeSingle(),
  ])
  const votacoes = (votR.data ?? []) as Votacao[]
  const participacao = (partR.data ?? []) as unknown as { votacao_id: string; usuario_id: string; perfis: { nome_completo: string | null } | null }[]
  const voto = euR.data?.categoria === "fundador" || euR.data?.categoria === "efetivo"

  const abertas = votacoes.filter((v) => v.abre_em <= agora && v.fecha_em > agora)
  const encerradas = votacoes.filter((v) => v.fecha_em <= agora)

  const resultados = await Promise.all(
    encerradas.map(async (v) => {
      const [{ data: linhas }, { data: nominais }] = await Promise.all([
        supabase.rpc("resultado_votacao", { p_votacao: v.id }),
        v.secreta ? Promise.resolve({ data: [] }) : supabase.from("votos").select("opcao, perfis(nome_completo)").eq("votacao_id", v.id),
      ])
      const l = (linhas ?? []) as { opcao: string; votos: number; votantes: number; aptos: number }[]
      const votantes = Number(l[0]?.votantes ?? 0)
      const aptos = Number(l[0]?.aptos ?? 0)
      return {
        id: v.id,
        linhas: l.map((x) => ({ opcao: x.opcao, votos: Number(x.votos) })),
        votantes,
        aptos,
        apuracao: apurar(l.map((x) => ({ opcao: x.opcao, votos: Number(x.votos) })), votantes, aptos, v.regra),
        nominais: (nominais ?? []) as unknown as { opcao: string; perfis: { nome_completo: string | null } | null }[],
      }
    }),
  )

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Assembleia">
        Votações da Assembleia Geral e eleições, pelo site. Votam fundadores e efetivos; quórum de metade mais um; o resultado
        sai depois do encerramento e vai para a ata.
        {!voto && " Sua categoria ainda não tem direito a voto: você acompanha, com direito a voz."}
      </PageHeader>

      {votR.error && (
        <ErroDados titulo="ASSEMBLEIA INDISPONÍVEL" erro={votR.error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/035_documentacao_integrada.sql</code>.
        </ErroDados>
      )}

      {temCargo(perfil?.cargo) && (
        <Recolhivel rotulo="Abrir votação" className="mt-10">
          <VotacaoForm />
        </Recolhivel>
      )}

      <Secao titulo={`Abertas (${abertas.length})`}>
        {abertas.length === 0 ? (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma votação aberta.</p>
        ) : (
          <ul className="space-y-4">
            {abertas.map((v) => {
              const quem = participacao.filter((p) => p.votacao_id === v.id)
              const jaVotei = quem.some((p) => p.usuario_id === user.id)
              return (
                <li key={v.id} className="border border-linha p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-sans text-lg font-light">{v.titulo}</h3>
                    <Pilula tom="ativo">{v.secreta ? "Secreta" : "Nominal"} · até {dataHora(v.fecha_em)}</Pilula>
                  </div>
                  {v.descricao && <p className="mt-2 whitespace-pre-line font-sans text-sm font-light text-muted-foreground">{v.descricao}</p>}
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {quem.length} {quem.length === 1 ? "pessoa votou" : "pessoas votaram"}
                    {v.regra === "dois_tercos" && " · exige 2/3 dos membros com voto"}
                  </p>
                  {jaVotei ? (
                    <p className="mt-3 font-mono text-[11px] text-[var(--gear-amber)]">Seu voto foi registrado.</p>
                  ) : voto ? (
                    <VotarBotoes votacaoId={v.id} opcoes={v.opcoes} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Secao>

      <Secao titulo="Encerradas">
        {encerradas.length === 0 ? (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma votação encerrada.</p>
        ) : (
          <ul className="space-y-4">
            {encerradas.map((v) => {
              const r = resultados.find((x) => x.id === v.id)!
              return (
                <li key={v.id} className="border border-linha p-5">
                  <h3 className="font-sans text-lg font-light">{v.titulo}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Encerrada em {dataHora(v.fecha_em)} · {r.votantes} de {r.aptos} membros com voto · quórum {r.apuracao.quorum ? "atingido" : "não atingido"}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {r.linhas.map((l) => (
                      <li key={l.opcao} className="flex justify-between font-mono text-[11px]">
                        <span>{l.opcao}</span>
                        <span className="tabular-nums">{l.votos}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-l-2 border-[var(--gear-amber)] pl-3 font-sans text-sm">{r.apuracao.resultado}</p>
                  {r.nominais.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Votos nominais</summary>
                      <ul className="mt-2 space-y-1 font-sans text-sm font-light">
                        {r.nominais.map((n, i) => <li key={i}>{n.perfis?.nome_completo ?? "ex-membro"}: {n.opcao}</li>)}
                      </ul>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Secao>
    </section>
  )
}
