-- =============================================================================
-- GEAR — Documentação institucional
-- Rodar no SQL Editor, DEPOIS de 001_perfis.sql (as políticas de escrita
-- dependem de perfis.cargo).
--
-- Diferente de patrimonio/atas: LER é liberado para qualquer membro
-- autenticado, sem exigir cargo. Escrever continua restrito a quem tem cargo.
-- =============================================================================

-- 1. TABELA ------------------------------------------------------------------
create table if not exists public.documentos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null unique,
  categoria     text not null check (categoria in (
                  'Governança', 'Técnico', 'Marca', 'Financeiro', 'Segurança')),
  -- Caminho do objeto dentro do bucket 'documentos' (ex.: 'regimento-interno.pdf').
  -- Null = arquivo ainda não anexado; a página mostra o aviso e não quebra.
  -- Uma URL http(s) completa também é aceita, para documento hospedado fora.
  arquivo_url   text,
  -- Null enquanto a versão do documento não foi definida. Não inventamos '1.0'.
  versao        text,
  atualizado_em timestamptz not null default now()
);

comment on table public.documentos is 'Repositório de documentos institucionais, legível por qualquer membro.';
comment on column public.documentos.arquivo_url is 'Caminho no bucket ''documentos'' ou URL http(s) externa. Null = arquivo não anexado.';

create index if not exists documentos_categoria_idx on public.documentos (categoria, titulo);

-- 2. atualizado_em ------------------------------------------------------------
-- Sem isto a coluna só registraria a criação, e a data na tela mentiria
-- depois do primeiro UPDATE.
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists documentos_tocar_atualizado_em on public.documentos;
create trigger documentos_tocar_atualizado_em
  before update on public.documentos
  for each row execute function public.tocar_atualizado_em();

-- 3. RLS ----------------------------------------------------------------------
alter table public.documentos enable row level security;

-- Leitura: qualquer sessão autenticada. É o ponto da página.
drop policy if exists "documentos: leitura autenticada" on public.documentos;
create policy "documentos: leitura autenticada"
  on public.documentos for select
  to authenticated
  using (true);

drop policy if exists "documentos: insert com cargo" on public.documentos;
create policy "documentos: insert com cargo"
  on public.documentos for insert
  to authenticated
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "documentos: update com cargo" on public.documentos;
create policy "documentos: update com cargo"
  on public.documentos for update
  to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

-- Sem DELETE, igual a patrimonio/atas: remoção é operação de painel.

-- 4. STORAGE ------------------------------------------------------------------
-- Bucket privado: documento interno não deve ficar acessível a quem tiver o
-- link. A página gera URL assinada de curta duração para cada arquivo.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Se o SQL Editor recusar os comandos abaixo por falta de permissão em
-- storage.objects, crie as mesmas regras pelo painel (Storage → Policies).
drop policy if exists "documentos storage: leitura autenticada" on storage.objects;
create policy "documentos storage: leitura autenticada"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documentos');

drop policy if exists "documentos storage: escrita com cargo" on storage.objects;
create policy "documentos storage: escrita com cargo"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documentos' and exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

drop policy if exists "documentos storage: substituir com cargo" on storage.objects;
create policy "documentos storage: substituir com cargo"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documentos' and exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ))
  with check (bucket_id = 'documentos' and exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.cargo is not null and p.cargo <> ''
  ));

-- 5. SEED ---------------------------------------------------------------------
-- arquivo_url e versao ficam null de propósito: os títulos são os reais, mas
-- os PDFs ainda não foram exportados. Depois do upload, para cada documento:
--   update public.documentos
--      set arquivo_url = 'regimento-interno.pdf', versao = '2025.1'
--    where titulo = 'Regimento Interno';
insert into public.documentos (titulo, categoria) values
  ('Regimento Interno',                   'Governança'),
  ('Manual Técnico de Competição',        'Técnico'),
  ('Manual Técnico de Pesquisa',          'Técnico'),
  ('Manual Técnico de Projetos',          'Técnico'),
  ('Manual de Marca',                     'Marca'),
  ('Manual Financeiro',                   'Financeiro'),
  ('Normas de Segurança do Laboratório',  'Segurança')
on conflict (titulo) do nothing;

-- Conferência:
-- select categoria, titulo, versao, arquivo_url from public.documentos order by categoria, titulo;
