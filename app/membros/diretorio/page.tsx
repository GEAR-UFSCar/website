import type { Metadata } from "next"
import { PageHeader } from "@/components/membros/page-header"

import { Aviso } from "@/components/aviso"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { DiretorioLista } from "@/components/diretorio-lista"
import { paginaMembros } from "@/lib/ui"

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

export default async function DiretorioPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  await exigirMembroAprovado()
  // ?busca=1 vem do atalho "Buscar pessoa" do Ctrl K: abre com a busca em foco.
  const { busca } = await searchParams

  const supabase = await createClient()
  // Sem e-mail na consulta: a coluna não existe em `perfis` e não deve existir.
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome_completo, curso, frente, cargo")
    .order("nome_completo", { nullsFirst: false })

  const membros = (data ?? []) as Membro[]

  // O grupo é decidido aqui, uma vez, e a lista só filtra e desenha.
  const comGrupo = membros.map((m) => ({ ...m, grupo: grupoDe(m) }))

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Pessoas">
        Quem está no GEAR e em que frente. Nome, curso, frente e cargo, sem contato pessoal: e-mail
        não aparece aqui para ninguém. {membros.length} {membros.length === 1 ? "membro" : "membros"}.
      </PageHeader>

      {error && (
        <ErroDados titulo="DIRETÓRIO INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/001_perfis.sql</code>. Se ela existe mas só
          a sua linha aparece, falta rodar <code>supabase/009_diretorio.sql</code>, é ele que
          libera a leitura dos perfis para todos os membros.
        </ErroDados>
      )}

      {!error && membros.length <= 1 && (
        <Aviso titulo="SÓ VOCÊ APARECE" tom="neutro" className="mt-10 max-w-2xl">
          A lista veio com {membros.length} perfil(s). Se a entidade já tem mais gente
          cadastrada, a política de leitura ainda é a antiga, rode{" "}
          <code>supabase/009_diretorio.sql</code> no SQL Editor.
        </Aviso>
      )}

      {!error && <DiretorioLista membros={comGrupo} grupos={GRUPOS} focar={busca === "1"} />}
    </section>
  )
}
