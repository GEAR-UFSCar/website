-- =============================================================================
-- GEAR — lições dentro das competências
-- Rodar no SQL Editor, DEPOIS de 046_avisos_de_partida.sql. Pode rodar mais de
-- uma vez. Não apaga nem muda dado.
--
-- O que as grandes plataformas (Coursera, Khan Academy, Udemy, freeCodeCamp,
-- Duolingo) têm em comum e a Academia não tinha: o conteúdo mora DENTRO do
-- site, em passos curtos, com progresso visível e exercício com resposta na
-- hora. A comprovação por evidência (043) continua sendo o que vale ponto;
-- lição e quiz são o caminho até ela.
--
--   1. `licoes`: passos de uma competência, em ordem. Tipo texto (markdown),
--      vídeo (link; YouTube vira player) ou quiz (questões em jsonb, corrigidas
--      na tela: quiz é treino, não dá ponto, então gabarito visível não é
--      brecha). Membro aprovado lê; cargo escreve.
--   2. `licoes_feitas`: quem concluiu qual lição e quando. Dá o progresso em %,
--      o "continuar de onde parou" e a sequência de dias estudando. Cada um
--      grava e apaga só a sua; cargo lê todas.
--   3. `modulos.requisito_id`: competência recomendada antes. Só recomendação:
--      a trava de ordem saiu na 043 e não volta.
-- =============================================================================

-- 1. LIÇÕES --------------------------------------------------------------------
create table if not exists public.licoes (
  id          uuid primary key default gen_random_uuid(),
  modulo_id   uuid not null references public.modulos (id) on delete cascade,
  ordem       integer not null default 1 check (ordem > 0),
  titulo      text not null check (char_length(btrim(titulo)) between 1 and 200),
  tipo        text not null default 'texto' check (tipo in ('texto', 'video', 'quiz')),
  corpo       text not null default '' check (char_length(corpo) <= 50000),
  video_url   text check (video_url is null or (video_url ~* '^https://' and char_length(video_url) <= 2000)),
  questoes    jsonb not null default '[]'::jsonb check (jsonb_typeof(questoes) = 'array'),
  duracao_min integer check (duracao_min is null or duracao_min between 1 and 600),
  created_at  timestamptz not null default now(),
  constraint licoes_video_tem_link check (tipo <> 'video' or video_url is not null),
  constraint licoes_quiz_tem_questao check (tipo <> 'quiz' or jsonb_array_length(questoes) > 0)
);
create index if not exists licoes_modulo on public.licoes (modulo_id, ordem);

alter table public.licoes enable row level security;
drop policy if exists "licoes: membro lê" on public.licoes;
create policy "licoes: membro lê" on public.licoes for select to authenticated using (public.e_membro());
drop policy if exists "licoes: cargo gerencia" on public.licoes;
create policy "licoes: cargo gerencia" on public.licoes for all to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());
revoke all on public.licoes from anon;

-- 2. LIÇÕES FEITAS -------------------------------------------------------------
create table if not exists public.licoes_feitas (
  usuario_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  licao_id   uuid not null references public.licoes (id) on delete cascade,
  feita_em   timestamptz not null default now(),
  primary key (usuario_id, licao_id)
);
create index if not exists licoes_feitas_quando on public.licoes_feitas (usuario_id, feita_em);

alter table public.licoes_feitas enable row level security;
drop policy if exists "licoes_feitas: lê a própria" on public.licoes_feitas;
create policy "licoes_feitas: lê a própria" on public.licoes_feitas for select to authenticated
  using (usuario_id = (select auth.uid()) or public.tem_cargo());
drop policy if exists "licoes_feitas: marca a própria" on public.licoes_feitas;
create policy "licoes_feitas: marca a própria" on public.licoes_feitas for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.e_membro());
drop policy if exists "licoes_feitas: desmarca a própria" on public.licoes_feitas;
create policy "licoes_feitas: desmarca a própria" on public.licoes_feitas for delete to authenticated
  using (usuario_id = (select auth.uid()));
-- sem update: a data de conclusão não se reescreve (é ela que conta a sequência)
revoke all on public.licoes_feitas from anon;
revoke update on public.licoes_feitas from authenticated;

-- 3. RECOMENDADO ANTES ---------------------------------------------------------
alter table public.modulos
  add column if not exists requisito_id uuid references public.modulos (id) on delete set null;
alter table public.modulos drop constraint if exists modulos_requisito_nao_ele_mesmo;
alter table public.modulos add constraint modulos_requisito_nao_ele_mesmo check (requisito_id is distinct from id);
