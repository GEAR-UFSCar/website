-- =============================================================================
-- GEAR — tabela de perfis + RLS + trigger de criação automática
-- Rodar uma vez no SQL Editor do painel da Supabase.
-- =============================================================================

-- 1. TABELA ------------------------------------------------------------------
create table if not exists public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome_completo text,
  curso         text,
  -- null é permitido: quem ainda não escolheu trilha fica sem valor
  trilha        text check (trilha in ('Competição', 'Pesquisa', 'Projetos')),
  cargo         text,
  created_at    timestamptz not null default now()
);

comment on table public.perfis is 'Dados de perfil dos membros, 1:1 com auth.users.';

-- 2. ROW LEVEL SECURITY ------------------------------------------------------
alter table public.perfis enable row level security;

-- Cada pessoa enxerga e altera apenas a própria linha.
-- (select auth.uid()) em vez de auth.uid() para o Postgres avaliar uma vez só.
drop policy if exists "perfis: ler o próprio" on public.perfis;
create policy "perfis: ler o próprio"
  on public.perfis for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "perfis: criar o próprio" on public.perfis;
create policy "perfis: criar o próprio"
  on public.perfis for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "perfis: editar o próprio" on public.perfis;
create policy "perfis: editar o próprio"
  on public.perfis for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sem política de DELETE: a linha é removida em cascata junto com o usuário.

-- 3. TRIGGER DE CRIAÇÃO ------------------------------------------------------
-- security definer: o trigger roda no contexto do auth, onde a RLS bloquearia
-- o insert. search_path vazio obriga a qualificar tudo, evitando sequestro de
-- schema — é a recomendação da própria Supabase para funções security definer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome_completo, curso)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'nome_completo', ''),
    nullif(new.raw_user_meta_data ->> 'curso', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. BACKFILL ----------------------------------------------------------------
-- Cria perfil para quem já se cadastrou antes deste script existir.
insert into public.perfis (id)
select u.id from auth.users u
left join public.perfis p on p.id = u.id
where p.id is null;
