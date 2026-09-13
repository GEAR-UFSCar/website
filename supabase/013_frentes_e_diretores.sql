-- =============================================================================
-- GEAR — renomeia "trilha" para "frente" e "Líder" para "Diretor"
-- Rodar no SQL Editor, DEPOIS de 011_sprints_diretoria.sql.
--
-- ATENÇÃO: esta migração renomeia COLUNAS já em uso. A aplicação nova espera
-- `frente`; a antiga espera `trilha`. Entre o deploy e esta migração (em
-- qualquer ordem), a área de membros fica quebrada. Rode as duas coisas
-- juntas, de preferência fora do horário de uso.
--
-- O Postgres guarda policies, CHECKs e índices como árvores de parse, não como
-- texto: renomear a coluna atualiza todas as referências sozinho. As policies
-- de sprints são recriadas mesmo assim, só para o SQL do repositório continuar
-- descrevendo a realidade.
-- =============================================================================

-- 1. COLUNAS -----------------------------------------------------------------
alter table public.perfis  rename column trilha           to frente;
alter table public.sprints rename column trilha           to frente;
alter table public.eventos rename column trilha_vinculada to frente_vinculada;

comment on column public.perfis.frente is 'Frente de atuação do membro. Null = ainda não escolheu.';
comment on column public.eventos.frente_vinculada is 'Null = evento geral da entidade, não de uma frente.';

-- Índices acompanham o nome, para não sobrar "trilha" no schema.
alter index if exists public.eventos_trilha_idx rename to eventos_frente_idx;
alter index if exists public.sprints_trilha_idx rename to sprints_frente_idx;

-- 2. CARGOS ------------------------------------------------------------------
-- Ordem obrigatória: o CHECK sai, os valores mudam, o CHECK volta com a lista
-- nova. Invertido, o UPDATE seria recusado pelo próprio CHECK antigo.
alter table public.perfis drop constraint if exists perfis_cargo_check;

update public.perfis
   set cargo = 'Diretor de ' || substring(cargo from 'Líder de (.*)')
 where cargo like 'Líder de %';

alter table public.perfis add constraint perfis_cargo_check
  check (cargo in ('Presidente', 'Vice-Presidente', 'Diretor de Competição',
                   'Diretor de Pesquisa', 'Diretor de Projetos', 'Tesouraria', 'Comunicação'));

comment on column public.perfis.cargo is 'Lista fechada, espelhada em CARGOS (lib/administracao.ts). Null = sem cargo.';

-- e_diretoria() (004) não muda: continua valendo só para Presidente e
-- Vice-Presidente. Atenção ao nome: "Diretor de <Frente>" NÃO é diretoria
-- para efeito de permissão — quem manda em sprint de qualquer frente segue
-- sendo apenas Presidente/Vice, como definido em 011.

-- 3. POLICIES DE SPRINTS -----------------------------------------------------
-- Mesma lógica de 011, só com o nome novo da coluna.
drop policy if exists "sprints: escrita por diretoria ou líder da trilha"  on public.sprints;
drop policy if exists "sprints: edição por diretoria ou líder da trilha"   on public.sprints;
drop policy if exists "sprints: remoção por diretoria ou líder da trilha"  on public.sprints;

create policy "sprints: escrita por diretoria ou diretor da frente"
  on public.sprints for insert to authenticated
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = sprints.frente
      )
    )
  );

create policy "sprints: edição por diretoria ou diretor da frente"
  on public.sprints for update to authenticated
  using (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = sprints.frente
      )
    )
  )
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = sprints.frente
      )
    )
  );

create policy "sprints: remoção por diretoria ou diretor da frente"
  on public.sprints for delete to authenticated
  using (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = sprints.frente
      )
    )
  );

-- =============================================================================
-- CONFERÊNCIA
--   -- nenhuma coluna "trilha" deve sobrar:
--   select table_name, column_name from information_schema.columns
--    where table_schema='public' and column_name like '%trilha%';   -- esperado: 0 linhas
--
--   -- nenhum cargo "Líder":
--   select cargo, count(*) from public.perfis group by 1;
--
--   -- 4 policies em sprints, todas com "frente" no nome:
--   select policyname, cmd from pg_policies where tablename='sprints' order by cmd;
-- =============================================================================
