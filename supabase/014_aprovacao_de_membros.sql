-- =============================================================================
-- GEAR — aprovação de membros (corrige SEC-01)
-- Rodar no SQL Editor, DEPOIS de 013_frentes_e_diretores.sql.
--
-- O PROBLEMA
-- A restrição de e-mail institucional existia só em components/entrar.tsx, no
-- navegador. Um POST direto ao endpoint de signup, com a chave anônima que
-- está no bundle, criava conta com qualquer domínio. E seis policies liberavam
-- leitura com `using (true)` para qualquer sessão autenticada: perfis (o
-- diretório inteiro), documentos, avisos, eventos, sprints e modulos, mais o
-- bucket de documentos. Bastava um cadastro com Gmail para ler o cadastro de
-- estudantes identificáveis e os PDFs institucionais.
--
-- A CORREÇÃO
-- Ter conta deixa de significar alguma coisa. O que dá acesso é `aprovado`,
-- que só a diretoria concede. Quatro níveis: autenticado < membro aprovado <
-- com cargo < diretoria.
--
-- DEPENDÊNCIA: guardar_cargo() abaixo referencia `frente`. Se 013 não tiver
-- rodado, esta migração falha no passo 4. Rode 013 primeiro.
-- =============================================================================

-- 1. COLUNA + BACKFILL -------------------------------------------------------
alter table public.perfis
  add column if not exists aprovado boolean not null default false;

-- CRÍTICO: sem isto a entidade inteira perde o acesso no instante da migração,
-- inclusive a diretoria — e aí não sobra ninguém para aprovar ninguém.
update public.perfis set aprovado = true where not aprovado;

comment on column public.perfis.aprovado is
  'Membro validado pela diretoria. Falso = a conta existe mas não enxerga nada interno.';

create index if not exists perfis_aprovado_idx on public.perfis (aprovado) where not aprovado;

-- 2. PREDICADOS --------------------------------------------------------------
-- security definer é OBRIGATÓRIO: a policy de leitura de perfis passa a chamar
-- esta função, que lê perfis. Sem definer o Postgres aborta com recursão
-- (42P17) — mesma razão documentada em 004 para e_diretoria().
create or replace function public.e_membro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.aprovado
  );
$$;

comment on function public.e_membro() is 'Verdadeiro se quem pede é membro aprovado. Base de toda leitura interna.';

-- Cargo passa a implicar aprovação: revogar alguém corta leitura E escrita
-- numa tacada, sem precisar limpar o cargo também.
create or replace function public.tem_cargo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid())
      and p.aprovado
      and p.cargo is not null
      and p.cargo <> ''
  );
$$;

-- e_diretoria() (004) idem, para a mesma garantia no topo da hierarquia.
create or replace function public.e_diretoria()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid())
      and p.aprovado
      and p.cargo in ('Presidente', 'Vice-Presidente')
  );
$$;

-- 3. CADASTRO NÃO APROVA ----------------------------------------------------
-- handle_new_user() (001) NÃO muda: a coluna nasce `false` pelo default, então
-- toda conta nova entra aguardando. É a opção de aprovação manual — o domínio
-- institucional continua sendo só uma dica na interface, e deixou de ser a
-- linha de defesa.

-- 4. FECHA A AUTOAPROVAÇÃO ---------------------------------------------------
-- `perfis: editar o próprio` (001) permite UPDATE da própria linha, e este
-- trigger só guardava as colunas que lista. Sem acrescentar `aprovado` aqui,
-- qualquer pessoa faria PATCH {"aprovado":true} e a migração inteira seria
-- decorativa.
create or replace function public.guardar_cargo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  -- Sem sessão = SQL Editor ou service_role, que já ignoram RLS. É também o
  -- que permite a promoção do primeiro Presidente.
  if atual is null then
    return new;
  end if;

  -- Em perfil de outra pessoa, só cargo e aprovação podem mudar.
  if atual is distinct from old.id then
    if (new.id, new.nome_completo, new.curso, new.frente, new.created_at)
       is distinct from (old.id, old.nome_completo, old.curso, old.frente, old.created_at) then
      raise exception 'Em perfil de outra pessoa, apenas cargo e aprovação podem ser alterados.';
    end if;
  end if;

  if new.aprovado is distinct from old.aprovado then
    if not public.e_diretoria() then
      raise exception 'Apenas Presidente ou Vice-Presidente podem aprovar ou revogar membros.';
    end if;
    -- Nem a diretoria mexe na própria aprovação: evita que alguém se revogue
    -- por engano e tranque o acesso, e fecha o caminho de autoaprovação para
    -- quem venha a virar diretoria por outro meio.
    if atual = old.id then
      raise exception 'Ninguém altera a própria aprovação.';
    end if;
  end if;

  if new.cargo is distinct from old.cargo then
    if not public.e_diretoria() then
      raise exception 'Apenas Presidente ou Vice-Presidente podem alterar cargo.';
    end if;
    new.cargo_atualizado_por := atual;
    new.cargo_atualizado_em  := now();
  else
    -- ninguém reescreve a auditoria num update comum de perfil
    new.cargo_atualizado_por := old.cargo_atualizado_por;
    new.cargo_atualizado_em  := old.cargo_atualizado_em;
  end if;

  return new;
end;
$$;

-- 5. FECHA AS SEIS SUPERFÍCIES DE LEITURA ------------------------------------
-- "perfis: ler o próprio" (001) PERMANECE de propósito: sem ela a tela de
-- espera não conseguiria ler o próprio perfil para saber que está esperando.
drop policy if exists "perfis: membros leem todos" on public.perfis;
drop policy if exists "perfis: membros aprovados leem todos" on public.perfis;
create policy "perfis: membros aprovados leem todos"
  on public.perfis for select to authenticated using (public.e_membro());

drop policy if exists "documentos: leitura autenticada" on public.documentos;
create policy "documentos: leitura de membro aprovado"
  on public.documentos for select to authenticated using (public.e_membro());

drop policy if exists "avisos: leitura autenticada" on public.avisos;
create policy "avisos: leitura de membro aprovado"
  on public.avisos for select to authenticated using (public.e_membro());

drop policy if exists "eventos: leitura autenticada" on public.eventos;
create policy "eventos: leitura de membro aprovado"
  on public.eventos for select to authenticated using (public.e_membro());

drop policy if exists "sprints: leitura autenticada" on public.sprints;
create policy "sprints: leitura de membro aprovado"
  on public.sprints for select to authenticated using (public.e_membro());

drop policy if exists "modulos: leitura autenticada" on public.modulos;
create policy "modulos: leitura de membro aprovado"
  on public.modulos for select to authenticated using (public.e_membro());

-- Bucket privado: a URL assinada só é gerada para quem passa por aqui.
drop policy if exists "documentos storage: leitura autenticada" on storage.objects;
create policy "documentos storage: leitura de membro aprovado"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.e_membro());

-- 6. DIRETORIA APROVA --------------------------------------------------------
-- A policy de 004 ("perfis: diretoria edita cargo") já cobre UPDATE pela
-- diretoria; o trigger acima é quem decide o que pode mudar. Recriada aqui
-- só para o nome dizer o que ela de fato autoriza hoje.
drop policy if exists "perfis: diretoria edita cargo" on public.perfis;
drop policy if exists "perfis: diretoria edita cargo e aprovação" on public.perfis;
create policy "perfis: diretoria edita cargo e aprovação"
  on public.perfis for update to authenticated
  using (public.e_diretoria()) with check (public.e_diretoria());

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. ninguém pode ter ficado de fora no backfill (esperado: 0)
--   select count(*) from public.perfis where not aprovado;
--
--   -- 2. a diretoria continua aprovada e com cargo (esperado: >= 1)
--   select count(*) from public.perfis
--    where aprovado and cargo in ('Presidente', 'Vice-Presidente');
--
--   -- 3. nenhuma policy de leitura interna com `true` (esperado: 0 linhas)
--   select tablename, policyname from pg_policies
--    where schemaname = 'public' and cmd = 'SELECT' and qual = 'true'
--      and tablename in ('perfis','documentos','avisos','eventos','sprints','modulos');
--
--   -- 4. as três funções existem e são security definer (esperado: 3 linhas, t)
--   select proname, prosecdef from pg_proc
--    where proname in ('e_membro','tem_cargo','e_diretoria');
-- =============================================================================
