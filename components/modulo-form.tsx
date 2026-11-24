"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { AREAS_COMPETENCIA, NIVEIS_ACADEMIA, type Modulo } from "@/lib/academia"
import { campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { useEncerrarEdicao } from "@/components/membros/registro-editavel"

const vazio = () => ({
  nivel: NIVEIS_ACADEMIA[0] as string,
  ordem: "",
  codigo: "",
  area: "",
  pontos: "10",
  criterio_aceite: "",
  guia_id: "",
  titulo: "",
  descricao: "",
  conteudo_url: "",
  prazo_conclusao: "",
  duracao_estimada: "",
})

/**
 * Competência da Academia (043). Sem `modulo` cadastra uma nova; com `modulo`
 * corrige aquela. Código e critério de aceite são obrigatórios (GE016); a
 * ordem, se ficar vazia, o banco põe no fim do nível.
 */
export function ModuloForm({ modulo, guias = [] }: { modulo?: Modulo; guias?: { id: string; titulo: string }[] }) {
  const router = useRouter()
  const encerrar = useEncerrarEdicao()
  const sufixo = modulo?.id ?? "novo"
  const [campos, setCampos] = useState(
    modulo
      ? {
          nivel: modulo.nivel,
          ordem: String(modulo.ordem),
          codigo: modulo.codigo ?? "",
          area: modulo.area ?? "",
          pontos: String(modulo.pontos ?? 0),
          criterio_aceite: modulo.criterio_aceite ?? "",
          guia_id: modulo.guia_id ?? "",
          titulo: modulo.titulo,
          descricao: modulo.descricao ?? "",
          conteudo_url: modulo.conteudo_url ?? "",
          prazo_conclusao: modulo.prazo_conclusao ?? "",
          duracao_estimada: modulo.duracao_estimada ? String(modulo.duracao_estimada) : "",
        }
      : vazio(),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set = (chave: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const valores = {
      nivel: campos.nivel,
      ...(campos.ordem ? { ordem: Number(campos.ordem) } : {}),
      codigo: campos.codigo.trim().toUpperCase(),
      area: campos.area || null,
      pontos: Number(campos.pontos) || 0,
      criterio_aceite: campos.criterio_aceite.trim(),
      guia_id: campos.guia_id || null,
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim() || null,
      conteudo_url: campos.conteudo_url.trim() || null,
      prazo_conclusao: campos.prazo_conclusao || null,
      duracao_estimada: campos.duracao_estimada ? Number(campos.duracao_estimada) : null,
    }

    const supabase = createClient()
    const { data, error } = modulo
      ? await supabase.from("modulos").update(valores).eq("id", modulo.id).select("id")
      : await supabase.from("modulos").insert(valores).select("id")

    setSalvando(false)
    if (error) {
      // a única unicidade de modulos é (nivel, ordem): dizer qual é ajuda mais que a frase genérica
      return setErro(error.code === "23505" ? "Já existe uma competência com esse código (ou com essa ordem no nível)." : mensagemSegura(error))
    }
    if (!data?.length) return setErro("Nada foi salvo, a política de acesso recusou.")

    if (modulo) encerrar?.()
    else setCampos(vazio())
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="border border-linha p-6 space-y-5">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">{modulo ? "CORRIGINDO COMPETÊNCIA" : "NOVA COMPETÊNCIA"}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor={`nivel-${sufixo}`} className={rotuloBase}>Nível</label>
          <select id={`nivel-${sufixo}`} value={campos.nivel} onChange={set("nivel")} disabled={salvando} className={campoBase}>
            {NIVEIS_ACADEMIA.map((n) => <option key={n} value={n} className="bg-[var(--gear-ink)]">{n}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`codigo-${sufixo}`} className={rotuloBase}>Código (ex.: EMB-01)</label>
          <input id={`codigo-${sufixo}`} required pattern="[A-Za-z0-9]{2,6}-[0-9]{2,3}" maxLength={10} value={campos.codigo} onChange={set("codigo")} disabled={salvando} className={`${campoBase} font-mono uppercase`} />
        </div>

        <div>
          <label htmlFor={`area-${sufixo}`} className={rotuloBase}>Área</label>
          <select id={`area-${sufixo}`} required value={campos.area} onChange={set("area")} disabled={salvando} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Escolha…</option>
            {AREAS_COMPETENCIA.map((a) => <option key={a} value={a} className="bg-[var(--gear-ink)]">{a}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`pontos-${sufixo}`} className={rotuloBase}>Pontos</label>
          <input id={`pontos-${sufixo}`} type="number" min={0} max={1000} step={1} required value={campos.pontos} onChange={set("pontos")} disabled={salvando} className={`${campoBase} font-mono`} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`criterio-${sufixo}`} className={rotuloBase}>Critério de aceite (o que a evidência precisa mostrar)</label>
          <textarea id={`criterio-${sufixo}`} required rows={3} maxLength={2000} value={campos.criterio_aceite} onChange={set("criterio_aceite")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>

        <div>
          <label htmlFor={`guia-${sufixo}`} className={rotuloBase}>Guia na base de conhecimento</label>
          <select id={`guia-${sufixo}`} value={campos.guia_id} onChange={set("guia_id")} disabled={salvando} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Sem guia</option>
            {guias.map((g) => <option key={g.id} value={g.id} className="bg-[var(--gear-ink)]">{g.titulo}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`ordem-${sufixo}`} className={rotuloBase}>Ordem no nível (opcional)</label>
          <input id={`ordem-${sufixo}`} type="number" min={1} step={1} value={campos.ordem} onChange={set("ordem")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`titulo-${sufixo}`} className={rotuloBase}>Título</label>
          <input id={`titulo-${sufixo}`} required maxLength={200} value={campos.titulo} onChange={set("titulo")} disabled={salvando} className={campoBase} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`descricao-${sufixo}`} className={rotuloBase}>Descrição</label>
          <textarea id={`descricao-${sufixo}`} rows={3} maxLength={2000} value={campos.descricao} onChange={set("descricao")} disabled={salvando} className={`${campoBase} resize-y`} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`conteudo_url-${sufixo}`} className={rotuloBase}>Link do material</label>
          <input id={`conteudo_url-${sufixo}`} type="url" pattern="https?://.+" placeholder="https://…" maxLength={2000} value={campos.conteudo_url} onChange={set("conteudo_url")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor={`prazo-${sufixo}`} className={rotuloBase}>Prazo de conclusão</label>
          <input id={`prazo-${sufixo}`} type="date" value={campos.prazo_conclusao} onChange={set("prazo_conclusao")} disabled={salvando} className={campoBase} />
        </div>

        <div>
          <label htmlFor={`duracao-${sufixo}`} className={rotuloBase}>Duração estimada (minutos)</label>
          <input id={`duracao-${sufixo}`} type="number" min={1} step={1} placeholder="150 = 2h30min" value={campos.duracao_estimada} onChange={set("duracao_estimada")} disabled={salvando} className={campoBase} />
        </div>
      </div>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button type="submit" disabled={salvando} data-cursor-hover
        className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50">
        {salvando ? "Salvando…" : modulo ? "Salvar correção" : "Cadastrar competência"}
      </button>
    </form>
  )
}
