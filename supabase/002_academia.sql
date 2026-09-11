-- =============================================================================
-- GEAR — Academia: módulos e progresso
-- Rodar no SQL Editor do painel, DEPOIS de 001_perfis.sql.
-- Reexecutar é seguro: o seed usa ON CONFLICT DO NOTHING.
-- =============================================================================

-- 1. MODULOS -----------------------------------------------------------------
create table if not exists public.modulos (
  id            uuid primary key default gen_random_uuid(),
  nivel         text not null check (nivel in ('Fundamental', 'Principal', 'Avançada')),
  ordem         integer not null,
  titulo        text not null,
  descricao     text,
  conteudo_url  text,
  -- a ordem é única dentro do nível: evita dois "módulo 2" no mesmo nível e
  -- dá um alvo estável para o ON CONFLICT do seed lá embaixo
  constraint modulos_nivel_ordem_unico unique (nivel, ordem)
);

comment on table public.modulos is 'Módulos da Academia GEAR, agrupados por nível.';

-- 2. PROGRESSO ---------------------------------------------------------------
create table if not exists public.progresso (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  modulo_id     uuid not null references public.modulos (id) on delete cascade,
  -- null = iniciado mas não concluído
  concluido_em  timestamptz,
  constraint progresso_usuario_modulo_unico unique (usuario_id, modulo_id)
);

comment on table public.progresso is 'Avanço de cada membro em cada módulo.';

create index if not exists progresso_usuario_idx on public.progresso (usuario_id);

-- 3. RLS: MODULOS ------------------------------------------------------------
alter table public.modulos enable row level security;

-- Catálogo compartilhado: qualquer pessoa autenticada lê tudo.
-- Não há política de escrita — inserir/editar módulo é tarefa de
-- administração, feita pelo painel (service_role ignora RLS).
drop policy if exists "modulos: leitura autenticada" on public.modulos;
create policy "modulos: leitura autenticada"
  on public.modulos for select
  to authenticated
  using (true);

-- 4. RLS: PROGRESSO ----------------------------------------------------------
alter table public.progresso enable row level security;

drop policy if exists "progresso: ler o próprio" on public.progresso;
create policy "progresso: ler o próprio"
  on public.progresso for select
  to authenticated
  using ((select auth.uid()) = usuario_id);

drop policy if exists "progresso: criar o próprio" on public.progresso;
create policy "progresso: criar o próprio"
  on public.progresso for insert
  to authenticated
  with check ((select auth.uid()) = usuario_id);

drop policy if exists "progresso: editar o próprio" on public.progresso;
create policy "progresso: editar o próprio"
  on public.progresso for update
  to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

drop policy if exists "progresso: apagar o próprio" on public.progresso;
create policy "progresso: apagar o próprio"
  on public.progresso for delete
  to authenticated
  using ((select auth.uid()) = usuario_id);

-- 5. SEED --------------------------------------------------------------------
-- `descricao` fica null de propósito: os títulos são os reais da Academia,
-- mas as descrições não foram definidas ainda. Preencher depois com UPDATE.
insert into public.modulos (nivel, ordem, titulo) values
  ('Fundamental', 1, 'Fundamentos de robótica e programação'),
  ('Fundamental', 2, 'Introdução à Programação de Robôs usando ROS 2'),
  ('Fundamental', 3, 'Atividades práticas introdutórias com os kits (LAFVIN, OSOYOO)'),
  ('Principal',   1, 'Programação e simulação de robôs'),
  ('Principal',   2, 'Arquiteturas de agentes inteligentes'),
  ('Principal',   3, 'Introdução à Tomada de Decisão de Robôs Móveis Autônomos usando Aprendizado por Reforço'),
  ('Avançada',    1, 'Aprofundamento na trilha escolhida'),
  ('Avançada',    2, 'Projeto de Validação'),
  ('Avançada',    3, 'Avaliação Técnica final')
on conflict on constraint modulos_nivel_ordem_unico do nothing;

-- Conferência rápida: deve listar 9 linhas, 3 por nível.
-- select nivel, ordem, titulo from public.modulos order by
--   array_position(array['Fundamental','Principal','Avançada'], nivel), ordem;
