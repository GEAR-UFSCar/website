-- =============================================================================
-- GEAR — progresso, status "Bloqueado" e diário de atividade do sprint
-- Rodar no SQL Editor, DEPOIS de 020_sprints_responsavel_e_proximo_passo.sql.
--
-- O que entra:
--   1. sprints.progresso        — inteiro 0–100, default 0
--   2. sprints.proximo_passo    — já veio na 020; a linha aqui é no-op
--   3. CHECK de status          — ganha 'Bloqueado'
--   4. sprint_atualizacoes      — diário de atividade, um registro por post
--
-- DUAS DECISÕES QUE DIVERGEM DO PEDIDO, e por quê:
--
--   · `autor_id` referencia public.perfis, NÃO auth.users. É o mesmo uuid
--     (perfis.id é FK de auth.users desde a 001, com cascade), então a
--     integridade contra auth.users continua garantida — em duas pernas em vez
--     de uma. A diferença é que o PostgREST não expõe o schema `auth`: com a FK
--     em auth.users o diário conseguiria gravar o autor e nunca mostrar o nome
--     dele sem uma segunda consulta. Mesmo motivo de `responsavel_id` na 020.
--
--   · O SELECT exige `e_membro()`, não só sessão autenticada. "Livre para
--     autenticados" é literalmente o `using (true)` que a 014 passou seis
--     tabelas fechando: quem tem conta e ainda espera aprovação é autenticado.
--     `e_membro()` é a regra que `sprints` já usa para leitura (014), e o
--     diário não pode ser mais aberto que o sprint que ele descreve.
-- =============================================================================

-- 1. PROGRESSO ---------------------------------------------------------------
/*
 * Inteiro e não numeric: progresso de sprint é declarado a dedo, em passos de
 * 5 ou 10. Casa decimal aqui sugeriria uma precisão que ninguém mede.
 *
 * `not null default 0` preenche as linhas que já existem sem travar nada —
 * sprint sem progresso declarado é sprint em 0%, que é a leitura honesta.
 */
alter table public.sprints
  add column if not exists progresso integer not null default 0
    check (progresso between 0 and 100);

comment on column public.sprints.progresso is
  'Andamento declarado, 0–100. Declarado por quem toca, não calculado — a tela diz isso.';

-- 2. PRÓXIMO PASSO -----------------------------------------------------------
-- Já criado na 020. Fica aqui só para este arquivo responder sozinho a quem o
-- ler: com a coluna de pé, o `if not exists` pula o ALTER inteiro e nada
-- acontece (nem constraint duplicada).
alter table public.sprints
  add column if not exists proximo_passo text
    check (proximo_passo is null or length(proximo_passo) <= 200);

-- 3. STATUS GANHA 'BLOQUEADO' ------------------------------------------------
/*
 * O CHECK da 008 foi escrito inline no `create table`, então o Postgres o
 * nomeou `sprints_status_check`. Não há `alter constraint` para mudar corpo de
 * CHECK: derruba e recria.
 *
 * Nenhum dado a converter — 'Bloqueado' é valor novo, os três antigos
 * continuam válidos. A recriação valida as linhas existentes na hora; se ela
 * falhar, é porque alguma linha tem status fora da lista, e aí o certo é
 * olhar essa linha e não afrouxar o CHECK.
 *
 * `not valid` seria tentador para ir mais rápido, e está errado aqui: a tabela
 * é pequena e um CHECK não validado deixa passar o que já está gravado.
 */
alter table public.sprints drop constraint if exists sprints_status_check;

alter table public.sprints
  add constraint sprints_status_check
  check (status in ('Planejado', 'Em andamento', 'Bloqueado', 'Concluído'));

comment on column public.sprints.status is
  'Planejado | Em andamento | Bloqueado | Concluído. Espelhado por STATUS_SPRINT em lib/administracao.ts.';

-- 4. DIÁRIO DE ATIVIDADE -----------------------------------------------------
create table if not exists public.sprint_atualizacoes (
  id          uuid primary key default gen_random_uuid(),
  -- cascade: apagado o sprint, o diário dele não tem mais do que falar
  sprint_id   uuid not null references public.sprints (id) on delete cascade,
  -- set null: quem sai da entidade não apaga o que escreveu (ver cabeçalho)
  autor_id    uuid references public.perfis (id) on delete set null,
  texto       text not null check (length(texto) between 1 and 2000),
  created_at  timestamptz not null default now()
);

comment on table public.sprint_atualizacoes is
  'Diário de atividade por sprint. Append-only: sem policy de UPDATE nem DELETE, por decisão — é registro, não rascunho.';

-- A consulta do diário é sempre "as atualizações deste sprint, da mais nova
-- para a mais velha". O índice cobre filtro e ordenação de uma vez.
create index if not exists sprint_atualizacoes_sprint_idx
  on public.sprint_atualizacoes (sprint_id, created_at desc);

-- 5. AUTORIA CARIMBADA PELO BANCO --------------------------------------------
/*
 * Mesmo desenho das quatro funções da 016: a policy recusaria a mentira, o
 * trigger torna a mentira impossível de expressar. Sem ele, quem pode escrever
 * no sprint poderia assinar a atualização com o uuid de outra pessoa.
 *
 * Imutável no update porque o diário é assinado: mesmo que um dia entre uma
 * policy de UPDATE, editar o texto não transfere a assinatura para o editor.
 *
 * auth.uid() nulo = SQL Editor ou service_role, que já ignoram RLS; nesse caso
 * o valor passado é respeitado, e é o que permite carga inicial.
 */
create or replace function public.carimbar_autor_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  if atual is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.autor_id := atual;
  else
    new.autor_id := old.autor_id;
  end if;

  return new;
end;
$$;

comment on function public.carimbar_autor_atualizacao() is
  'sprint_atualizacoes.autor_id = auth.uid() no insert, imutável no update. Mesmo padrão da 016.';

drop trigger if exists sprint_atualizacoes_carimbar_autor on public.sprint_atualizacoes;
create trigger sprint_atualizacoes_carimbar_autor
  before insert or update on public.sprint_atualizacoes
  for each row execute function public.carimbar_autor_atualizacao();

-- 6. QUEM PODE ESCREVER NAQUELE SPRINT ---------------------------------------
/*
 * A regra de escrita do sprint, em função, porque agora ela vale para duas
 * tabelas. Era um `exists` repetido 3 vezes na 011; copiá-lo uma quarta vez
 * aqui seria a cópia que sai de sincronia no dia em que a entidade mudar quem
 * pode mexer em sprint.
 *
 * Sem `security definer`, de propósito: a subconsulta roda sob a RLS de quem
 * pede, que já pode ler `sprints` (014) e `perfis` (009/014) se for membro
 * aprovado. Definer aqui só ampliaria privilégio sem necessidade.
 *
 * O join com perfis usa `p.id = auth.uid()` — é o perfil de QUEM PEDE contra a
 * frente DO SPRINT, não um produto cartesiano.
 */
create or replace function public.pode_editar_sprint(sprint uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.e_diretoria()
      or (
        public.tem_cargo()
        and exists (
          select 1
            from public.sprints s
            join public.perfis  p on p.id = (select auth.uid())
           where s.id = sprint
             and p.frente = s.frente
        )
      );
$$;

comment on function public.pode_editar_sprint(uuid) is
  'Espelha a escrita de sprints (011): diretoria em qualquer frente, outros cargos só na própria.';

-- Predicado de autorização fica fora do alcance anônimo — SEC-07 da 016.
revoke execute on function public.pode_editar_sprint(uuid) from public, anon;
grant  execute on function public.pode_editar_sprint(uuid) to authenticated, service_role;

-- 7. RLS DO DIÁRIO -----------------------------------------------------------
alter table public.sprint_atualizacoes enable row level security;

-- Leitura: membro aprovado, igual à de `sprints` (014). Ver cabeçalho.
drop policy if exists "sprint_atualizacoes: leitura de membro aprovado" on public.sprint_atualizacoes;
create policy "sprint_atualizacoes: leitura de membro aprovado"
  on public.sprint_atualizacoes for select
  to authenticated
  using (public.e_membro());

-- Escrita: exatamente quem pode editar aquele sprint.
drop policy if exists "sprint_atualizacoes: insert de quem edita o sprint" on public.sprint_atualizacoes;
create policy "sprint_atualizacoes: insert de quem edita o sprint"
  on public.sprint_atualizacoes for insert
  to authenticated
  with check (public.pode_editar_sprint(sprint_id));

/*
 * SEM policy de UPDATE e SEM policy de DELETE, e isso é a decisão, não o
 * esquecimento: sem policy, a operação é negada a todo mundo (menos
 * service_role, que ignora RLS). Diário de atividade é registro do que foi
 * dito quando — apagável, ele para de servir como memória do projeto.
 *
 * Para permitir que o autor apague o próprio post, o que falta é isto:
 *
 *   create policy "sprint_atualizacoes: delete do autor"
 *     on public.sprint_atualizacoes for delete to authenticated
 *     using (autor_id = (select auth.uid()));
 */

-- 8. CACHE DO POSTGREST ------------------------------------------------------
-- A tabela e o embed de `perfis` só existem para a API depois que o PostgREST
-- relê o schema. Sem isto a primeira carga pode devolver PGRST205.
notify pgrst, 'reload schema';

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. as colunas novas do sprint (esperado: progresso, proximo_passo)
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'sprints'
--      and column_name in ('progresso', 'proximo_passo', 'responsavel_id');
--
--   -- 2. o CHECK de status já aceita Bloqueado (esperado: 4 valores no texto)
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'sprints_status_check';
--
--   -- 3. RLS ligada e exatamente 2 policies, SELECT e INSERT
--   select relrowsecurity from pg_class where relname = 'sprint_atualizacoes';
--   select cmd, policyname from pg_policies
--    where tablename = 'sprint_atualizacoes' order by cmd;
--
--   -- 4. a FK do autor aponta para perfis (esperado: perfis)
--   select confrelid::regclass from pg_constraint
--    where conname = 'sprint_atualizacoes_autor_id_fkey';
--
--   -- 5. o predicado não é chamável por anon (esperado: f)
--   select has_function_privilege('anon', 'public.pode_editar_sprint(uuid)', 'execute');
--
-- TESTE RÁPIDO DO CARIMBO — com sessão de membro com cargo na frente:
--   insert into public.sprint_atualizacoes (sprint_id, texto, autor_id)
--   values ('<uuid do sprint>', 'teste', '00000000-0000-0000-0000-000000000000')
--   returning autor_id;        -- deve voltar o SEU uuid, não o de zeros
-- =============================================================================
