import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { EventoForm } from "@/components/evento-form"
import { createClient } from "@/lib/supabase/server"
import { dataHora, inicioDeHoje } from "@/lib/datas"
import { exigirPerfilCompleto } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Calendário | GEAR",
  robots: { index: false, follow: false },
}

type Evento = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  data_inicio: string
  data_fim: string | null
  trilha_vinculada: string | null
}


export default async function CalendarioPage() {
  const { user, perfil } = await exigirPerfilCompleto()
  // Portão só da tela; a RLS de 008 é quem barra de fato.
  const podeEscrever = temCargo(perfil?.cargo)

  const supabase = await createClient()
  const corte = inicioDeHoje()

  const [{ data: proximos, error }, { data: passados }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, descricao, tipo, data_inicio, data_fim, trilha_vinculada")
      .gte("data_inicio", corte)
      .order("data_inicio", { ascending: true }),
    supabase
      .from("eventos")
      .select("id, titulo, descricao, tipo, data_inicio, data_fim, trilha_vinculada")
      .lt("data_inicio", corte)
      .order("data_inicio", { ascending: false })
      .limit(10),
  ])

  const agenda = (proximos ?? []) as Evento[]
  const historico = (passados ?? []) as Evento[]

  const linha = (evento: Evento) => (
    <article key={evento.id} className="border-t border-white/10 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <div className="flex-1">
          <h3 className="font-sans text-lg md:text-xl font-light leading-snug">{evento.titulo}</h3>
          <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {dataHora(evento.data_inicio)}
            {evento.data_fim ? ` → ${dataHora(evento.data_fim)}` : ""}
          </p>
          {evento.descricao && (
            <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground whitespace-pre-line">
              {evento.descricao}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <span className="border border-white/20 px-2 py-1 font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            {evento.tipo}
          </span>
          {/* null = evento geral da entidade, não de uma trilha */}
          <span className="border border-[var(--gear-amber)] px-2 py-1 font-mono text-[9px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
            {evento.trilha_vinculada ?? "Geral"}
          </span>
        </div>
      </div>
    </article>
  )

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Calendário
            <br />
            <span className="italic">da entidade</span>
          </h1>

          <p className="mt-12 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
            Reuniões, sprints e prazos. Qualquer membro lê; criar evento é de quem tem cargo.
          </p>

          <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {agenda.length} EVENTO(S) À FRENTE
          </p>

          {error && (
            <Aviso titulo="CALENDÁRIO INDISPONÍVEL" className="mt-10 max-w-2xl">
              {error.message}. Se a tabela não existe, rode{" "}
              <code>supabase/008_eventos_avisos_sprints.sql</code> no SQL Editor do painel.
            </Aviso>
          )}

          <section className="mt-16 max-w-4xl">
            <div className="border-t border-white/10 pt-8">
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                01 — A SEGUIR
              </p>
              <h2 className="font-sans text-2xl md:text-4xl font-light italic">Próximos</h2>
            </div>

            <div className="mt-8">
              {agenda.length === 0 && !error ? (
                <p className="font-sans text-sm font-light text-muted-foreground">
                  Nenhum evento marcado daqui para frente.
                </p>
              ) : (
                agenda.map(linha)
              )}
            </div>
          </section>

          {historico.length > 0 && (
            <section className="mt-16 max-w-4xl">
              <div className="border-t border-white/10 pt-8">
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                  02 — JÁ ACONTECERAM
                </p>
                <h2 className="font-sans text-2xl md:text-4xl font-light italic">Anteriores</h2>
              </div>
              <div className="mt-8 opacity-60">{historico.map(linha)}</div>
            </section>
          )}

          {podeEscrever && (
            <div className="mt-14 max-w-4xl">
              <EventoForm usuarioId={user.id} />
            </div>
          )}

          <div className="mt-16">
            <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
              Voltar para membros
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
