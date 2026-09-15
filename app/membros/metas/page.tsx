import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { MetaForm } from "@/components/meta-form"
import { MetaCartao } from "@/components/meta-cartao"
import { Surge } from "@/components/surge"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { COLUNAS_META, estaVencida, type Meta } from "@/lib/metas"
import { botaoSecundario } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Metas | GEAR",
  robots: { index: false, follow: false },
}

export default async function MetasPage() {
  const { user } = await exigirMembroAprovado()

  const supabase = await createClient()

  /*
   * Três consultas em paralelo, e nenhum join.
   *
   * A FK de metas.usuario_id aponta para auth.users, não para perfis — o
   * PostgREST não tem relação para embutir, como já acontece no mural. Os
   * nomes vêm de perfis e são casados por id aqui embaixo.
   *
   * A separação entre as duas primeiras não é só de tela: "minhas" inclui as
   * privadas, "públicas" exclui as minhas. Uma consulta só devolveria a minha
   * meta pública duas vezes.
   */
  const [{ data: minhasData, error }, { data: publicasData, error: erroPublicas }, { data: pessoas }] =
    await Promise.all([
      supabase
        .from("metas")
        .select(COLUNAS_META)
        .eq("usuario_id", user.id)
        .order("prazo", { ascending: true }),
      supabase
        .from("metas")
        .select(COLUNAS_META)
        .eq("visibilidade", "Pública")
        .neq("usuario_id", user.id)
        .order("prazo", { ascending: true }),
      supabase.from("perfis").select("id, nome_completo"),
    ])

  const minhas = (minhasData ?? []) as Meta[]
  const publicas = (publicasData ?? []) as Meta[]

  const nomes = new Map(
    ((pessoas ?? []) as { id: string; nome_completo: string | null }[])
      .filter((p) => p.nome_completo?.trim())
      .map((p) => [p.id, p.nome_completo as string]),
  )

  const vencidas = minhas.filter(estaVencida).length
  const abertas = minhas.filter((m) => !m.concluida).length

  return (
    <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>

        <p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
          O calendário é da entidade; isto aqui é seu. Cada meta nasce privada. Tornar pública
          mostra ela — e o seu nome — para os outros membros, e nada além disso: continua sendo
          você quem edita, conclui e apaga.
        </p>

        <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
          {abertas} EM ABERTO · {vencidas} VENCIDA(S) · {minhas.length} NO TOTAL
        </p>
      </Surge>

      {error && (
        <ErroDados titulo="METAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/017_metas.sql</code> no SQL Editor do
          painel.
        </ErroDados>
      )}

      {/* 01 — NOVA META */}
      <Surge as="section" className="mt-16 max-w-4xl">
        <div className="border-t border-white/10 pt-8">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
            01 — REGISTRAR
          </p>
          <h2 className="font-sans text-2xl md:text-4xl font-light italic">Nova meta</h2>
        </div>

        <div className="mt-8">
          <MetaForm usuarioId={user.id} />
        </div>
      </Surge>

      {/* 02 — MINHAS METAS */}
      <section className="mt-16 max-w-4xl">
        <div className="border-t border-white/10 pt-8">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
            02 — SUAS
          </p>
          <h2 className="font-sans text-2xl md:text-4xl font-light italic">Minhas metas</h2>
        </div>

        <div className="mt-8">
          {minhas.length === 0 ? (
            <p className="font-sans text-sm font-light text-muted-foreground">
              {error
                ? "Não foi possível carregar suas metas."
                : "Nenhuma meta registrada ainda. A primeira é no formulário acima."}
            </p>
          ) : (
            minhas.map((meta, i) => (
              <Surge key={meta.id} index={i}>
                <MetaCartao meta={meta} usuarioId={user.id} editavel />
              </Surge>
            ))
          )}
        </div>
      </section>

      {/* 03 — PÚBLICAS DA EQUIPE */}
      <section className="mt-16 max-w-4xl">
        <div className="border-t border-white/10 pt-8">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
            03 — DA EQUIPE
          </p>
          <h2 className="font-sans text-2xl md:text-4xl font-light italic">Metas públicas</h2>
        </div>

        {erroPublicas ? (
          <ErroDados titulo="LISTA INDISPONÍVEL" erro={erroPublicas} className="mt-8 max-w-2xl">
            Se a tabela não existe, rode <code>supabase/017_metas.sql</code> no SQL Editor do
            painel.
          </ErroDados>
        ) : (
          <div className="mt-8">
            {publicas.length === 0 ? (
              <p className="font-sans text-sm font-light text-muted-foreground">
                Nenhum outro membro tornou uma meta pública ainda.
              </p>
            ) : (
              publicas.map((meta, i) => (
                <Surge key={meta.id} index={i}>
                  {/*
                    `editavel={false}`: leitura e nada mais. A RLS de 017 já
                    recusaria a escrita — aqui a interface só para de
                    prometer o que o banco não entrega.
                  */}
                  <MetaCartao
                    meta={meta}
                    usuarioId={user.id}
                    autor={nomes.get(meta.usuario_id) ?? "Membro"}
                    editavel={false}
                  />
                </Surge>
              ))
            )}
          </div>
        )}
      </section>

      <div className="mt-16">
        <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Voltar para membros
        </Link>
      </div>
    </section>
  )
}
