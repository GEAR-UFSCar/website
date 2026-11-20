import type { Metadata } from "next"

import { createClientePublico } from "@/lib/supabase/publico"
import { hojeISO } from "@/lib/datas"
import { diaCompleto, ocorrencias, rotuloDoHorario, somarDias, type EventoCal, type Ocorrencia } from "@/lib/calendario"
import { OG_IMAGE } from "@/lib/site"
import { linkNoTexto } from "@/lib/ui"

const DESCRICAO =
  "Oficinas, apresentações e eventos abertos do GEAR UFSCar Sorocaba nos próximos meses: data, horário e local."

export const metadata: Metadata = {
  title: "Agenda | GEAR",
  description: DESCRICAO,
  openGraph: { title: "Agenda | GEAR", description: DESCRICAO, url: "/agenda", images: [OG_IMAGE] },
}

// A agenda muda quando alguém marca evento como público; 10 min é atraso aceitável.
export const revalidate = 600

const JANELA_DIAS = 120

/**
 * Eventos que a entidade marcou "Mostrar no site" no Calendário (038). A view
 * agenda_publica já entrega só o recorte publicável; a repetição é expandida
 * aqui pela mesma função do calendário interno, para as duas telas concordarem.
 */
async function proximos(): Promise<Ocorrencia[] | null> {
  const supabase = createClientePublico()
  if (!supabase) return null
  const { data, error } = await supabase.from("agenda_publica").select("*")
  if (error) return null

  const de = hojeISO()
  const ate = somarDias(de, JANELA_DIAS)
  return (data as EventoCal[])
    .flatMap((e) => ocorrencias({ ...e, frente_vinculada: null }, de, ate))
    .sort((a, b) => a.inicioISO.localeCompare(b.inicioISO))
}

export default async function AgendaPage() {
  const lista = await proximos()

  return (
    <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ABERTO AO PÚBLICO</p>
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">Agenda</h1>

      <p className="mt-8 max-w-[62ch] font-sans text-lg font-light leading-relaxed text-muted-foreground">
        Oficinas, apresentações e eventos do GEAR em que qualquer pessoa pode aparecer. Reuniões internas não
        entram aqui.
      </p>

      {!lista || lista.length === 0 ? (
        <p className="mt-16 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
          Nenhum evento aberto marcado para os próximos meses. Os anúncios saem primeiro no{" "}
          <a href="https://www.instagram.com/gear.ufscar/" target="_blank" rel="noopener noreferrer" className={linkNoTexto}>
            Instagram
          </a>
          .
        </p>
      ) : (
        <ul className="mt-16 divide-y divide-linha border-y border-linha">
          {lista.map((o) => (
            <li key={`${o.evento.id}-${o.dia}`} className="grid gap-2 py-8 md:grid-cols-[14rem_1fr] md:gap-8">
              <div>
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--gear-amber)]">{diaCompleto(o.dia)}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{rotuloDoHorario(o)}</p>
              </div>
              <div>
                <h2 className="font-sans text-xl md:text-2xl font-light">{o.evento.titulo}</h2>
                {o.evento.local && (
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{o.evento.local}</p>
                )}
                {o.evento.descricao && (
                  <p className="mt-3 max-w-[62ch] whitespace-pre-line font-sans text-base font-light leading-relaxed text-muted-foreground">
                    {o.evento.descricao}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
