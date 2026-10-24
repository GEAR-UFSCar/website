import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarPlus, Clock, Download, MapPin, Pencil, Repeat, Users, Video, X } from "lucide-react"

import { comEstado, type EstadoCalendario } from "@/lib/agenda"
import {
  diaCompleto,
  linkGoogleAgenda,
  linkSeguro,
  recorrenciaValida,
  rotuloDaRecorrencia,
  rotuloDoHorario,
  type Ocorrencia,
  type RespostaPresenca,
} from "@/lib/calendario"
import { EventoPresenca } from "@/components/evento-presenca"
import { EventoApagar } from "@/components/evento-apagar"
import { FocoNoPainel } from "@/components/evento-painel-foco"
import s from "./calendario-clean.module.css"

/**
 * Casca da gaveta lateral. Fundo e gaveta são irmãos: o fundo é um Link para o
 * calendário sem painel, então clicar fora fecha — sem JavaScript — e Esc
 * (CalendarioAtalhos) faz o mesmo.
 */
export function PainelCasca({
  estado, rotulo, children,
}: { estado: EstadoCalendario; rotulo: string; children: ReactNode }) {
  const fechar = comEstado(estado)()
  return (
    <>
      <Link href={fechar} scroll={false} className={s.painelFundo} aria-label="Fechar painel" tabIndex={-1} />
      <aside className={s.painel} role="dialog" aria-modal="true" aria-label={rotulo} tabIndex={-1} data-painel>
        <FocoNoPainel />
        <div className={s.painelTopo}>
          <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)]">{rotulo.toUpperCase()}</p>
          <Link href={fechar} scroll={false} className={s.iconeBotao} aria-label="Fechar" data-cursor-hover>
            <X size={16} aria-hidden="true" />
          </Link>
        </div>
        {children}
      </aside>
    </>
  )
}

type Pessoa = { usuario_id: string; resposta: RespostaPresenca }

type Props = {
  ocorrencia: Ocorrencia
  estado: EstadoCalendario
  usuarioId: string
  podeEscrever: boolean
  /** Nulo: a tabela de presença não existe ainda (027 não rodou). */
  presencas: Pessoa[] | null
  nomes: Map<string, string>
  criadoPor: string | null
}

const primeiroNome = (nome: string | undefined) => (nome ?? "Membro").split(" ")[0]

export function EventoPainel({ ocorrencia: o, estado, usuarioId, podeEscrever, presencas, nomes, criadoPor }: Props) {
  const e = o.evento
  const href = comEstado(estado)
  const repete = recorrenciaValida(e.recorrencia) !== null
  const recorrencia = rotuloDaRecorrencia(e)
  const link = linkSeguro(e.link)

  const por = (r: RespostaPresenca) => (presencas ?? []).filter((p) => p.resposta === r).map((p) => primeiroNome(nomes.get(p.usuario_id)))
  const minha = (presencas ?? []).find((p) => p.usuario_id === usuarioId)?.resposta ?? null

  return (
    <PainelCasca estado={estado} rotulo="Evento">
      <div>
        <div className={s.painelEtiquetas} style={{ marginBottom: 10 }}>
          <span className={s.pill}>{e.tipo}</span>
          <span className={s.pill}>{e.frente_vinculada ?? "Geral"}</span>
        </div>
        <h2 className={s.painelTitulo}>{e.titulo}</h2>
      </div>

      <div className={s.painelLinhas}>
        <div className={s.painelLinha}>
          <Clock size={16} aria-hidden="true" />
          <div>
            <p>{diaCompleto(o.dia)}</p>
            <p className={s.painelSub}>{rotuloDoHorario(o)} · horário de Brasília</p>
          </div>
        </div>

        {recorrencia && (
          <div className={s.painelLinha}>
            <Repeat size={16} aria-hidden="true" />
            <div>
              <p>{recorrencia}</p>
              <p className={s.painelSub}>Você está vendo a ocorrência de {diaCompleto(o.dia)}.</p>
            </div>
          </div>
        )}

        {e.local && (
          <div className={s.painelLinha}>
            <MapPin size={16} aria-hidden="true" />
            <p>{e.local}</p>
          </div>
        )}

        {link && (
          <div className={s.painelLinha}>
            <Video size={16} aria-hidden="true" />
            <p>
              <a href={link} target="_blank" rel="noopener noreferrer" className={s.painelLink}>
                {link.replace(/^https?:\/\//, "")}
              </a>
            </p>
          </div>
        )}
      </div>

      {e.descricao && <p className={s.painelDescricao}>{e.descricao}</p>}

      <section className={s.painelSecao} aria-label="Presença">
        <h3>Você vai?</h3>
        {presencas === null ? (
          <p className={s.painelAviso}>
            A confirmação de presença depende da migração <code>supabase/027_calendario_completo.sql</code>, ainda
            não aplicada neste banco.
          </p>
        ) : (
          <>
            <EventoPresenca key={`${e.id}-${o.dia}`} eventoId={e.id} dia={o.dia} usuarioId={usuarioId} atual={minha} />
            <div className={s.pessoas}>
              <p style={{ margin: 0 }}><Users size={13} aria-hidden="true" style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
                <strong>{por("vou").length}</strong> vão{por("vou").length ? `: ${por("vou").join(", ")}` : ""}
              </p>
              {por("talvez").length > 0 && <p style={{ margin: "4px 0 0" }}><strong>{por("talvez").length}</strong> talvez: {por("talvez").join(", ")}</p>}
              {por("nao").length > 0 && <p style={{ margin: "4px 0 0" }}><strong>{por("nao").length}</strong> não vão: {por("nao").join(", ")}</p>}
            </div>
            <p className={s.painelSub} style={{ marginTop: 8 }}>
              É confirmação de presença, não registro de frequência.
            </p>
          </>
        )}
      </section>

      <div className={s.painelAcoes}>
        <a href={linkGoogleAgenda(o)} target="_blank" rel="noopener noreferrer" className={s.acao} data-cursor-hover>
          <CalendarPlus size={15} aria-hidden="true" /> Google Agenda
        </a>
        <a href={`/membros/calendario/ics?evento=${e.id}`} className={s.acao} data-cursor-hover download>
          <Download size={15} aria-hidden="true" /> Baixar .ics
        </a>
        {podeEscrever && (
          <Link
            href={href({ evento: e.id, ocorrencia: o.dia, editar: true })}
            scroll={false}
            className={s.acao}
            data-cursor-hover
          >
            <Pencil size={15} aria-hidden="true" /> Editar
          </Link>
        )}
      </div>

      {podeEscrever && <EventoApagar id={e.id} repete={repete} destino={href()} />}

      {criadoPor && <p className={s.painelSub}>Criado por {criadoPor}.</p>}
    </PainelCasca>
  )
}
