"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { TIPOS_EVENTO, FRENTES } from "@/lib/administracao"
import { campoBase, rotuloBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { hrefCalendario, type EstadoCalendario } from "@/lib/agenda"
import {
  RECORRENCIAS,
  ROTULO_RECORRENCIA,
  ehDiaValido,
  instanteGear,
  linkSeguro,
  numeroDoDia,
  partesGear,
  recorrenciaValida,
  type EventoCal,
} from "@/lib/calendario"

type Props = {
  usuarioId: string
  /** Estado da URL, para voltar ao mesmo período (e abrir o evento) depois de salvar. */
  estado: EstadoCalendario
  /** Dia que vem preenchido num evento novo: o que a pessoa estava olhando. */
  diaPadrao: string
  /** Presente = edição. Ausente = evento novo. */
  inicial?: EventoCal
  /** Falso enquanto a 027 não rodou: os campos novos ficam desligados. */
  migrado: boolean
}

const HORA_PADRAO = "18:00"

/** "19:30" → 1170. Vazio ou inválido → null. */
function minutosDe(hora: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

function camposIniciais(inicial: EventoCal | undefined, diaPadrao: string) {
  if (!inicial) {
    return {
      titulo: "", descricao: "", tipo: TIPOS_EVENTO[0] as string, frente: "", diaInteiro: false,
      diaIni: diaPadrao, horaIni: HORA_PADRAO, diaFim: "", horaFim: "",
      local: "", link: "", recorrencia: "", ate: "",
    }
  }
  const ini = partesGear(inicial.data_inicio)
  const fim = inicial.data_fim ? partesGear(inicial.data_fim) : null
  const diaInteiro = Boolean(inicial.dia_inteiro)
  return {
    titulo: inicial.titulo,
    descricao: inicial.descricao ?? "",
    tipo: inicial.tipo,
    frente: inicial.frente_vinculada ?? "",
    diaInteiro,
    diaIni: ini.dia,
    horaIni: diaInteiro ? HORA_PADRAO : ini.hora,
    // Dia de fim igual ao de início fica vazio: é o jeito de dizer "no mesmo dia".
    diaFim: fim && fim.dia !== ini.dia ? fim.dia : "",
    horaFim: fim && !diaInteiro ? fim.hora : "",
    local: inicial.local ?? "",
    link: inicial.link ?? "",
    recorrencia: recorrenciaValida(inicial.recorrencia) ?? "",
    ate: inicial.recorrencia_ate ?? "",
  }
}

export function EventoForm({ usuarioId, estado, diaPadrao, inicial, migrado }: Props) {
  const router = useRouter()
  const editando = Boolean(inicial)
  const [campos, setCampos] = useState(() => camposIniciais(inicial, diaPadrao))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const set =
    (chave: keyof typeof campos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setCampos((a) => ({ ...a, [chave]: e.target.value }))

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)

    if (!ehDiaValido(campos.diaIni)) return setErro("Informe o dia de início.")

    let data_inicio: string
    let data_fim: string | null = null

    if (campos.diaInteiro) {
      data_inicio = instanteGear(campos.diaIni, 0)
      if (campos.diaFim) {
        if (!ehDiaValido(campos.diaFim) || numeroDoDia(campos.diaFim) < numeroDoDia(campos.diaIni)) {
          return setErro("O último dia não pode ser antes do primeiro.")
        }
        if (campos.diaFim !== campos.diaIni) data_fim = instanteGear(campos.diaFim, 0)
      }
    } else {
      const ini = minutosDe(campos.horaIni)
      if (ini == null) return setErro("Informe a hora de início.")
      data_inicio = instanteGear(campos.diaIni, ini)

      if (campos.horaFim || campos.diaFim) {
        const fim = minutosDe(campos.horaFim)
        if (fim == null) return setErro("Informe a hora de fim, ou apague o dia de fim.")
        const diaFim = campos.diaFim || campos.diaIni
        if (!ehDiaValido(diaFim)) return setErro("O dia de fim não existe.")
        data_fim = instanteGear(diaFim, fim)
        // O CHECK do banco aceita fim == início, mas um evento de duração zero é quase sempre engano.
        if (Date.parse(data_fim) <= Date.parse(data_inicio)) return setErro("O fim precisa ser depois do início.")
      }
    }

    const link = campos.link.trim()
    if (link && !linkSeguro(link)) return setErro("O link precisa começar com http:// ou https://.")

    const recorrencia = recorrenciaValida(campos.recorrencia)
    if (recorrencia && campos.ate) {
      if (!ehDiaValido(campos.ate) || numeroDoDia(campos.ate) < numeroDoDia(campos.diaIni)) {
        return setErro("A repetição não pode terminar antes do primeiro dia do evento.")
      }
    }

    const local = campos.local.trim()
    const usaCampoNovo = Boolean(local || link || campos.diaInteiro || recorrencia)
    if (!migrado && usaCampoNovo) {
      return setErro(
        "Local, link, dia inteiro e repetição precisam da migração 027 no Supabase, que ainda não foi aplicada. Crie o evento sem eles por enquanto.",
      )
    }

    const base = {
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim() || null,
      tipo: campos.tipo,
      data_inicio,
      data_fim,
      // vazio = evento geral da entidade, não de uma frente
      frente_vinculada: campos.frente || null,
    }
    // Em banco sem a 027 nem os nomes das colunas novas podem ir no corpo: o PostgREST recusa a coluna.
    const novos = migrado
      ? { local: local || null, link: link || null, dia_inteiro: campos.diaInteiro, recorrencia, recorrencia_ate: recorrencia && campos.ate ? campos.ate : null }
      : {}

    setSalvando(true)
    const supabase = createClient()
    let id = inicial?.id ?? null

    if (inicial) {
      const { error } = await supabase.from("eventos").update({ ...base, ...novos }).eq("id", inicial.id)
      if (error) {
        setErro(mensagemSegura(error))
        setSalvando(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from("eventos")
        .insert({
          ...base,
          ...novos,
          /*
           * Mandado por compatibilidade com bancos em que a 016 ainda não rodou.
           * Depois dela o valor é irrelevante: o trigger de autoria sobrescreve
           * esta coluna com auth.uid() antes de gravar. Não confie neste campo
           * como prova de autoria, a prova está no banco.
           */
          criado_por: usuarioId,
        })
        .select("id")
        .single()
      if (error) {
        setErro(mensagemSegura(error))
        setSalvando(false)
        return
      }
      id = (data as { id: string }).id
    }

    // Vai para o dia do evento com o painel dele aberto: o que a pessoa acabou de fazer fica à vista.
    router.push(
      hrefCalendario({
        ...estado,
        dia: campos.diaIni,
        evento: id,
        ocorrencia: editando ? (estado.ocorrencia ?? campos.diaIni) : campos.diaIni,
        novo: false,
        editar: false,
      }),
    )
    router.refresh()
  }

  const desligado = !migrado
  const dicaNova = desligado ? "Precisa da migração 027." : undefined

  return (
    <form onSubmit={enviar} className="space-y-5" aria-label={editando ? "Editar evento" : "Novo evento"}>
      <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)]">
        {editando ? "EDITAR EVENTO" : "NOVO EVENTO"}
      </p>

      {desligado && (
        <p className="border border-linha p-3 font-sans text-xs font-light text-muted-foreground">
          Local, link, dia inteiro e repetição aparecem quando o banco recebe a migração{" "}
          <code>supabase/027_calendario_completo.sql</code>.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="ev-titulo" className={rotuloBase}>Título</label>
          <input
            id="ev-titulo" required maxLength={200} value={campos.titulo}
            onChange={set("titulo")} disabled={salvando} className={campoBase} autoFocus={!editando}
          />
        </div>

        <div>
          <label htmlFor="ev-tipo" className={rotuloBase}>Tipo</label>
          <select id="ev-tipo" value={campos.tipo} onChange={set("tipo")} disabled={salvando} className={campoBase}>
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t} className="bg-[var(--gear-ink)]">{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ev-frente" className={rotuloBase}>Frente</label>
          <select id="ev-frente" value={campos.frente} onChange={set("frente")} disabled={salvando} className={campoBase}>
            <option value="" className="bg-[var(--gear-ink)]">Geral (toda a entidade)</option>
            {FRENTES.map((t) => (
              <option key={t} value={t} className="bg-[var(--gear-ink)]">{t}</option>
            ))}
          </select>
        </div>

        <label className="flex min-h-11 items-center gap-3 sm:col-span-2" title={dicaNova}>
          <input
            type="checkbox" checked={campos.diaInteiro} disabled={salvando || desligado}
            onChange={(e) => setCampos((a) => ({ ...a, diaInteiro: e.target.checked }))}
            className="h-4 w-4 accent-[var(--gear-amber)]"
          />
          <span className="font-sans text-sm font-light text-foreground">Dia inteiro (sem hora marcada)</span>
        </label>

        <div>
          <label htmlFor="ev-dia-ini" className={rotuloBase}>{campos.diaInteiro ? "Primeiro dia" : "Início"}</label>
          <input
            id="ev-dia-ini" type="date" required value={campos.diaIni} onChange={set("diaIni")}
            disabled={salvando} className={campoBase}
          />
        </div>
        {!campos.diaInteiro && (
          <div>
            <label htmlFor="ev-hora-ini" className={rotuloBase}>Hora de início</label>
            <input
              id="ev-hora-ini" type="time" required value={campos.horaIni} onChange={set("horaIni")}
              disabled={salvando} className={campoBase}
            />
          </div>
        )}

        <div>
          <label htmlFor="ev-dia-fim" className={rotuloBase}>
            {campos.diaInteiro ? "Último dia (opcional)" : "Dia de fim (opcional)"}
          </label>
          <input
            id="ev-dia-fim" type="date" value={campos.diaFim} min={campos.diaIni} onChange={set("diaFim")}
            disabled={salvando} className={campoBase}
          />
        </div>
        {!campos.diaInteiro && (
          <div>
            <label htmlFor="ev-hora-fim" className={rotuloBase}>Hora de fim (opcional)</label>
            <input
              id="ev-hora-fim" type="time" value={campos.horaFim} onChange={set("horaFim")}
              disabled={salvando} className={campoBase}
            />
          </div>
        )}

        <div>
          <label htmlFor="ev-recorrencia" className={rotuloBase}>Repetição</label>
          <select
            id="ev-recorrencia" value={campos.recorrencia} onChange={set("recorrencia")}
            disabled={salvando || desligado} title={dicaNova} className={campoBase}
          >
            <option value="" className="bg-[var(--gear-ink)]">Não repete</option>
            {RECORRENCIAS.map((r) => (
              <option key={r} value={r} className="bg-[var(--gear-ink)]">{ROTULO_RECORRENCIA[r]}</option>
            ))}
          </select>
        </div>
        {campos.recorrencia && (
          <div>
            <label htmlFor="ev-ate" className={rotuloBase}>Repetir até (opcional)</label>
            <input
              id="ev-ate" type="date" value={campos.ate} min={campos.diaIni} onChange={set("ate")}
              disabled={salvando} className={campoBase}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="ev-local" className={rotuloBase}>Local (opcional)</label>
          <input
            id="ev-local" maxLength={200} value={campos.local} onChange={set("local")}
            disabled={salvando || desligado} title={dicaNova} placeholder="Sala, laboratório, online…" className={campoBase}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ev-link" className={rotuloBase}>Link da reunião ou do material (opcional)</label>
          <input
            id="ev-link" type="url" maxLength={500} value={campos.link} onChange={set("link")}
            disabled={salvando || desligado} title={dicaNova} placeholder="https://" className={campoBase}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ev-descricao" className={rotuloBase}>Descrição (opcional)</label>
          <textarea
            id="ev-descricao" rows={4} maxLength={20000} value={campos.descricao} onChange={set("descricao")}
            disabled={salvando} className={`${campoBase} resize-y`}
          />
        </div>
      </div>

      {editando && campos.recorrencia && (
        <p className="font-sans text-xs font-light text-muted-foreground">
          A mudança vale para a série inteira. O calendário ainda não edita uma repetição isolada.
        </p>
      )}

      {erro && (
        <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
          <p className="font-sans text-sm font-light text-foreground">{erro}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={salvando}
        data-cursor-hover
        className="border border-[var(--gear-amber)] bg-transparent px-8 py-3 font-mono text-sm uppercase tracking-widest text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50"
      >
        {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar evento"}
      </button>
    </form>
  )
}
