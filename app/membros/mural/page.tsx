import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { MuralForm } from "@/components/mural-form"
import { MuralFixar } from "@/components/mural-fixar"
import { createClient } from "@/lib/supabase/server"
import { dataHora } from "@/lib/datas"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Mural | GEAR",
  robots: { index: false, follow: false },
}

type AvisoMural = {
  id: string
  titulo: string
  conteudo: string
  autor_id: string | null
  fixado: boolean
  created_at: string
}


export default async function MuralPage() {
  const { user, perfil } = await exigirMembroAprovado()
  // Portão só da tela; a RLS de 008 é quem barra de fato.
  const podeEscrever = temCargo(perfil?.cargo)

  const supabase = await createClient()

  /*
   * Duas consultas em vez de um join: a FK de avisos.autor_id aponta para
   * auth.users, não para perfis, então o PostgREST não tem relação para
   * embutir. Os nomes vêm de perfis e são casados por id aqui.
   */
  const [{ data, error }, { data: pessoas }] = await Promise.all([
    supabase
      .from("avisos")
      .select("id, titulo, conteudo, autor_id, fixado, created_at")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("perfis").select("id, nome_completo"),
  ])

  const avisos = (data ?? []) as AvisoMural[]

  // Sem 009_diretorio.sql este mapa só tem a própria linha — daí o autor
  // aparecer em branco em vez de errado.
  const nomes = new Map(
    ((pessoas ?? []) as { id: string; nome_completo: string | null }[])
      .filter((p) => p.nome_completo?.trim())
      .map((p) => [p.id, p.nome_completo as string]),
  )

  const fixados = avisos.filter((a) => a.fixado).length

  return (
    <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>
      <p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
        Comunicados da diretoria. Qualquer membro lê; publicar e fixar é de quem tem cargo.
      </p>

      <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {avisos.length} AVISO(S) · {fixados} FIXADO(S)
      </p>
      </Surge>

      {error && (
        <ErroDados titulo="MURAL INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/008_eventos_avisos_sprints.sql</code> no
          SQL Editor do painel.
        </ErroDados>
      )}

      {!error && avisos.length === 0 && (
        <p className="mt-10 max-w-2xl font-sans text-sm font-light text-muted-foreground">
          Nenhum aviso publicado ainda.
        </p>
      )}

      {/* Fixados primeiro, depois os mais recentes — a ordem vem do banco. */}
      <div className="mt-12 max-w-4xl">
        {avisos.map((aviso, indice) => {
          const autor = aviso.autor_id ? nomes.get(aviso.autor_id) : null

          return (
            <Surge
              as="article"
              index={indice}
              key={aviso.id}
              className={`border-t border-white/10 py-8 ${
                aviso.fixado ? "border-l-2 border-l-[var(--gear-amber)] pl-6 md:pl-8" : ""
              }`}
            >
              {aviso.fixado && (
                <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--gear-amber)] mb-4">
                  FIXADO
                </p>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h2 className="font-sans text-xl md:text-2xl font-light tracking-tight text-balance">
                    {aviso.titulo}
                  </h2>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    {dataHora(aviso.created_at)}
                    {autor ? ` · ${autor}` : ""}
                  </p>
                </div>

                {podeEscrever && <MuralFixar id={aviso.id} fixado={aviso.fixado} />}
              </div>

              <p className="mt-5 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground whitespace-pre-line">
                {aviso.conteudo}
              </p>
            </Surge>
          )
        })}
      </div>

      {podeEscrever && (
        <div className="mt-14 max-w-4xl">
          <MuralForm usuarioId={user.id} />
        </div>
      )}

      <div className="mt-16">
        <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Voltar para membros
        </Link>
      </div>
    </section>
  )
}
