-- =============================================================================
-- GEAR — Administração: patrimônio e atas
-- Rodar no SQL Editor, DEPOIS de 001_perfis.sql (as políticas dependem de perfis).
-- =============================================================================

-- 1. PATRIMONIO --------------------------------------------------------------
create table if not exists public.patrimonio (
  id                 uuid primary key default gen_random_uuid(),
  item               text not null,
  categoria          text not null check (categoria in (
                       'Robô', 'Componente Eletrônico', 'Ferramenta', 'Consumível',
                       'Equipamento de Informática', 'Mecânica/Estrutura', 'Outro')),
  quantidade         integer not null default 1 check (quantidade >= 0),
  status             text not null check (status in (
                       'Disponível', 'Emprestado', 'Em manutenção', 'Danificado', 'Baixado')),
  responsavel_atual  text,
  trilha_vinculada   text,
  localizacao        text,
  observacoes        text,
  created_at         timestamptz not null default now()
);

comment on table public.patrimonio is 'Inventário de bens da entidade.';

-- 2. ATAS --------------------------------------------------------------------
create table if not exists public.atas (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('Geral', 'Trilha', 'Diretoria')),
  data_reuniao    date not null,
  presentes       text not null,
  pauta           text not null,
  decisoes        text not null,
  pendencias      text,
  registrado_por  uuid not null references auth.users (id) on delete restrict,
  created_at      timestamptz not null default now()
);

comment on table public.atas is 'Atas de reunião. registrado_por não cascateia: apagar a conta não apaga o registro histórico.';

create index if not exists atas_data_idx on public.atas (data_reuniao desc);

-- 3. RLS ---------------------------------------------------------------------
-- Regra das duas tabelas: só quem tem cargo na entidade. A subconsulta em
-- `perfis` respeita a RLS daquela tabela, que já limita cada um à própria
-- linha — então isto lê o cargo de quem está pedindo, e de mais ninguém.
alter table public.patrimonio enable row level security;
alter table public.atas enable row level security;

drop policy if exists "patrimonio: select com cargo" on public.patrimonio;
create policy "patrimonio: select com cargo"
  on public.patrimonio for select
  to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "patrimonio: insert com cargo" on public.patrimonio;
create policy "patrimonio: insert com cargo"
  on public.patrimonio for insert
  to authenticated
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "patrimonio: update com cargo" on public.patrimonio;
create policy "patrimonio: update com cargo"
  on public.patrimonio for update
  to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "atas: select com cargo" on public.atas;
create policy "atas: select com cargo"
  on public.atas for select
  to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "atas: insert com cargo" on public.atas;
create policy "atas: insert com cargo"
  on public.atas for insert
  to authenticated
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "atas: update com cargo" on public.atas;
create policy "atas: update com cargo"
  on public.atas for update
  to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

-- Sem política de DELETE em nenhuma das duas: remoção é operação de painel.
-- Para "apagar" um bem, use status = 'Baixado'.

-- Conferência:
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('patrimonio','atas') order by tablename, cmd;
