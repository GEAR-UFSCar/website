"use client"

import { useId, useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { FRENTES } from "@/lib/administracao"
import {
  CATEGORIAS, ESTADOS, LIMITES, STATUS, urlSegura, type ItemInventario,
} from "@/lib/inventario"
import { botaoPrimario, botaoDesabilitavel, botaoSecundario, campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

const ORIGENS_COMUNS = ["GEAR", "Doação", "Empréstimo"]

type Campos = {
  item: string
  categoria: string
  subcategoria: string
  fabricante: string
  modelo: string
  part_number: string
  descricao: string
  datasheet_url: string
  quantidade: string
  valor_estimado: string
  estado: string
  status: string
  origem: string
  localizacao: string
  responsavel_atual: string
  frente_vinculada: string
  observacoes: string
}

const VAZIO: Campos = {
  item: "",
  categoria: CATEGORIAS[0],
  subcategoria: "",
  fabricante: "",
  modelo: "",
  part_number: "",
  descricao: "",
  datasheet_url: "",
  quantidade: "1",
  valor_estimado: "",
  estado: "",
  status: STATUS[0],
  origem: "",
  localizacao: "",
  responsavel_atual: "",
  frente_vinculada: "",
  observacoes: "",
}

function doItem(i: ItemInventario): Campos {
  return {
    item: i.item,
    categoria: i.categoria,
    subcategoria: i.subcategoria ?? "",
    fabricante: i.fabricante ?? "",
    modelo: i.modelo ?? "",
    part_number: i.part_number ?? "",
    descricao: i.descricao ?? "",
    datasheet_url: i.datasheet_url ?? "",
    quantidade: String(i.quantidade),
    valor_estimado: i.valor_estimado === null ? "" : String(i.valor_estimado),
    estado: i.estado ?? "",
    status: i.status,
    origem: i.origem ?? "",
    localizacao: i.localizacao ?? "",
    responsavel_atual: i.responsavel_atual ?? "",
    frente_vinculada: i.frente_vinculada ?? "",
    observacoes: i.observacoes ?? "",
  }
}

/**
 * Cadastro e edição de um item do inventário, no mesmo formulário.
 *
 * Sem `item`, cria; com `item`, edita aquele (e o código aparece fixo — é a
 * etiqueta colada na peça e o banco recusa mudá-lo, migração 029). Strings
 * vazias viram null para o banco não guardar "" como se fosse um valor.
 */
export function PatrimonioForm({
  item,
  origens = [],
  aoConcluir,
}: {
  item?: ItemInventario
  /** Origens já usadas no inventário, para sugerir no campo (sem obrigar a escolher). */
  origens?: string[]
  /** Chamado depois de salvar uma edição (e do refresh), para quem abriu fechar o editor. */
  aoConcluir?: () => void
}) {
  const router = useRouter()
  const id = useId()
  const editando = Boolean(item)
  const [campos, setCampos] = useState<Campos>(item ? doItem(item) : VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [cadastrado, setCadastrado] = useState<string | null>(null)

  const campo = (nome: keyof Campos) => `${id}-${nome}`
  const set =
    (chave: keyof Campos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setCampos((a) => ({ ...a, [chave]: e.target.value }))
  const ou = (v: string) => v.trim() || null

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setCadastrado(null)

    const quantidade = Number(campos.quantidade)
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      setErro("A quantidade precisa ser um número inteiro, zero ou mais.")
      return
    }
    const link = campos.datasheet_url.trim()
    if (link && !urlSegura(link)) {
      setErro("O link do datasheet precisa começar com http:// ou https:// e não ter espaços.")
      return
    }
    const valor = campos.valor_estimado.trim()
    if (valor && !(Number(valor) >= 0)) {
      setErro("O valor estimado precisa ser um número, zero ou mais.")
      return
    }

    setSalvando(true)
    const dados = {
      item: campos.item.trim(),
      categoria: campos.categoria,
      subcategoria: ou(campos.subcategoria),
      fabricante: ou(campos.fabricante),
      modelo: ou(campos.modelo),
      part_number: ou(campos.part_number),
      descricao: ou(campos.descricao),
      datasheet_url: link || null,
      quantidade,
      /*
       * Vazio grava null, não zero: "não estimado" e "vale zero" são coisas
       * diferentes, e valor_patrimonio_atual() (019) soma o null como zero
       * sem que o inventário precise mentir que o item não vale nada.
       */
      valor_estimado: valor === "" ? null : Number(valor),
      estado: campos.estado || null,
      status: campos.status,
      origem: ou(campos.origem),
      localizacao: ou(campos.localizacao),
      responsavel_atual: ou(campos.responsavel_atual),
      frente_vinculada: campos.frente_vinculada || null,
      observacoes: ou(campos.observacoes),
    }

    const supabase = createClient()

    if (item) {
      // .select() confere se alguma linha mudou: a RLS recusa um UPDATE sem
      // erro nenhum, e sem esta checagem a tela fecharia o editor como se tivesse salvo.
      const { data, error } = await supabase.from("patrimonio").update(dados).eq("id", item.id).select("id")
      if (error) {
        setErro(mensagemSegura(error))
        setSalvando(false)
        return
      }
      if (!data || data.length === 0) {
        setErro("Nenhuma linha alterada: a política de acesso recusou a mudança.")
        setSalvando(false)
        return
      }
      setSalvando(false)
      router.refresh()
      aoConcluir?.()
      return
    }

    const { data, error } = await supabase.from("patrimonio").insert(dados).select("codigo")
    if (error) {
      setErro(mensagemSegura(error))
      setSalvando(false)
      return
    }
    setCampos(VAZIO)
    setCadastrado(data?.[0]?.codigo ?? null)
    setSalvando(false)
    router.refresh()
  }

  const grupo = "space-y-5 border-t border-linha pt-5"
  const titulo = "font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]"

  return (
    <form onSubmit={enviar} className="border border-linha p-6 space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className={titulo}>{editando ? "EDITAR ITEM" : "NOVO ITEM"}</p>
        <p className="font-mono text-[11px] tracking-wider text-muted-foreground">
          {editando
            ? `CÓDIGO ${item?.codigo} · NÃO MUDA`
            : "O CÓDIGO (GEAR-NNN) É GERADO SOZINHO"}
        </p>
      </div>

      <fieldset className="space-y-5" disabled={salvando}>
        <legend className="sr-only">Identificação</legend>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor={campo("item")} className={rotuloBase}>Nome</label>
            <input id={campo("item")} required maxLength={LIMITES.item} value={campos.item} onChange={set("item")} className={campoBase} />
          </div>

          <div>
            <label htmlFor={campo("categoria")} className={rotuloBase}>Categoria</label>
            <select id={campo("categoria")} value={campos.categoria} onChange={set("categoria")} className={campoBase}>
              {CATEGORIAS.map((c) => <option key={c} value={c} className="bg-[var(--gear-ink)]">{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor={campo("subcategoria")} className={rotuloBase}>Subcategoria</label>
            <input id={campo("subcategoria")} maxLength={LIMITES.subcategoria} value={campos.subcategoria} onChange={set("subcategoria")} className={campoBase} />
          </div>

          <div>
            <label htmlFor={campo("fabricante")} className={rotuloBase}>Fabricante</label>
            <input id={campo("fabricante")} maxLength={LIMITES.fabricante} value={campos.fabricante} onChange={set("fabricante")} className={campoBase} />
          </div>

          <div>
            <label htmlFor={campo("modelo")} className={rotuloBase}>Modelo</label>
            <input id={campo("modelo")} maxLength={LIMITES.modelo} value={campos.modelo} onChange={set("modelo")} className={campoBase} />
          </div>

          <div>
            <label htmlFor={campo("part_number")} className={rotuloBase}>Part-number</label>
            <input id={campo("part_number")} maxLength={LIMITES.part_number} value={campos.part_number} onChange={set("part_number")} className={campoBase} />
          </div>

          <div>
            <label htmlFor={campo("datasheet_url")} className={rotuloBase}>Link do datasheet</label>
            <input id={campo("datasheet_url")} type="url" inputMode="url" placeholder="https://…" maxLength={LIMITES.datasheet_url} value={campos.datasheet_url} onChange={set("datasheet_url")} className={campoBase} />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={campo("descricao")} className={rotuloBase}>Descrição</label>
            <textarea id={campo("descricao")} rows={3} maxLength={LIMITES.descricao} value={campos.descricao} onChange={set("descricao")} className={`${campoBase} resize-y`} />
          </div>
        </div>
      </fieldset>

      <fieldset className={grupo} disabled={salvando}>
        <legend className={`${titulo} pr-3`}>ESTOQUE E CONSERVAÇÃO</legend>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor={campo("quantidade")} className={rotuloBase}>Quantidade</label>
            <input id={campo("quantidade")} type="number" inputMode="numeric" min="0" step="1" required value={campos.quantidade} onChange={set("quantidade")} className={campoBase} />
            <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
              EM KIT DE PEÇAS, CONTE AS PEÇAS (UM KIT DE 650 CAPACITORES = 650)
            </p>
          </div>

          <div>
            <label htmlFor={campo("valor_estimado")} className={rotuloBase}>Valor unitário estimado (R$)</label>
            <input id={campo("valor_estimado")} type="number" inputMode="decimal" min="0" step="0.01" placeholder="opcional" value={campos.valor_estimado} onChange={set("valor_estimado")} className={campoBase} />
            <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
              ALIMENTA O INSUMO &quot;VALOR DO PATRIMÔNIO&quot; EM /MEMBROS/METRICAS
            </p>
          </div>

          <div>
            <label htmlFor={campo("estado")} className={rotuloBase}>Estado de conservação</label>
            <select id={campo("estado")} value={campos.estado} onChange={set("estado")} className={campoBase}>
              <option value="" className="bg-[var(--gear-ink)]">Não informado</option>
              {ESTADOS.map((s) => <option key={s} value={s} className="bg-[var(--gear-ink)]">{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor={campo("status")} className={rotuloBase}>Status (onde está)</label>
            <select id={campo("status")} value={campos.status} onChange={set("status")} className={campoBase}>
              {STATUS.map((s) => <option key={s} value={s} className="bg-[var(--gear-ink)]">{s}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className={grupo} disabled={salvando}>
        <legend className={`${titulo} pr-3`}>ORIGEM E LOCAL</legend>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor={campo("origem")} className={rotuloBase}>Origem</label>
            <input id={campo("origem")} list={`${id}-origens`} maxLength={LIMITES.origem} value={campos.origem} onChange={set("origem")} className={campoBase} />
            <datalist id={`${id}-origens`}>
              {[...new Set([...ORIGENS_COMUNS, ...origens])].map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>

          <div>
            <label htmlFor={campo("frente_vinculada")} className={rotuloBase}>Frente vinculada</label>
            <select id={campo("frente_vinculada")} value={campos.frente_vinculada} onChange={set("frente_vinculada")} className={campoBase}>
              <option value="" className="bg-[var(--gear-ink)]">Nenhuma</option>
              {FRENTES.map((t) => <option key={t} value={t} className="bg-[var(--gear-ink)]">{t}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor={campo("localizacao")} className={rotuloBase}>Localização</label>
            <input id={campo("localizacao")} maxLength={LIMITES.localizacao} value={campos.localizacao} onChange={set("localizacao")} className={campoBase} />
          </div>

          <div>
            <label htmlFor={campo("responsavel_atual")} className={rotuloBase}>Responsável atual</label>
            <input id={campo("responsavel_atual")} maxLength={LIMITES.responsavel_atual} value={campos.responsavel_atual} onChange={set("responsavel_atual")} className={campoBase} />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={campo("observacoes")} className={rotuloBase}>Observações</label>
            <textarea id={campo("observacoes")} rows={3} maxLength={LIMITES.observacoes} value={campos.observacoes} onChange={set("observacoes")} className={`${campoBase} resize-y`} />
          </div>
        </div>
      </fieldset>

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      {cadastrado && (
        <p role="status" className="font-mono text-xs tracking-wider text-[var(--gear-amber)]">
          CADASTRADO COMO {cadastrado}. COLE ESSE CÓDIGO NA ETIQUETA DO ITEM.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={salvando} data-cursor-hover className={`${botaoPrimario} ${botaoDesabilitavel} min-h-11 !py-3`}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Adicionar item"}
        </button>
        {editando && (
          <button type="button" onClick={aoConcluir} disabled={salvando} className={`${botaoSecundario} min-h-11 !py-3 disabled:opacity-50`}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
