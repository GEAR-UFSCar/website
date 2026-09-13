import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Diretório | GEAR",
  robots: { index: false, follow: false },
}

/*
 * Ordem dos grupos na tela. "Diretoria" junta quem tem cargo mas ainda não
 * definiu frente. "Em formação" recolhe quem não tem nem cargo nem frente —
 * sem esse grupo, quem está na Academia sumiria de um diretório que existe
 * justamente para as pessoas se acharem.
 */
const GRUPOS = [
  { chave: "Competição", rotulo: "Competição" },
  { chave: "Pesquisa", rotulo: "Pesquisa" },
  { chave: "Projetos", rotulo: "Projetos" },
  { chave: "Diretoria", rotulo: "Diretoria" },
  { chave: "Em formação", rotulo: "Em formação" },
] as const

type Membro = {
  id: string
  nome_completo: string | null
  curso: string | null
  frente: string | null
  cargo: string | null
}

/** Frente manda; sem frente, cargo joga na Diretoria; sem os dois, formação. */
function grupoDe(membro: Membro) {
  const frente = membro.frente?.trim()
  if (frente) return frente
  return temCargo(membro.cargo) ? "Diretoria" : "Em formação"
}

export default async function DiretorioPage() {
  await exigirMembroAprovado()

  const supabase = await createClient()
  // Sem e-mail na consulta: a coluna não existe em `perfis` e não deve existir.
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome_completo, curso, frente, cargo")
    .order("nome_completo", { nullsFirst: false })

  const membros = (data ?? []) as Membro[]

  const porGrupo = new Map<string, Membro[]>()
  for (const membro of membros) {
    const grupo = grupoDe(membro)
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), membro])
  }

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <Surge>
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Diretório
            <br />
            <span className="italic">de membros</span>
          </h1>

          <p className="mt-12 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
            Quem está na GEAR e em que frente. Nome, curso, frente e cargo — nada de contato pessoal:
            e-mail não aparece aqui para ninguém.
          </p>

          <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {membros.length} MEMBRO(S)
          </p>
          </Surge>

          {error && (
            <ErroDados titulo="DIRETÓRIO INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
              Se a tabela não existe, rode <code>supabase/001_perfis.sql</code>. Se ela existe mas só
              a sua linha aparece, falta rodar <code>supabase/009_diretorio.sql</code> — é ele que
              libera a leitura dos perfis para todos os membros.
            </ErroDados>
          )}

          {!error && membros.length <= 1 && (
            <Aviso titulo="SÓ VOCÊ APARECE" tom="neutro" className="mt-10 max-w-2xl">
              A lista veio com {membros.length} perfil(s). Se a entidade já tem mais gente
              cadastrada, a política de leitura ainda é a antiga — rode{" "}
              <code>supabase/009_diretorio.sql</code> no SQL Editor.
            </Aviso>
          )}

          {/* Uma seção por grupo */}
          {GRUPOS.map((grupo, indice) => {
            const doGrupo = porGrupo.get(grupo.chave)
            if (!doGrupo?.length) return null

            return (
              <section key={grupo.chave} className="mt-16">
                <div className="border-t border-white/10 pt-8">
                  <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                    0{indice + 1} — {grupo.rotulo.toUpperCase()} · {doGrupo.length}
                  </p>
                  <h2 className="font-sans text-2xl md:text-4xl font-light italic">{grupo.rotulo}</h2>
                </div>

                <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
                  {doGrupo.map((membro, i) => (
                    <Surge
                      as="li"
                      index={i}
                      key={membro.id}
                      className="border border-white/10 p-6 transition-colors duration-300 hover:border-[var(--gear-amber)]"
                    >
                      <p className="font-sans text-lg font-light leading-snug break-words">
                        {membro.nome_completo?.trim() || "Sem nome preenchido"}
                      </p>

                      <dl className="mt-4 space-y-3">
                        <div>
                          <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                            Curso
                          </dt>
                          <dd className="font-mono text-[11px] text-foreground mt-0.5 break-words">
                            {membro.curso?.trim() || "não informado"}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                            Frente
                          </dt>
                          <dd className="font-mono text-[11px] text-foreground mt-0.5">
                            {membro.frente?.trim() || "a definir"}
                          </dd>
                        </div>
                      </dl>

                      {temCargo(membro.cargo) && (
                        <p className="mt-4 inline-block border border-[var(--gear-amber)] px-2 py-1 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-[var(--gear-amber)]">
                          {membro.cargo}
                        </p>
                      )}
                    </Surge>
                  ))}
                </ul>
              </section>
            )
          })}

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
