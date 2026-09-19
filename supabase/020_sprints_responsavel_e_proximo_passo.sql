-- =============================================================================
-- GEAR — responsável e próximo passo no sprint
-- Rodar no SQL Editor, DEPOIS de 011_sprints_diretoria.sql (qualquer uma das
-- posteriores serve: esta só acrescenta colunas, não mexe em política).
--
-- POR QUE AS DUAS COLUNAS
-- O painel de /membros passou a mostrar os sprints em andamento como execução,
-- não como catálogo. Execução responde a duas perguntas que a 008 não guardava:
-- quem está tocando e qual é o passo seguinte. Sem elas o cartão só repetiria
-- título e status, que já estão na página da frente.
--
-- A RLS NÃO MUDA. Coluna nova entra sob as políticas que já existem: leitura
-- para membro aprovado (008 + 014), escrita para cargo da própria frente (010)
-- ou diretoria (011). Não há política por coluna aqui — quem pode editar o
-- sprint pode editar estes dois campos, que é a regra que a entidade já opera.
-- =============================================================================

-- 1. RESPONSÁVEL -------------------------------------------------------------
/*
 * A FK aponta para public.perfis, NÃO para auth.users — e essa é a diferença
 * que faz a coluna servir para alguma coisa.
 *
 * `atualizado_por` (008) referencia auth.users, que o PostgREST não expõe: dá
 * para gravar o uuid, mas não dá para pedir o nome junto do sprint numa
 * consulta só. Era preciso um segundo select e um join à mão no servidor.
 * Com a FK em perfis, `perfis!sprints_responsavel_id_fkey (nome_completo)`
 * embute o nome direto — e perfis.id já é auth.users.id (001), então o valor
 * gravado é exatamente o mesmo uuid.
 *
 * `on delete set null`: quem sai da entidade não leva o sprint junto. O
 * trabalho continua registrado, sem dono, esperando quem assuma.
 *
 * Nullable de propósito: sprint sem responsável definido é estado real e
 * comum. Exigir a coluna travaria a edição de todo sprint já cadastrado.
 */
alter table public.sprints
  add column if not exists responsavel_id uuid references public.perfis (id) on delete set null;

comment on column public.sprints.responsavel_id is
  'Quem toca o sprint. Null = ainda sem responsável definido. FK em perfis (não auth.users) para o PostgREST poder embutir o nome.';

-- Buscar "os sprints de fulano" sem índice varre a tabela inteira.
create index if not exists sprints_responsavel_idx on public.sprints (responsavel_id);

-- 2. PRÓXIMO PASSO -----------------------------------------------------------
/*
 * Uma frase, não um plano. O limite de 200 é o mesmo de `titulo` (015) e é
 * deliberado: `descricao` já aceita 20 mil caracteres e é onde mora o
 * contexto. Se o próximo passo não couber em 200, ou são vários passos — e aí
 * é um por sprint — ou é descrição disfarçada.
 *
 * O CHECK vai inline no `add column` porque `add constraint` não aceita
 * `if not exists`: com a coluna já criada, o ALTER inteiro é pulado e o
 * arquivo continua idempotente. É o mesmo caminho de `valor_estimado` na 019.
 */
alter table public.sprints
  add column if not exists proximo_passo text
    check (proximo_passo is null or length(proximo_passo) <= 200);

comment on column public.sprints.proximo_passo is
  'A próxima ação concreta, em uma frase. Null = não declarado; a tela diz isso em vez de inventar.';

-- 3. ÍNDICE DO PAINEL --------------------------------------------------------
/*
 * O painel conta e lista sprints por status, sem filtrar frente. O índice da
 * 008 é (frente, status): com a frente ausente do WHERE, o Postgres não o usa.
 * Este cobre a consulta do painel — e o `updated_at desc` serve a ordenação
 * junto, evitando o sort depois do filtro.
 */
create index if not exists sprints_status_idx on public.sprints (status, updated_at desc);

-- 4. CACHE DO POSTGREST ------------------------------------------------------
-- O Supabase costuma recarregar sozinho, mas o embed de `perfis` só passa a
-- existir depois que o PostgREST relê o schema. Sem isto, a primeira carga do
-- painel pode devolver "could not find a relationship" mesmo com a FK de pé.
notify pgrst, 'reload schema';

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. as duas colunas existem (esperado: 2 linhas)
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'sprints'
--      and column_name in ('responsavel_id', 'proximo_passo');
--
--   -- 2. a FK aponta para perfis, não para auth.users (esperado: perfis)
--   select confrelid::regclass as aponta_para
--     from pg_constraint where conname = 'sprints_responsavel_id_fkey';
--
--   -- 3. as políticas continuam as mesmas 4 da 010/011 (esperado: 4 linhas)
--   select cmd, policyname from pg_policies
--    where tablename = 'sprints' order by cmd;
--
-- PREENCHER — o painel mostra "sem responsável" e "próximo passo não
-- declarado" até alguém preencher. Pela tela ainda não há campo; por enquanto,
-- no SQL Editor:
--
--   update public.sprints
--      set responsavel_id = (select id from public.perfis where nome_completo = 'Fulana de Tal'),
--          proximo_passo  = 'Fechar a malha de odometria com os encoders novos'
--    where titulo = '...';
-- =============================================================================
