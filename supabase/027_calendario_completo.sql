-- =============================================================================
-- GEAR — Calendário completo: local, link, dia inteiro, repetição, presença e
-- assinatura por link
-- Rodar no SQL Editor, DEPOIS de 008 (eventos), 014 (e_membro) e 016 (autoria).
--
-- TUDO AQUI É ADITIVO. Nenhuma coluna existente muda, nenhuma política de
-- `eventos` é tocada: quem pode ler, criar, editar e apagar evento continua
-- sendo exatamente quem podia antes (leitura = membro aprovado; escrita = quem
-- tem cargo). O código novo lê `eventos` com select("*"), então roda também
-- num banco em que esta migração ainda não foi aplicada — só não mostra os
-- campos novos.
-- =============================================================================

-- 1. CAMPOS NOVOS EM EVENTOS --------------------------------------------------
alter table public.eventos
  add column if not exists local          text,
  add column if not exists link           text,
  add column if not exists dia_inteiro    boolean not null default false,
  add column if not exists recorrencia    text,
  add column if not exists recorrencia_ate date;

comment on column public.eventos.local is 'Onde acontece (sala, laboratório, "online"). Texto livre.';
comment on column public.eventos.link is 'Link da reunião online ou de um documento de apoio. Só http(s).';
comment on column public.eventos.dia_inteiro is 'Evento sem hora marcada. data_inicio/data_fim guardam o primeiro e o último dia, em Brasília.';
comment on column public.eventos.recorrencia is 'null = evento único. A tela expande a repetição; o banco guarda só a regra.';
comment on column public.eventos.recorrencia_ate is 'Último dia (inclusive) em que a repetição vale. null = sem fim.';

alter table public.eventos drop constraint if exists eventos_local_tam;
alter table public.eventos add constraint eventos_local_tam
  check (local is null or length(local) <= 200);

-- Só http(s): um `javascript:` num campo de link vira XSS no clique.
alter table public.eventos drop constraint if exists eventos_link_valido;
alter table public.eventos add constraint eventos_link_valido
  check (link is null or (length(link) <= 500 and link ~* '^https?://'));

alter table public.eventos drop constraint if exists eventos_recorrencia_valida;
alter table public.eventos add constraint eventos_recorrencia_valida
  check (recorrencia is null or recorrencia in ('semanal', 'quinzenal', 'mensal'));

-- Fim de repetição sem repetição é dado solto.
alter table public.eventos drop constraint if exists eventos_recorrencia_ate_coerente;
alter table public.eventos add constraint eventos_recorrencia_ate_coerente
  check (recorrencia_ate is null or recorrencia is not null);

-- 2. PRESENÇA: "VOU / TALVEZ / NÃO VOU" ---------------------------------------
/*
 * Uma linha por pessoa, evento e OCORRÊNCIA. `dia` é o dia (em Brasília) em
 * que a ocorrência começa: numa reunião semanal, cada semana tem a sua
 * resposta, e responder "não vou" na de hoje não apaga a da semana que vem.
 *
 * Isto é confirmação de presença, não frequência: quem registra a presença de
 * fato (para certificado e relatório à ProEx) é outra rotina.
 */
create table if not exists public.eventos_presencas (
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  dia           date not null,
  resposta      text not null check (resposta in ('vou', 'talvez', 'nao')),
  atualizado_em timestamptz not null default now(),
  primary key (evento_id, usuario_id, dia)
);

comment on table public.eventos_presencas is 'Confirmação de presença por ocorrência de evento. Cada pessoa mexe só na própria.';

create index if not exists eventos_presencas_dia_idx on public.eventos_presencas (dia);
create index if not exists eventos_presencas_usuario_idx on public.eventos_presencas (usuario_id, dia);

alter table public.eventos_presencas enable row level security;

drop policy if exists "presencas: leitura de membro aprovado" on public.eventos_presencas;
create policy "presencas: leitura de membro aprovado"
  on public.eventos_presencas for select to authenticated using (public.e_membro());

drop policy if exists "presencas: insert da propria" on public.eventos_presencas;
create policy "presencas: insert da propria"
  on public.eventos_presencas for insert to authenticated
  with check (public.e_membro() and usuario_id = (select auth.uid()));

drop policy if exists "presencas: update da propria" on public.eventos_presencas;
create policy "presencas: update da propria"
  on public.eventos_presencas for update to authenticated
  using (public.e_membro() and usuario_id = (select auth.uid()))
  with check (public.e_membro() and usuario_id = (select auth.uid()));

drop policy if exists "presencas: delete da propria" on public.eventos_presencas;
create policy "presencas: delete da propria"
  on public.eventos_presencas for delete to authenticated
  using (public.e_membro() and usuario_id = (select auth.uid()));

-- 3. ASSINATURA POR LINK (Google Agenda, Apple Calendário, Outlook) -------------
/*
 * Aplicativo de agenda não manda cookie, então o endereço da assinatura
 * carrega um segredo: o `token`. Quem tem o link lê os EVENTOS da entidade
 * (os mesmos que um membro aprovado já lê), e mais nada: metas, sprints e
 * perfis não saem por aqui.
 *
 * Revogar é gerar outro token: o link antigo para de funcionar na hora.
 * Perder a aprovação também encerra o acesso, porque a função confere
 * `aprovado` a cada chamada.
 */
create table if not exists public.calendario_assinaturas (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  criado_em  timestamptz not null default now()
);

comment on table public.calendario_assinaturas is 'Token do link de assinatura do calendário. Um por membro; trocar o token revoga o link.';

alter table public.calendario_assinaturas enable row level security;

drop policy if exists "assinaturas: leitura da propria" on public.calendario_assinaturas;
create policy "assinaturas: leitura da propria"
  on public.calendario_assinaturas for select to authenticated
  using (public.e_membro() and usuario_id = (select auth.uid()));

drop policy if exists "assinaturas: insert da propria" on public.calendario_assinaturas;
create policy "assinaturas: insert da propria"
  on public.calendario_assinaturas for insert to authenticated
  with check (public.e_membro() and usuario_id = (select auth.uid()));

drop policy if exists "assinaturas: update da propria" on public.calendario_assinaturas;
create policy "assinaturas: update da propria"
  on public.calendario_assinaturas for update to authenticated
  using (public.e_membro() and usuario_id = (select auth.uid()))
  with check (public.e_membro() and usuario_id = (select auth.uid()));

drop policy if exists "assinaturas: delete da propria" on public.calendario_assinaturas;
create policy "assinaturas: delete da propria"
  on public.calendario_assinaturas for delete to authenticated
  using (public.e_membro() and usuario_id = (select auth.uid()));

/*
 * Lida pelo papel `anon` (o aplicativo de agenda não tem sessão). SECURITY
 * DEFINER para enxergar eventos sem a política de leitura de membro, e por
 * isso devolve só as colunas que a agenda precisa — nada de criado_por.
 * Token que não existe, ou de quem não é mais aprovado, devolve zero linhas.
 */
create or replace function public.feed_do_calendario(p_token uuid)
returns table (
  id               uuid,
  titulo           text,
  descricao        text,
  tipo             text,
  data_inicio      timestamptz,
  data_fim         timestamptz,
  frente_vinculada text,
  local            text,
  link             text,
  dia_inteiro      boolean,
  recorrencia      text,
  recorrencia_ate  date
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.titulo, e.descricao, e.tipo, e.data_inicio, e.data_fim,
         e.frente_vinculada, e.local, e.link, e.dia_inteiro, e.recorrencia, e.recorrencia_ate
  from public.eventos e
  where exists (
    select 1
    from public.calendario_assinaturas a
    join public.perfis p on p.id = a.usuario_id
    where a.token = p_token and p.aprovado
  )
  order by e.data_inicio;
$$;

revoke all on function public.feed_do_calendario(uuid) from public;
grant execute on function public.feed_do_calendario(uuid) to anon, authenticated;

comment on function public.feed_do_calendario(uuid) is 'Eventos para o feed .ics. Exige token válido de membro aprovado; devolve só colunas de agenda.';

/*
 * `feed_do_calendario` devolve zero linhas tanto para token errado quanto para
 * token certo com agenda vazia, e o endereço do feed precisa distinguir os
 * dois: o primeiro é 404, o segundo é um calendário vazio que o aplicativo
 * aceita e preenche depois. Token é um uuid aleatório de 122 bits, então
 * perguntar "este vale?" não ajuda ninguém a adivinhar outro.
 */
create or replace function public.calendario_token_valido(p_token uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calendario_assinaturas a
    join public.perfis p on p.id = a.usuario_id
    where a.token = p_token and p.aprovado
  );
$$;

revoke all on function public.calendario_token_valido(uuid) from public;
grant execute on function public.calendario_token_valido(uuid) to anon, authenticated;

comment on function public.calendario_token_valido(uuid) is 'O token de assinatura existe e é de membro aprovado? Só diz sim ou não.';

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. colunas novas (esperado: 5 linhas)
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'eventos'
--     and column_name in ('local','link','dia_inteiro','recorrencia','recorrencia_ate');
--
--   -- 2. RLS ligada nas duas tabelas novas (esperado: 2 linhas, rowsecurity = true)
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename in ('eventos_presencas','calendario_assinaturas');
--
--   -- 3. token inventado não devolve nada (esperado: 0 e false)
--   select count(*) from public.feed_do_calendario('00000000-0000-0000-0000-000000000000');
--   select public.calendario_token_valido('00000000-0000-0000-0000-000000000000');
-- =============================================================================
