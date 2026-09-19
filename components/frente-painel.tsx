import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { FrenteAbas } from "@/components/frente-abas"
import { SprintsQuadro } from "@/components/sprints-quadro"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { eDiretoria, temCargo, type FrenteNome } from "@/lib/administracao"
import {
  COLUNAS_ATUALIZACAO,
  COLUNAS_SPRINT,
  type Atualizacao,
  type Sprint,
} from "@/lib/sprints"
import { botaoSecundario } from "@/lib/ui"
import type { ErroDeDados } from "@/lib/erros"
import { Surge } from "@/components/surge"

/**
 * Conteúdo das três páginas de frente. A frente vem fixa da rota, não do
 * perfil de quem está vendo: qualquer membro acompanha qualquer frente.
 *
 * Busca os dados e entrega prontos ao quadro, que é Client Component só por
 * causa do filtro. A ida ao Supabase continua inteira no servidor.
 */
export async function FrentePainel({ frente }: { frente: FrenteNome }) {
  const { user, perfil } = await exigirMembroAprovado()

  /*
   * Portão só da tela, espelhando a policy de 011 e a função
   * pode_editar_sprint() de 021: diretoria escreve em qualquer frente;
   * qualquer outro cargo, só na própria. Sem espelhar, os controles ou
   * apareceriam para quem o banco vai recusar, ou sumiriam para a diretoria,
   * que é justamente quem a 011 veio destravar.
   */
  const podeEscrever =
    eDiretoria(perfil?.cargo) || (temCargo(perfil?.cargo) && perfil?.frente?.trim() === frente)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sprints")
    .select(COLUNAS_SPRINT)
    .eq("frente", frente)
    .order("updated_at", { ascending: false })

  const sprints = (data ?? []) as unknown as Sprint[]

  /*
   * Segunda consulta, e ela depende da primeira: o diário é buscado pelos ids
   * que acabaram de chegar. Dava para trazer tudo numa consulta só, embutindo
   * `sprint_atualizacoes` dentro de `sprints` — o PostgREST faz isso, mas com
   * um embed dentro de outro (o autor dentro da atualização dentro do sprint)
   * e a ordenação do aninhado por `referencedTable`. Duas consultas legíveis
   * valem mais que uma clever, e a segunda só roda se houver sprint.
   */
  let atualizacoesData: unknown[] = []
  let erroAtualizacoes: ErroDeDados | null = null
  if (sprints.length > 0) {
    const resposta = await supabase
      .from("sprint_atualizacoes")
      .select(COLUNAS_ATUALIZACAO)
      .in(
        "sprint_id",
        sprints.map((s) => s.id),
      )
      .order("created_at", { ascending: false })

    atualizacoesData = resposta.data ?? []
    erroAtualizacoes = resposta.error
  }

  // Agrupado aqui, no servidor: o cartão recebe só o diário que é dele.
  const atualizacoes: Record<string, Atualizacao[]> = {}
  for (const item of atualizacoesData as Atualizacao[]) {
    ;(atualizacoes[item.sprint_id] ??= []).push(item)
  }

  const eMinhaFrente = perfil?.frente?.trim() === frente

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>
      <FrenteAbas atual={frente} />

      <p className="mt-10 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
        Os sprints da frente {frente}. Qualquer membro acompanha as três; mudar status, progresso
        e diário é de quem tem cargo nesta frente — ou da diretoria, em qualquer uma.
        {eMinhaFrente ? " Esta é a sua frente." : ""}
      </p>
      </Surge>

      {error && (
        <ErroDados titulo="SPRINTS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/008_eventos_avisos_sprints.sql</code>,
          depois <code>supabase/010_sprints_por_trilha.sql</code> e{" "}
          <code>supabase/011_sprints_diretoria.sql</code>. Se o erro fala em{" "}
          <code>responsavel_id</code>, <code>progresso</code>, <code>proximo_passo</code> ou em
          relação não encontrada, faltam as duas últimas:{" "}
          <code>supabase/020_sprints_responsavel_e_proximo_passo.sql</code> e{" "}
          <code>supabase/021_sprints_progresso_bloqueado_e_diario.sql</code>.
        </ErroDados>
      )}

      {/*
        Erro do diário não derruba os cartões: a lista de sprints já está na
        mão, e escondê-la porque o histórico falhou seria trocar uma perda
        pequena por uma grande.
      */}
      {erroAtualizacoes && (
        <ErroDados titulo="DIÁRIO INDISPONÍVEL" erro={erroAtualizacoes} className="mt-10 max-w-2xl">
          Os sprints aparecem, mas sem histórico. Se a tabela não existe, rode{" "}
          <code>supabase/021_sprints_progresso_bloqueado_e_diario.sql</code> no SQL Editor.
        </ErroDados>
      )}

      {!error && (
        <SprintsQuadro
          sprints={sprints}
          atualizacoes={atualizacoes}
          podeEscrever={podeEscrever}
          usuarioId={user.id}
        />
      )}

      <div className="mt-16">
        <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Voltar para membros
        </Link>
      </div>
    </section>
  )
}
