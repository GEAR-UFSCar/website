-- =============================================================================
-- GEAR — escrita de sprints restrita à própria trilha
-- Rodar no SQL Editor, DEPOIS de 008_eventos_avisos_sprints.sql.
--
-- Antes: qualquer cargo escrevia sprint de qualquer trilha — o Líder de
-- Competição podia criar e editar sprint de Pesquisa. Agora, além do cargo,
-- a trilha do perfil tem de bater com a trilha do sprint.
--
-- A LEITURA NÃO MUDA: "sprints: leitura autenticada" (008) continua de pé, e é
-- ela que permite a qualquer membro acompanhar as três trilhas em
-- /membros/trilhas/{competicao,pesquisa,projetos}.
-- =============================================================================

-- As três de escrita da 008 saem de cena; a de SELECT fica intacta.
drop policy if exists "sprints: insert com cargo" on public.sprints;
drop policy if exists "sprints: update com cargo" on public.sprints;
drop policy if exists "sprints: delete com cargo" on public.sprints;

/*
 * Nota de sintaxe: `perfis` também tem uma coluna `trilha`, então dentro da
 * subconsulta um `trilha` solto resolveria para perfis.trilha e a condição
 * viraria uma tautologia. Por isso os dois lados vão qualificados —
 * p.trilha (quem está pedindo) contra sprints.trilha (a linha em questão).
 */

drop policy if exists "sprints: escrita só na própria trilha" on public.sprints;
create policy "sprints: escrita só na própria trilha"
  on public.sprints for insert
  to authenticated
  with check (
    public.tem_cargo()
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid()) and p.trilha = sprints.trilha
    )
  );

-- USING olha a linha como ela está; WITH CHECK, como ela fica. Repetir a
-- condição nos dois impede também *mover* um sprint para outra trilha.
drop policy if exists "sprints: edição só na própria trilha" on public.sprints;
create policy "sprints: edição só na própria trilha"
  on public.sprints for update
  to authenticated
  using (
    public.tem_cargo()
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid()) and p.trilha = sprints.trilha
    )
  )
  with check (
    public.tem_cargo()
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid()) and p.trilha = sprints.trilha
    )
  );

/*
 * DELETE não estava no pedido, mas ficar de fora tornaria a regra vazia na
 * prática: sem isto, o Líder de Competição não poderia editar um sprint de
 * Pesquisa, mas poderia apagá-lo. Apagar é mais destrutivo que editar.
 * Para voltar ao comportamento da 008, troque o corpo por public.tem_cargo().
 */
drop policy if exists "sprints: remoção só na própria trilha" on public.sprints;
create policy "sprints: remoção só na própria trilha"
  on public.sprints for delete
  to authenticated
  using (
    public.tem_cargo()
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid()) and p.trilha = sprints.trilha
    )
  );

-- =============================================================================
-- ATENÇÃO: QUEM NÃO TEM TRILHA FICA SEM ESCRITA
-- p.trilha é null para Presidente/Vice que nunca escolheram trilha. Comparar
-- null com qualquer coisa dá null, o exists falha, e a escrita é negada — em
-- TODAS as trilhas. Se a diretoria precisar administrar sprints, acrescente
-- `or public.e_diretoria()` (004) ao corpo das três políticas acima.
-- =============================================================================

-- Conferência: esperado 4 políticas — 1 de SELECT (008) e 3 de escrita.
-- select policyname, cmd from pg_policies
--  where tablename = 'sprints' order by cmd, policyname;
