
import { ErroDados } from "@/components/erro-dados"
import { FrenteAbas } from "@/components/frente-abas"
import { SprintsQuadro } from "@/components/sprints-quadro"
import { SprintForm } from "@/components/sprint-form"
import { ResumoSemana } from "@/components/resumo-semana"
import { resumoDaSemana } from "@/lib/resumo"
import { maisDias } from "@/lib/hoje"
import { hojeISO } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { eDiretoria, temCargo, type FrenteNome } from "@/lib/administracao"
import {
  COLUNAS_ATUALIZACAO,
  COLUNAS_SPRINT,
  type Atualizacao,
  type Sprint,
} from "@/lib/sprints"
import type { ErroDeDados } from "@/lib/erros"
import { PageHeader } from "@/components/membros/page-header"
import { paginaMembros } from "@/lib/ui"

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
   * `sprint_atualizacoes` dentro de `sprints`, o PostgREST faz isso, mas com
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

  /*
   * A lista de pessoas serve a quem cria sprint e, desde a 038, a quem cria
   * tarefa: membros da trilha e responsáveis. São poucas linhas, então vem
   * sempre que a pessoa pode participar de algum sprint desta página.
   */
  const participa = podeEscrever || eMinhaFrente || sprints.some((s) => s.responsavel?.id === user.id)
  const pessoas = participa
    ? (((
        await supabase.from("perfis").select("id, nome_completo").eq("aprovado", true).order("nome_completo")
      ).data ?? []) as NonNullable<Sprint["responsavel"]>[])
    : []

  return (
    <section className={paginaMembros}>
      <PageHeader titulo={frente}>
        Os sprints da trilha {frente}. Qualquer membro acompanha as três. Quem é da trilha, ou
        responsável por um sprint, registra o que fez, o próximo passo e o progresso; criar,
        concluir e apagar sprint é de quem tem cargo na trilha ou da Presidência.
        {eMinhaFrente
          ? " Esta é a sua trilha."
          : !perfil?.frente?.trim()
            ? " Você ainda não escolheu uma trilha: defina no seu perfil para escrever aqui."
            : ""}
      </PageHeader>
      <FrenteAbas atual={frente} />

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

      {!error && sprints.length > 0 && (
        <ResumoSemana
          texto={resumoDaSemana(frente, sprints, atualizacoes, maisDias(hojeISO(), -7))}
        />
      )}

      {!error && podeEscrever && <SprintForm frente={frente} usuarioId={user.id} pessoas={pessoas} />}

      {!error && (
        <SprintsQuadro
          sprints={sprints}
          atualizacoes={atualizacoes}
          podeEscrever={podeEscrever}
          daTrilha={eMinhaFrente}
          usuarioId={user.id}
          pessoas={pessoas}
        />
      )}

    </section>
  )
}
