import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { ModuloCheckbox } from "@/components/modulo-checkbox"
import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { exigirPerfilCompleto } from "@/lib/supabase/sessao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Aprendizagem | GEAR",
  robots: { index: false, follow: false },
}

/** Ordem dos níveis na tela — o banco não tem como saber essa hierarquia. */
const NIVEIS = ["Fundamental", "Principal", "Avançada"] as const

type Modulo = {
  id: string
  nivel: string
  ordem: number
  titulo: string
  descricao: string | null
  conteudo_url: string | null
}

type Progresso = {
  modulo_id: string
  concluido_em: string | null
}

export default async function AprendizagemPage() {
  // mesmo portão de /membros: sem sessão vai ao login, perfil incompleto ao
  // formulário de primeiro acesso.
  const { user } = await exigirPerfilCompleto()

  const supabase = await createClient()
  const [{ data: modulos, error: erroModulos }, { data: progresso }] = await Promise.all([
    supabase.from("modulos").select("id, nivel, ordem, titulo, descricao, conteudo_url").order("ordem"),
    supabase.from("progresso").select("modulo_id, concluido_em").eq("usuario_id", user.id),
  ])

  const concluidos = new Set(
    ((progresso ?? []) as Progresso[]).filter((p) => p.concluido_em).map((p) => p.modulo_id),
  )

  const lista = (modulos ?? []) as Modulo[]
  const total = lista.length
  const feitos = lista.filter((m) => concluidos.has(m.id)).length
  const percentual = total > 0 ? Math.round((feitos / total) * 100) : 0

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <Surge>
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ACADEMIA GEAR</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Sua
            <br />
            <span className="italic">aprendizagem</span>
          </h1>

          {/* Barra de progresso */}
          <div className="mt-10 max-w-2xl">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
                {feitos} DE {total} MÓDULOS CONCLUÍDOS
              </p>
              <p className="font-mono text-xs tracking-[0.2em] text-[var(--gear-amber)]">{percentual}%</p>
            </div>
            <div
              className="mt-3 h-1 w-full bg-[var(--gear-navy)]"
              role="progressbar"
              aria-valuenow={feitos}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="Módulos concluídos"
            >
              <div
                className="h-full bg-[var(--gear-amber)] transition-all duration-500"
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>
          </Surge>

          {erroModulos && (
            <Aviso titulo="MÓDULOS INDISPONÍVEIS" className="mt-10 max-w-2xl">
              {erroModulos.message}. Rode <code>supabase/002_academia.sql</code> no SQL Editor do
              painel — ele cria as tabelas e cadastra os 9 módulos.
            </Aviso>
          )}

          {/* Uma seção por nível */}
          {NIVEIS.map((nivel, indiceNivel) => {
            const doNivel = lista
              .filter((m) => m.nivel === nivel)
              .sort((a, b) => a.ordem - b.ordem)

            if (doNivel.length === 0) return null

            return (
              <section key={nivel} className="mt-16">
                <div className="border-t border-white/10 pt-8">
                  <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                    0{indiceNivel + 1} — NÍVEL {nivel.toUpperCase()}
                  </p>
                  <h2 className="font-sans text-2xl md:text-4xl font-light italic">{nivel}</h2>
                </div>

                <ul className="mt-8 space-y-px">
                  {doNivel.map((modulo, indice) => {
                    const concluido = concluidos.has(modulo.id)
                    // sequencial dentro do nível: todos os anteriores feitos
                    const liberado = doNivel.slice(0, indice).every((m) => concluidos.has(m.id))

                    return (
                      <Surge
                        as="li"
                        index={indice}
                        key={modulo.id}
                        className={`flex gap-5 border-t border-white/10 py-6 ${
                          concluido || liberado ? "" : "opacity-45"
                        }`}
                      >
                        <ModuloCheckbox
                          usuarioId={user.id}
                          moduloId={modulo.id}
                          concluido={concluido}
                          liberado={liberado}
                        />

                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                            <h3
                              className={`font-sans text-lg md:text-xl font-light leading-snug ${
                                concluido ? "text-muted-foreground line-through" : ""
                              }`}
                            >
                              <span className="font-mono text-xs text-[var(--gear-amber)] mr-3">
                                {modulo.ordem}
                              </span>
                              {modulo.titulo}
                            </h3>

                            {!concluido && !liberado && (
                              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground shrink-0">
                                BLOQUEADO
                              </span>
                            )}
                          </div>

                          {modulo.descricao && (
                            <p className="mt-2 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                              {modulo.descricao}
                            </p>
                          )}

                          {modulo.conteudo_url && (
                            <a
                              href={modulo.conteudo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-cursor-hover
                              className="mt-3 inline-block font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                            >
                              ABRIR MATERIAL →
                            </a>
                          )}
                        </div>
                      </Surge>
                    )
                  })}
                </ul>
              </section>
            )
          })}

          <div className="mt-16">
            <Link
              href="/membros"
              data-cursor-hover
              className={`inline-block ${botaoSecundario}`}
            >
              Voltar para membros
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
