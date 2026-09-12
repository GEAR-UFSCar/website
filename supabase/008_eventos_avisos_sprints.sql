-- =============================================================================
-- GEAR — calendário, mural e espaço das trilhas
-- Rodar no SQL Editor, DEPOIS de 001_perfis.sql (as políticas leem perfis.cargo).
--
-- Leitura das três: qualquer membro autenticado — é informação interna de
-- consulta geral, como em 006_documentos.sql. Escrita: só quem tem cargo.
-- =============================================================================

-- 0. QUEM TEM CARGO ----------------------------------------------------------
-- O mesmo `exists` de 003_administracao.sql, agora com nome. Sem isto o
-- predicado apareceria 12 vezes neste arquivo (3 tabelas × insert/update/
-- delete, com update contando duas), e cada cópia é uma chance de divergir.
--
-- Sem security definer, ao contrário de e_diretoria(): aqui não há recursão a
-- resolver (as políticas ficam em eventos/avisos/sprints, não em perfis), e
-- manter a função sob RLS preserva exatamente a semântica do predicado inline
-- de 003 — a subconsulta enxerga só a própria linha de quem está pedindo.
create or replace function public.tem_cargo()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid())
      and p.cargo is not null
      and p.cargo <> ''
  );
$$;

comment on function public.tem_cargo() is 'Verdadeiro se quem está pedindo tem cargo preenchido. Espelha temCargo() em lib/administracao.ts.';

-- 1. EVENTOS -----------------------------------------------------------------
create table if not exists public.eventos (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  descricao         text,
  tipo              text not null check (tipo in ('Reunião', 'Sprint', 'Prazo', 'Outro')),
  data_inicio       timestamptz not null,
  data_fim          timestamptz,
  -- null = evento geral da entidade, não de uma trilha específica
  trilha_vinculada  text check (trilha_vinculada in ('Competição', 'Pesquisa', 'Projetos')),
  criado_por        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  -- evento que termina antes de começar é erro de digitação, não dado
  constraint eventos_intervalo_valido check (data_fim is null or data_fim >= data_inicio)
);

comment on table public.eventos is 'Calendário da entidade. trilha_vinculada null = evento geral.';

create index if not exists eventos_data_idx on public.eventos (data_inicio desc);
create index if not exists eventos_trilha_idx on public.eventos (trilha_vinculada, data_inicio desc);

-- 2. AVISOS ------------------------------------------------------------------
create table if not exists public.avisos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  conteudo    text not null,
  autor_id    uuid references auth.users (id) on delete set null,
  fixado      boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.avisos is 'Mural de comunicados. Escrita restrita a quem tem cargo: é canal da diretoria, não espaço aberto.';

-- Ordem natural do mural: fixados primeiro, depois os mais recentes.
create index if not exists avisos_mural_idx on public.avisos (fixado desc, created_at desc);

-- 3. SPRINTS -----------------------------------------------------------------
create table if not exists public.sprints (
  id              uuid primary key default gen_random_uuid(),
  trilha          text not null check (trilha in ('Competição', 'Pesquisa', 'Projetos')),
  titulo          text not null,
  descricao       text not null,
  status          text not null check (status in ('Planejado', 'Em andamento', 'Concluído')),
  data_inicio     date,
  data_fim        date,
  atualizado_por  uuid references auth.users (id) on delete set null,
  updated_at      timestamptz not null default now(),
  constraint sprints_intervalo_valido check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

comment on table public.sprints is 'Quadro de sprints por trilha.';

create index if not exists sprints_trilha_idx on public.sprints (trilha, status);

-- updated_at precisa de trigger: sem ele a coluna registra só a criação e a
-- data na tela passa a mentir depois do primeiro UPDATE.
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sprints_tocar_updated_at on public.sprints;
create trigger sprints_tocar_updated_at
  before update on public.sprints
  for each row execute function public.tocar_updated_at();

-- 4. RLS ---------------------------------------------------------------------
alter table public.eventos enable row level security;
alter table public.avisos  enable row level security;
alter table public.sprints enable row level security;

-- Leitura: qualquer sessão autenticada, nas três.
drop policy if exists "eventos: leitura autenticada" on public.eventos;
create policy "eventos: leitura autenticada"
  on public.eventos for select to authenticated using (true);

drop policy if exists "avisos: leitura autenticada" on public.avisos;
create policy "avisos: leitura autenticada"
  on public.avisos for select to authenticated using (true);

drop policy if exists "sprints: leitura autenticada" on public.sprints;
create policy "sprints: leitura autenticada"
  on public.sprints for select to authenticated using (true);

-- Escrita: só com cargo, nas três.
drop policy if exists "eventos: insert com cargo" on public.eventos;
create policy "eventos: insert com cargo"
  on public.eventos for insert to authenticated with check (public.tem_cargo());

drop policy if exists "eventos: update com cargo" on public.eventos;
create policy "eventos: update com cargo"
  on public.eventos for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

drop policy if exists "eventos: delete com cargo" on public.eventos;
create policy "eventos: delete com cargo"
  on public.eventos for delete to authenticated using (public.tem_cargo());

drop policy if exists "avisos: insert com cargo" on public.avisos;
create policy "avisos: insert com cargo"
  on public.avisos for insert to authenticated with check (public.tem_cargo());

drop policy if exists "avisos: update com cargo" on public.avisos;
create policy "avisos: update com cargo"
  on public.avisos for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

drop policy if exists "avisos: delete com cargo" on public.avisos;
create policy "avisos: delete com cargo"
  on public.avisos for delete to authenticated using (public.tem_cargo());

drop policy if exists "sprints: insert com cargo" on public.sprints;
create policy "sprints: insert com cargo"
  on public.sprints for insert to authenticated with check (public.tem_cargo());

drop policy if exists "sprints: update com cargo" on public.sprints;
create policy "sprints: update com cargo"
  on public.sprints for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

drop policy if exists "sprints: delete com cargo" on public.sprints;
create policy "sprints: delete com cargo"
  on public.sprints for delete to authenticated using (public.tem_cargo());

-- =============================================================================
-- CONFERÊNCIA — rode depois e compare com o esperado
-- =============================================================================
-- Esperado: 3 linhas, rls_ativa = true nas três.
-- select c.relname as tabela, c.relrowsecurity as rls_ativa
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relname in ('eventos', 'avisos', 'sprints')
--  order by 1;

-- Esperado: 12 linhas — 4 por tabela (SELECT, INSERT, UPDATE, DELETE).
-- select tablename, cmd, policyname from pg_policies
--  where tablename in ('eventos', 'avisos', 'sprints')
--  order by tablename, cmd;

-- Esperado: as colunas exatamente como especificadas.
-- select table_name, column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--  where table_schema = 'public' and table_name in ('eventos', 'avisos', 'sprints')
--  order by table_name, ordinal_position;
