"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Pilula } from "@/components/membros/pilula"
import { acaoAmbar, acaoDiscreta } from "@/components/tarefa-item"
import { AREAS_ARTIGO } from "@/lib/academia"
import { createClient } from "@/lib/supabase/client"
import { mensagemSegura } from "@/lib/erros"
import { campoBase } from "@/lib/ui"

export type ArtigoResumo = {
  id: string
  titulo: string
  area: string | null
  conteudo: string
  updated_at: string
  nasceu_de_pergunta: boolean
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/**
 * Base de conhecimento (044): busca no título e no conteúdo, filtro por área.
 * "Registrar uma resposta" é a regra da GEAR: quem perguntou escreve a resposta.
 */
export function BaseConhecimento({ artigos }: { artigos: ArtigoResumo[] }) {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [area, setArea] = useState("")
  const [novo, setNovo] = useState<null | "resposta" | "artigo">(null)
  const [f, setF] = useState({ titulo: "", area: "", conteudo: "" })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    return artigos.filter((a) => (!area || a.area === area) && (!termo || normalizar(`${a.titulo} ${a.conteudo}`).includes(termo)))
  }, [artigos, busca, area])

  const criar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const { data, error } = await createClient()
      .from("artigos")
      .insert({ titulo: f.titulo.trim(), area: f.area || null, conteudo: f.conteudo, nasceu_de_pergunta: novo === "resposta" })
      .select("id")
      .single()
    setOcupado(false)
    if (error) return setErro(mensagemSegura(error))
    router.push(`/membros/conhecimento/${data.id}`)
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <button type="button" onClick={() => setNovo("resposta")} className={acaoAmbar}>Registrar uma resposta</button>
        <button type="button" onClick={() => setNovo("artigo")} className={acaoDiscreta}>Novo artigo</button>
      </div>

      {novo && (
        <form onSubmit={criar} className="mt-4 grid gap-2 border border-linha p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)]">
            {novo === "resposta" ? "Você perguntou e descobriu: escreva a resposta para a próxima pessoa" : "Novo artigo"}
          </p>
          <label className="sr-only" htmlFor="kb-titulo">Título</label>
          <input id="kb-titulo" required maxLength={200} placeholder={novo === "resposta" ? "A pergunta, do jeito que você fez" : "Título"} value={f.titulo} onChange={(e) => setF((a) => ({ ...a, titulo: e.target.value }))} className={campoBase} />
          <label className="sr-only" htmlFor="kb-area">Área</label>
          <select id="kb-area" value={f.area} onChange={(e) => setF((a) => ({ ...a, area: e.target.value }))} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Área</option>
            {AREAS_ARTIGO.map((a) => <option key={a} value={a} className="bg-[var(--gear-ink)]">{a}</option>)}
          </select>
          <label className="sr-only" htmlFor="kb-conteudo">Conteúdo em Markdown</label>
          <textarea id="kb-conteudo" rows={8} maxLength={50000} placeholder="A resposta, em Markdown (## títulos, listas, `código`)…" value={f.conteudo} onChange={(e) => setF((a) => ({ ...a, conteudo: e.target.value }))} className={`${campoBase} font-mono text-xs`} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || !f.titulo.trim()} className={acaoAmbar}>Publicar</button>
            <button type="button" onClick={() => setNovo(null)} className={acaoDiscreta}>Cancelar</button>
          </div>
          {erro && <p role="alert" className="font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
        </form>
      )}

      <div className="mt-8 grid gap-2 sm:grid-cols-[2fr_1fr]">
        <label className="sr-only" htmlFor="kb-busca">Buscar</label>
        <input id="kb-busca" type="search" placeholder="Buscar no título e no conteúdo…" value={busca} onChange={(e) => setBusca(e.target.value)} className={campoBase} />
        <label className="sr-only" htmlFor="kb-filtro">Área</label>
        <select id="kb-filtro" value={area} onChange={(e) => setArea(e.target.value)} className={campoBase}>
          <option value="" className="bg-[var(--gear-ink)]">Todas as áreas</option>
          {AREAS_ARTIGO.map((a) => <option key={a} value={a} className="bg-[var(--gear-ink)]">{a}</option>)}
        </select>
      </div>

      <ul className="mt-6 border border-linha">
        {lista.length === 0 && (
          <li className="px-5 py-4 font-sans text-sm font-light text-muted-foreground">Nada encontrado. Descobriu a resposta? Registre.</li>
        )}
        {lista.map((a) => (
          <li key={a.id} className="border-b border-linha last:border-b-0">
            <Link href={`/membros/conhecimento/${a.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 hover:bg-[var(--gear-navy)]">
              <span className="flex-1 font-sans text-sm">{a.titulo}</span>
              {!a.conteudo.replace(/^#+.*$/gm, "").trim() && <Pilula>Modelo vazio</Pilula>}
              {a.nasceu_de_pergunta && <Pilula tom="ativo">Nasceu de pergunta</Pilula>}
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{a.area ?? "sem área"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
