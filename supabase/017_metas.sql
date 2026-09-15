-- =============================================================================
-- GEAR — metas pessoais dos membros
-- Rodar no SQL Editor, DEPOIS de 016_autoria_e_predicados.sql.
--
-- O QUE ISTO ACRESCENTA
-- `eventos` (008) é o calendário da entidade: escrita restrita a quem tem
-- cargo, leitura para todo membro aprovado. `metas` é o oposto em matéria de
-- dono — cada linha pertence a uma pessoa, e essa pessoa é a única que
-- escreve, tenha cargo ou não. As duas tabelas não se conversam: uma é agenda
-- institucional, a outra é compromisso individual.
--
-- A NOVIDADE NO MODELO DE ACESSO
-- Até aqui toda tabela era "todo membro lê" ou "só a diretoria lê". Esta é a
-- primeira com leitura MISTA na mesma tabela: a própria linha sempre, a linha
-- alheia só quando marcada como pública. O predicado de SELECT é onde isso
-- mora, e é a parte deste arquivo que merece releitura antes de mudar.
--
-- NOME DA COLUNA DE VÍNCULO
-- `frente_vinculada`, não `trilha_vinculada`. A 013 renomeou `trilha` para
-- `frente` em perfis, sprints e eventos justamente para o vocabulário ser um
-- só; nascer com o nome antigo seria reabrir o que aquela migração fechou.
-- =============================================================================

-- 1. TABELA ------------------------------------------------------------------
create table if not exists public.metas (
  id                uuid primary key default gen_random_uuid(),
  -- on delete cascade: meta é dado pessoal. Conta apagada, metas vão junto —
  -- é o que a LGPD chama de eliminação, e não há valor institucional em manter
  -- a meta órfã de quem saiu da entidade.
  usuario_id        uuid not null references auth.users (id) on delete cascade,
  titulo            text not null,
  descricao         text,
  prazo             date not null,
  visibilidade      text not null default 'Privada'
                      check (visibilidade in ('Privada', 'Pública')),
  concluida         boolean not null default false,
  -- null = meta pessoal sem vínculo com frente. A lista é a mesma de 001.
  frente_vinculada  text check (frente_vinculada in ('Competição', 'Pesquisa', 'Projetos')),
  created_at        timestamptz not null default now(),

  -- Mesmos tetos de 015, pela mesma razão (SEC-05): texto livre sem limite é
  -- convite a inflar o banco. Título de uma linha, descrição de um parágrafo
  -- longo — meta não é ata.
  constraint metas_titulo_tam    check (length(titulo) <= 200),
  constraint metas_descricao_tam check (descricao is null or length(descricao) <= 5000)
);

comment on table public.metas is
  'Metas pessoais. Dono escreve, dono lê; as marcadas como Pública são lidas por qualquer membro aprovado.';
comment on column public.metas.visibilidade is
  'Privada = só o dono vê. Pública = todo membro aprovado vê, mas continua só o dono editando.';
comment on column public.metas.frente_vinculada is
  'Null = meta sem vínculo com frente. Espelha FRENTES em lib/administracao.ts.';

-- A consulta de "Minhas Metas" é sempre (dono, ordenado por prazo).
create index if not exists metas_usuario_prazo_idx on public.metas (usuario_id, prazo);

-- A de "Metas Públicas" varre só a fatia pública — índice parcial, porque o
-- esperado é que a maioria das linhas seja privada.
create index if not exists metas_publicas_prazo_idx on public.metas (prazo)
  where visibilidade = 'Pública';

-- 2. DONO CARIMBADO PELO BANCO -----------------------------------------------
-- Mesmo raciocínio de 016: a policy recusa a mentira, o trigger torna a
-- mentira inexprimível. Aqui isso vale dobrado — `usuario_id` não é só
-- autoria, é a chave de TODO o controle de acesso desta tabela.
--
-- No UPDATE o valor antigo é restaurado: meta não se transfere. Sem esta
-- metade, o dono poderia empurrar a própria meta para a conta de outra pessoa
-- (o `with check` da policy aprovaria a linha ANTES de olhar quem era dono).
create or replace function public.carimbar_dono_meta()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  -- auth.uid() nulo = SQL Editor ou service_role, que já ignoram RLS.
  if atual is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.usuario_id := atual;
  else
    new.usuario_id := old.usuario_id;
  end if;

  return new;
end;
$$;

comment on function public.carimbar_dono_meta() is
  'metas.usuario_id = auth.uid() no insert, imutável no update. Mesmo padrão de 016.';

drop trigger if exists metas_carimbar_dono on public.metas;
create trigger metas_carimbar_dono
  before insert or update on public.metas
  for each row execute function public.carimbar_dono_meta();

-- 3. RLS ---------------------------------------------------------------------
alter table public.metas enable row level security;

/*
 * LEITURA — duas portas na mesma policy.
 *
 *   1ª  é minha: vejo sempre, privada ou não, aprovado ou não. Negar a alguém
 *       o próprio dado não protege ninguém.
 *   2ª  é pública E quem pede é membro aprovado.
 *
 * O `e_membro()` na segunda porta é acréscimo deliberado ao pedido original
 * ("qualquer membro autenticado vê"). Desde a 014, "autenticado" não significa
 * mais nada neste projeto: qualquer pessoa cria conta. O que dá acesso ao
 * interno é `aprovado`. Sem esta metade, `metas` seria a única tabela interna
 * legível por conta não aprovada — exatamente o SEC-01 que a 014 fechou.
 */
drop policy if exists "metas: dono lê a própria, membros leem as públicas" on public.metas;
create policy "metas: dono lê a própria, membros leem as públicas"
  on public.metas for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or (visibilidade = 'Pública' and public.e_membro())
  );

/*
 * ESCRITA — só o dono, nas três operações, sem exceção de cargo.
 * Diretoria não edita meta alheia: publicar uma meta é abrir para LEITURA,
 * nunca para revisão. É por isso que a policy de UPDATE não tem ramo
 * `e_diretoria()`, ao contrário de quase tudo o mais no schema.
 *
 * `with check` no UPDATE além do `using`: o primeiro escolhe as linhas que
 * podem ser tocadas, o segundo valida como elas ficam depois. Só com os dois
 * a linha não pode sair do meu domínio no meio da edição.
 */
drop policy if exists "metas: insert do dono" on public.metas;
create policy "metas: insert do dono"
  on public.metas for insert to authenticated
  with check (usuario_id = (select auth.uid()));

drop policy if exists "metas: update do dono" on public.metas;
create policy "metas: update do dono"
  on public.metas for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop policy if exists "metas: delete do dono" on public.metas;
create policy "metas: delete do dono"
  on public.metas for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. RLS ligada (esperado: 1 linha, rls_ativa = t)
--   select c.relname as tabela, c.relrowsecurity as rls_ativa
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relname = 'metas';
--
--   -- 2. quatro policies, uma por comando (esperado: 4 linhas)
--   select cmd, policyname from pg_policies
--    where schemaname = 'public' and tablename = 'metas' order by cmd;
--
--   -- 3. o trigger de dono existe (esperado: 1 linha)
--   select trigger_name, event_manipulation from information_schema.triggers
--    where event_object_table = 'metas';
--
--   -- 4. colunas como especificadas
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'metas'
--    order by ordinal_position;
--
-- TESTE DA FRONTEIRA ENTRE MEMBROS — o único que a interface não prova
-- sozinha. Precisa de duas contas APROVADAS, A e B. Com a sessão de A:
--
--   insert into public.metas (titulo, prazo, visibilidade)
--        values ('Meta pública de teste', current_date + 7, 'Pública');
--   insert into public.metas (titulo, prazo)
--        values ('Meta privada de teste', current_date + 7);
--
-- Depois, com a sessão de B, pelo PostgREST:
--   GET    /rest/v1/metas?select=titulo  → só a pública de A aparece
--   PATCH  /rest/v1/metas?id=eq.<id-da-pública-de-A>  {"concluida":true}
--                                        → 0 linhas afetadas (não é dono)
--   DELETE /rest/v1/metas?id=eq.<id-da-pública-de-A>
--                                        → 0 linhas afetadas (não é dono)
--
-- E com a sessão de A, tentando empurrar a meta para B:
--   PATCH  /rest/v1/metas?id=eq.<id>  {"usuario_id":"<uuid-de-B>"}
--                                        → grava, mas usuario_id volta como A
--                                          (o trigger restaurou o valor antigo)
-- =============================================================================
