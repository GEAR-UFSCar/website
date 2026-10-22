import type { Metadata } from "next"
import { PageHeader } from "@/components/membros/page-header"

import { ErroDados } from "@/components/erro-dados"
import { MetaForm } from "@/components/meta-form"
import { MetaCartao } from "@/components/meta-cartao"
import { Surge } from "@/components/surge"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { COLUNAS_META, estaVencida, type Meta } from "@/lib/metas"

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
      <PageHeader titulo="Metas">
        O calendário é da entidade; isto aqui é seu. Cada meta nasce privada, e o formulário abaixo
        explica o que muda ao torná-la pública. {abertas} em aberto, {vencidas} vencida(s),{" "}
        {minhas.length} no total.
      </PageHeader>

      {error && (
        <ErroDados titulo="METAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/017_metas.sql</code> no SQL Editor do
          painel.
        </ErroDados>
      )}

      {/* 01 — NOVA META */}
      <Surge as="section" className="mt-16 max-w-4xl">
        <div className="border-t border-white/10 pt-8">
          <h2 className="font-sans text-2xl md:text-4xl font-normal">Nova meta</h2>
        </div>

        <div className="mt-8">
          <MetaForm usuarioId={user.id} />
        </div>
      </Surge>

      {/* 02 — MINHAS METAS */}
      <section className="mt-16 max-w-4xl">
        <div className="border-t border-white/10 pt-8">
          <h2 className="font-sans text-2xl md:text-4xl font-normal">Minhas metas</h2>
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
          <h2 className="font-sans text-2xl md:text-4xl font-normal">Metas públicas</h2>
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
    </section>
  )
}
