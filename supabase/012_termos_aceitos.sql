-- =============================================================================
-- GEAR — registro de aceite do Regimento Interno
-- Rodar no SQL Editor, DEPOIS de 001_perfis.sql.
--
-- POR QUE O INSERT NÃO VEM DO NAVEGADOR
-- Com confirmação de e-mail ligada (o padrão da Supabase), signUp() NÃO
-- devolve sessão: logo após o cadastro, auth.uid() é null e qualquer insert
-- feito pelo cliente seria recusado pela RLS. O aceite chegaria a existir só
-- para quem se cadastra com a confirmação desligada — ou seja, quase ninguém.
--
-- Então o aceite viaja no raw_user_meta_data do próprio signUp e é gravado
-- por trigger, no mesmo instante em que a conta nasce. É o mesmo caminho que
-- nome_completo e curso já usam em handle_new_user() (001).
-- =============================================================================

-- 1. TABELA ------------------------------------------------------------------
create table if not exists public.termos_aceitos (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null references auth.users (id) on delete cascade,
  aceito_em         timestamptz not null default now(),
  versao_documento  text not null,
  -- Aceitar a mesma versão duas vezes não cria dois registros; e é o que
  -- permite reexecutar esta migração sem duplicar nada.
  unique (usuario_id, versao_documento)
);

comment on table public.termos_aceitos is 'Aceite do Regimento Interno e Código de Conduta, por versão do documento.';
comment on column public.termos_aceitos.versao_documento is 'Espelha VERSAO_TERMOS em lib/site.ts. Subir a versão exige novo aceite.';

create index if not exists termos_aceitos_usuario_idx on public.termos_aceitos (usuario_id, aceito_em desc);

-- 2. TRIGGER DE REGISTRO -----------------------------------------------------
-- security definer pelo mesmo motivo de handle_new_user(): roda no contexto
-- do auth, onde a RLS bloquearia o insert.
create or replace function public.registrar_termos_aceitos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  versao text := nullif(new.raw_user_meta_data ->> 'termos_versao', '');
begin
  -- Sem versão no metadata não há aceite a registrar. Não levanta exceção:
  -- abortar aqui derrubaria a criação da conta inteira, inclusive a de
  -- usuários criados pelo painel da Supabase, que não passam pelo formulário.
  if versao is null then
    return new;
  end if;

  insert into public.termos_aceitos (usuario_id, versao_documento)
  values (new.id, versao)
  on conflict (usuario_id, versao_documento) do nothing;

  return new;
end;
$$;

-- Trigger próprio, em vez de reescrever handle_new_user(): as duas coisas são
-- independentes e falham separado. Convivem sem ordem definida entre si.
drop trigger if exists on_auth_user_created_termos on auth.users;
create trigger on_auth_user_created_termos
  after insert on auth.users
  for each row execute function public.registrar_termos_aceitos();

-- 3. RLS ---------------------------------------------------------------------
alter table public.termos_aceitos enable row level security;

-- Cada pessoa vê o próprio aceite.
drop policy if exists "termos: ler o próprio" on public.termos_aceitos;
create policy "termos: ler o próprio"
  on public.termos_aceitos for select
  to authenticated
  using ((select auth.uid()) = usuario_id);

-- A diretoria precisa conseguir auditar quem aceitou o quê.
drop policy if exists "termos: diretoria lê todos" on public.termos_aceitos;
create policy "termos: diretoria lê todos"
  on public.termos_aceitos for select
  to authenticated
  using (public.e_diretoria());

-- Insert do próprio aceite, para quem JÁ tem sessão aceitar uma versão nova
-- do documento sem precisar criar conta de novo. O cadastro não passa por
-- aqui — passa pelo trigger acima.
drop policy if exists "termos: registrar o próprio" on public.termos_aceitos;
create policy "termos: registrar o próprio"
  on public.termos_aceitos for insert
  to authenticated
  with check ((select auth.uid()) = usuario_id);

-- Sem UPDATE e sem DELETE, de propósito: registro de consentimento não se
-- edita nem se apaga. Some junto com a conta, pelo on delete cascade.

-- =============================================================================
-- SEM BACKFILL, DE PROPÓSITO
-- Quem se cadastrou antes desta migração fica sem linha em termos_aceitos.
-- Inserir um registro para essas contas seria inventar um consentimento que
-- ninguém deu. Para cobrar o aceite de quem já existe, o caminho é uma tela
-- que peça o aceite no próximo login e grave pela policy de insert acima.
--
-- Conferência:
--   select u.email, t.versao_documento, t.aceito_em
--     from public.termos_aceitos t join auth.users u on u.id = t.usuario_id
--    order by t.aceito_em desc;
--
--   -- contas sem aceite registrado:
--   select u.email from auth.users u
--    where not exists (select 1 from public.termos_aceitos t where t.usuario_id = u.id);
-- =============================================================================
