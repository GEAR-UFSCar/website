import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { Recolhivel } from "@/components/membros/recolhivel"
import { Secao } from "@/components/membros/secao"
import { PesquisaNova, PesquisaResponder } from "@/components/pesquisa"
import { temCargo } from "@/lib/administracao"
import { agoraISO, dataHora } from "@/lib/datas"
import { modeloPesquisa, resumirEscala } from "@/lib/pesquisas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Pesquisas | GEAR",
  robots: { index: false, follow: false },
}

type Pesquisa = { id: string; titulo: string; modelo: string; abre_em: string; fecha_em: string; minimo: number }

/**
 * Pesquisa de clima, de 30 dias e de saída (doc. 33). Anônima: o banco separa
 * quem respondeu do que respondeu, e o resultado só sai com 5+ respostas.
 */
export default async function PesquisasPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const comCargo = temCargo(perfil?.cargo)
  const supabase = await createClient()
  const agora = agoraISO()

  const [pesqR, minhasR] = await Promise.all([
    supabase.from("pesquisas").select("id, titulo, modelo, abre_em, fecha_em, minimo").order("fecha_em", { ascending: false }).limit(20),
    supabase.from("pesquisa_participacao").select("pesquisa_id").eq("usuario_id", user.id),
  ])
  const pesquisas = (pesqR.data ?? []) as Pesquisa[]
  const respondidas = new Set((minhasR.data ?? []).map((m) => m.pesquisa_id))
  const abertas = pesquisas.filter((p) => p.abre_em <= agora && p.fecha_em > agora)
  const encerradas = pesquisas.filter((p) => p.fecha_em <= agora)

  const resultados = await Promise.all(
    encerradas.map(async (p) => {
      const [{ data: total }, { data: respostas }] = await Promise.all([
        supabase.rpc("contagem_pesquisa", { p_pesquisa: p.id }),
        comCargo ? supabase.rpc("respostas_pesquisa", { p_pesquisa: p.id }) : Promise.resolve({ data: [] }),
      ])
      return { id: p.id, total: Number(total ?? 0), respostas: (respostas ?? []) as Record<string, unknown>[] }
    }),
  )

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Pesquisas">
        Anônimas de verdade: o site guarda que você respondeu, nunca o que você respondeu junto com o seu nome. Os
        resultados só aparecem somados e com pelo menos cinco respostas; a devolutiva ao Grupo sai em até 30 dias.
      </PageHeader>

      {pesqR.error && (
        <ErroDados titulo="PESQUISAS INDISPONÍVEIS" erro={pesqR.error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/035_documentacao_integrada.sql</code>.
        </ErroDados>
      )}

      {comCargo && (
        <Recolhivel rotulo="Abrir pesquisa" className="mt-10">
          <PesquisaNova />
        </Recolhivel>
      )}

      <Secao titulo="Abertas">
        {abertas.length === 0 ? (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma pesquisa aberta.</p>
        ) : (
          <ul className="space-y-4">
            {abertas.map((p) => (
              <li key={p.id} className="border border-linha p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-sans text-lg font-light">{p.titulo}</h3>
                  <Pilula tom="ativo">até {dataHora(p.fecha_em)}</Pilula>
                </div>
                {respondidas.has(p.id) ? (
                  <p className="mt-3 font-mono text-[11px] text-[var(--gear-amber)]">Você já respondeu. Obrigado.</p>
                ) : modeloPesquisa(p.modelo) ? (
                  <PesquisaResponder pesquisaId={p.id} modeloId={p.modelo} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Encerradas">
        {encerradas.length === 0 ? (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma pesquisa encerrada.</p>
        ) : (
          <ul className="space-y-4">
            {encerradas.map((p) => {
              const r = resultados.find((x) => x.id === p.id)!
              const modelo = modeloPesquisa(p.modelo)
              const visivel = comCargo && r.total >= p.minimo && modelo
              return (
                <li key={p.id} className="border border-linha p-5">
                  <h3 className="font-sans text-lg font-light">{p.titulo}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Encerrada em {dataHora(p.fecha_em)} · {r.total} {r.total === 1 ? "resposta" : "respostas"}
                    {r.total < p.minimo && ` · menos de ${p.minimo}: resultado não é divulgado, para ninguém ser identificado`}
                    {r.total >= p.minimo && !comCargo && " · a devolutiva é apresentada pela Diretoria"}
                  </p>
                  {visivel && (
                    <div className="mt-4 space-y-4">
                      {modelo.perguntas.map((q) => {
                        if (q.tipo === "escala") {
                          const s = resumirEscala(r.respostas, q.id)
                          return (
                            <div key={q.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linha pb-2">
                              <span className="flex-1 font-sans text-sm">{q.texto}</span>
                              <span className={`font-mono text-[11px] tabular-nums ${s?.atencao ? "text-[var(--gear-amber)]" : ""}`}>
                                {s ? `média ${s.media.toFixed(1)} · ${Math.round(s.baixas * 100)}% de 1–2` : "sem respostas"}
                              </span>
                            </div>
                          )
                        }
                        if (q.tipo === "opcao") {
                          return (
                            <div key={q.id} className="border-b border-linha pb-2">
                              <p className="font-sans text-sm">{q.texto}</p>
                              <p className="mt-1 font-mono text-[11px]">
                                {q.opcoes.map((o) => `${o}: ${r.respostas.filter((x) => x[q.id] === o).length}`).join(" · ")}
                              </p>
                            </div>
                          )
                        }
                        const textos = r.respostas.map((x) => x[q.id]).filter((t): t is string => typeof t === "string" && t.trim().length > 0)
                        return (
                          <details key={q.id} className="border-b border-linha pb-2">
                            <summary className="cursor-pointer font-sans text-sm">{q.texto} ({textos.length})</summary>
                            <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm font-light">
                              {textos.map((t, i) => <li key={i} className="whitespace-pre-line">{t}</li>)}
                            </ul>
                          </details>
                        )
                      })}
                      <p className="font-sans text-xs font-light text-muted-foreground">
                        Média abaixo de 3,5 em destaque. Relato de assédio, risco ou violência: trate pelo Código de Conduta, com sigilo.
                      </p>
                    </div>
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
