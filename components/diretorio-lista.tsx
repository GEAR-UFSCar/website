"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Surge } from "@/components/surge"
import { temCargo } from "@/lib/administracao"
import { normalizar } from "@/lib/documentos-catalogo"
import { campoBase } from "@/lib/ui"

export type MembroDiretorio = {
  id: string
  nome_completo: string | null
  curso: string | null
  frente: string | null
  cargo: string | null
  /** Contato opcional, preenchido pelo próprio membro (032). */
  whatsapp: string | null
  github: string | null
  linkedin: string | null
  /** Grupo já decidido no servidor (frente, Diretoria ou Em formação). */
  grupo: string
}

type Grupo = { chave: string; rotulo: string }

/**
 * Lista de pessoas com busca e filtro por grupo.
 *
 * Filtra no navegador, pelo mesmo motivo do quadro de sprints: o servidor já
 * trouxe todos os perfis (dezenas, não milhares), e refazer a consulta a cada
 * tecla só devolveria linhas que já estão na memória.
 *
 * A busca ignora acento e caixa ("joao" acha "João") e olha nome, curso,
 * frente e cargo. As contagens dos chips seguem a BUSCA, não o total, para o
 * número nunca prometer uma pessoa que o filtro não mostra.
 */
export function DiretorioLista({
  membros,
  grupos,
  focar = false,
}: {
  membros: MembroDiretorio[]
  grupos: readonly Grupo[]
  /** Vem do atalho "Buscar pessoa" do Ctrl K: abre a página com a busca em foco. */
  focar?: boolean
}) {
  const [busca, setBusca] = useState("")
  const [grupo, setGrupo] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focar) campo.current?.focus()
  }, [focar])

  const porBusca = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean)
    if (termos.length === 0) return membros
    return membros.filter((m) => {
      const palheiro = normalizar(
        [m.nome_completo, m.curso, m.frente, m.cargo, m.grupo].filter(Boolean).join(" "),
      )
      return termos.every((t) => palheiro.includes(t))
    })
  }, [membros, busca])

  const contagens = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of porBusca) mapa.set(m.grupo, (mapa.get(m.grupo) ?? 0) + 1)
    return mapa
  }, [porBusca])

  const visiveis = grupo ? porBusca.filter((m) => m.grupo === grupo) : porBusca
  const gruposComGente = grupos.filter((g) => membros.some((m) => m.grupo === g.chave))

  return (
    <>
      <div className="mt-8 max-w-4xl">
        <label htmlFor="busca-pessoas" className="sr-only">
          Buscar pessoa por nome, curso, frente ou cargo
        </label>
        <input
          id="busca-pessoas"
          ref={campo}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, curso, frente ou cargo…"
          className={`${campoBase} min-h-11 placeholder:text-muted-foreground/50`}
        />

        <div role="group" aria-label="Filtrar por grupo" className="mt-4 flex flex-wrap gap-2">
          {[{ chave: null as string | null, rotulo: "Todos" }, ...gruposComGente].map((g) => {
            const ativo = g.chave === grupo
            const quantos = g.chave === null ? porBusca.length : (contagens.get(g.chave) ?? 0)
            return (
              <button
                key={g.rotulo}
                type="button"
                onClick={() => setGrupo(g.chave)}
                aria-pressed={ativo}
                className={`min-h-11 border px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                  ativo
                    ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                    : "border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {g.rotulo}
                <span className="ml-2 tabular-nums opacity-70">{quantos}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Anunciado por leitor de tela: o filtro muda a lista sem recarregar. */}
      <p aria-live="polite" className="mt-6 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {visiveis.length} {visiveis.length === 1 ? "PESSOA" : "PESSOAS"}
      </p>

      {visiveis.length === 0 && (
        <p className="mt-8 max-w-2xl font-sans text-sm font-light text-muted-foreground">
          Ninguém corresponde à busca e ao filtro escolhidos.
        </p>
      )}

      {grupos.map((g) => {
        const doGrupo = visiveis.filter((m) => m.grupo === g.chave)
        if (doGrupo.length === 0) return null

        return (
          <section key={g.chave} className="mt-12">
            <div className="border-t border-linha pt-6">
              <h2 className="font-sans text-xl font-normal tracking-tight md:text-2xl">{g.rotulo}</h2>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-3">
              {doGrupo.map((membro, i) => (
                <Surge
                  as="li"
                  index={i}
                  key={membro.id}
                  className="border border-linha p-6 transition-colors duration-300 hover:border-[var(--gear-amber)]"
                >
                  <p className="break-words font-sans text-lg font-light leading-snug">
                    {membro.nome_completo?.trim() || "Sem nome preenchido"}
                  </p>

                  <dl className="mt-4 space-y-3">
                    <div>
                      <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground md:text-[9px]">
                        Curso
                      </dt>
                      <dd className="mt-0.5 break-words font-mono text-[11px] text-foreground">
                        {membro.curso?.trim() || "não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground md:text-[9px]">
                        Frente
                      </dt>
                      <dd className="mt-0.5 font-mono text-[11px] text-foreground">
                        {membro.frente?.trim() || "a definir"}
                      </dd>
                    </div>
                  </dl>

                  {(membro.whatsapp || membro.github || membro.linkedin) && (
                    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                      {[
                        // os formatos são garantidos pelos CHECKs da 032, então os hrefs são seguros
                        membro.whatsapp && { rotulo: "WhatsApp", href: `https://wa.me/${membro.whatsapp.length <= 11 ? `55${membro.whatsapp}` : membro.whatsapp}` },
                        membro.github && { rotulo: "GitHub", href: `https://github.com/${membro.github}` },
                        membro.linkedin?.startsWith("https://") && { rotulo: "LinkedIn", href: membro.linkedin },
                      ]
                        .filter((l): l is { rotulo: string; href: string } => Boolean(l))
                        .map((l) => (
                          <li key={l.rotulo}>
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-cursor-hover
                              className="inline-flex min-h-11 items-center font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline md:min-h-0"
                            >
                              {l.rotulo} ↗
                            </a>
                          </li>
                        ))}
                    </ul>
                  )}

                  {temCargo(membro.cargo) && (
                    <p className="mt-4 inline-block border border-[var(--gear-amber)] px-2 py-1 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] md:text-[9px]">
                      {membro.cargo}
                    </p>
                  )}
                </Surge>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
