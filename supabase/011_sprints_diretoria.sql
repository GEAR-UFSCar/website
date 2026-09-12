-- =============================================================================
-- GEAR — sprints: diretoria escreve em qualquer trilha
-- Rodar no SQL Editor, DEPOIS de 010_sprints_por_trilha.sql.
--
-- A 010 exigia cargo E trilha igual à do sprint. Efeito colateral: Presidente
-- e Vice, que normalmente não têm trilha no perfil, ficavam sem escrita em
-- trilha nenhuma. Agora a condição tem dois caminhos:
--   · diretoria (Presidente/Vice) → qualquer trilha;
--   · qualquer outro cargo        → só a própria trilha.
--
-- A LEITURA NÃO MUDA: "sprints: leitura autenticada" (008) segue de pé, e é
-- ela que mantém as três trilhas visíveis a qualquer membro.
-- =============================================================================

-- As três políticas de escrita da 010 saem de cena; a de SELECT fica intacta.
drop policy if exists "sprints: escrita só na própria trilha" on public.sprints;
drop policy if exists "sprints: edição só na própria trilha" on public.sprints;
drop policy if exists "sprints: remoção só na própria trilha" on public.sprints;

/*
 * Duas notas sobre a forma da condição.
 *
 * 1. Reaproveita e_diretoria() (004) e tem_cargo() (008) em vez de repetir
 *    `cargo in ('Presidente', 'Vice-Presidente')` inline. A lista de quem é
 *    diretoria já vive em e_diretoria() e é espelhada por eDiretoria() em
 *    lib/administracao.ts; uma terceira cópia aqui seria a que sai de sincronia
 *    no dia em que a entidade criar outro cargo de direção.
 *
 * 2. `perfis` tem colunas `id` e `trilha`, e `sprints` também tem `id` e
 *    `trilha`. Dentro da subconsulta, um nome solto resolve para perfis —
 *    o que por acaso funciona, mas depende de escopo implícito. Os dois lados
 *    vão qualificados: p.trilha (quem pede) contra sprints.trilha (a linha).
 */

drop policy if exists "sprints: escrita por diretoria ou líder da trilha" on public.sprints;
create policy "sprints: escrita por diretoria ou líder da trilha"
  on public.sprints for insert
  to authenticated
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.trilha = sprints.trilha
      )
    )
  );

-- USING olha a linha como está; WITH CHECK, como ela fica. Com a condição nos
-- dois, um líder não consegue mover o próprio sprint para outra trilha —
-- a diretoria consegue, porque para ela os dois lados são verdadeiros.
drop policy if exists "sprints: edição por diretoria ou líder da trilha" on public.sprints;
create policy "sprints: edição por diretoria ou líder da trilha"
  on public.sprints for update
  to authenticated
  using (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.trilha = sprints.trilha
      )
    )
  )
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.trilha = sprints.trilha
      )
    )
  );

drop policy if exists "sprints: remoção por diretoria ou líder da trilha" on public.sprints;
create policy "sprints: remoção por diretoria ou líder da trilha"
  on public.sprints for delete
  to authenticated
  using (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.trilha = sprints.trilha
      )
    )
  );

-- =============================================================================
-- CONFERÊNCIA
-- Esperado: 4 linhas — 1 SELECT (008) e 3 de escrita, todas com o nome novo.
--   select policyname, cmd from pg_policies
--    where tablename = 'sprints' order by cmd, policyname;
--
-- Nenhuma política da 010 deve sobrar:
--   select count(*) from pg_policies
--    where tablename = 'sprints' and policyname like '%só na própria trilha';
--   -- esperado: 0
-- =============================================================================
