"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { dataDoDia } from "@/lib/datas"
import { somarDias } from "@/lib/calendario"
import { campoBase, rotuloBase } from "@/lib/ui"

export type Ciclo = { id: string; titulo: string; inscricoes_de: string; inscricoes_ate: string; edital_url: string | null }

const botao =
  "min-h-11 border border-[var(--gear-amber)] px-5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50"

/**
 * Ciclos do processo seletivo (038). O que está cadastrado aqui decide o que
 * /ingressar mostra. Só a diretoria cria e apaga (a RLS barra os outros); a
 * data mínima de abertura repete no campo a regra que o banco impõe: edital
 * publicado com 7 dias de antecedência (doc. 35).
 */
export function CiclosSelecao({ ciclos, podeEditar, hoje }: { ciclos: Ciclo[]; podeEditar: boolean; hoje: string }) {
  const router = useRouter()
  const minimo = somarDias(hoje, 7)
  const [c, setC] = useState({ titulo: "", de: minimo, ate: somarDias(minimo, 14), edital: "" })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const criar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg(null)
    if (c.ate < c.de) return setMsg("O fim das inscrições vem depois do começo.")
    setSalvando(true)
    const { error } = await createClient().from("ciclos_selecao").insert({
      titulo: c.titulo.trim(),
      inscricoes_de: c.de,
      inscricoes_ate: c.ate,
      edital_url: c.edital.trim() || null,
    })
    setSalvando(false)
    if (error) return setMsg(mensagemSegura(error))
    setMsg("Ciclo publicado. /ingressar atualiza em até 10 minutos. Avise a lista de espera abaixo.")
    setC((a) => ({ ...a, titulo: "", edital: "" }))
    router.refresh()
  }

  const apagar = async (ciclo: Ciclo) => {
    if (!confirm(`Apagar o ciclo "${ciclo.titulo}"? /ingressar volta a dizer "inscrições fechadas".`)) return
    const { error } = await createClient().from("ciclos_selecao").delete().eq("id", ciclo.id)
    if (error) return setMsg(mensagemSegura(error))
    router.refresh()
  }

  return (
    <div>
      {ciclos.length === 0 ? (
        <p className="font-sans text-sm font-light text-muted-foreground">Nenhum ciclo cadastrado: /ingressar diz que as inscrições estão fechadas.</p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {ciclos.map((ciclo) => (
            <li key={ciclo.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="font-sans text-base font-light">{ciclo.titulo}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {dataDoDia(ciclo.inscricoes_de)} a {dataDoDia(ciclo.inscricoes_ate)}
                  {ciclo.inscricoes_ate < hoje ? " · encerrado" : ciclo.inscricoes_de > hoje ? " · anunciado" : " · aberto"}
                  {ciclo.edital_url && (
                    <>
                      {" · "}
                      <a href={ciclo.edital_url} target="_blank" rel="noopener noreferrer" className="text-[var(--gear-amber)] hover:underline">edital</a>
                    </>
                  )}
                </p>
              </div>
              {podeEditar && (
                <button type="button" onClick={() => apagar(ciclo)} className="min-h-11 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
                  Apagar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <form onSubmit={criar} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="ciclo-titulo" className={rotuloBase}>Nome do ciclo</label>
            <input id="ciclo-titulo" required minLength={3} maxLength={120} placeholder="Processo seletivo 2027.1"
              value={c.titulo} onChange={(e) => setC((a) => ({ ...a, titulo: e.target.value }))} className={campoBase} />
          </div>
          <div>
            <label htmlFor="ciclo-de" className={rotuloBase}>Inscrições abrem (mín. {dataDoDia(minimo)})</label>
            <input id="ciclo-de" type="date" required min={minimo} value={c.de}
              onChange={(e) => setC((a) => ({ ...a, de: e.target.value }))} className={campoBase} />
          </div>
          <div>
            <label htmlFor="ciclo-ate" className={rotuloBase}>Inscrições fecham</label>
            <input id="ciclo-ate" type="date" required min={c.de} value={c.ate}
              onChange={(e) => setC((a) => ({ ...a, ate: e.target.value }))} className={campoBase} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="ciclo-edital" className={rotuloBase}>Link do edital (opcional, PDF publicado)</label>
            <input id="ciclo-edital" type="url" pattern="https?://.+" placeholder="https://…"
              value={c.edital} onChange={(e) => setC((a) => ({ ...a, edital: e.target.value }))} className={campoBase} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={salvando} className={botao}>{salvando ? "Publicando…" : "Publicar ciclo"}</button>
          </div>
        </form>
      )}
      {msg && <p role="status" className="mt-3 font-mono text-[10px] text-[var(--gear-amber)]">{msg}</p>}
    </div>
  )
}
