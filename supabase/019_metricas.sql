-- =============================================================================
-- GEAR — métricas de impacto por período
-- Rodar no SQL Editor, DEPOIS de 016_autoria_e_predicados.sql.
--
-- Modelo de cadeia lógica: Insumos → Atividades → Resultados → Impacto.
-- Cada camada é um jsonb, porque o conjunto de indicadores muda de semestre
-- para semestre e uma coluna por indicador viraria uma migração por ideia
-- nova. O preço do jsonb é que o banco não valida a forma — quem valida é
-- lib/metricas.ts, na fronteira de leitura e de escrita.
--
-- NOME DA COLUNA DE FRENTE
-- `frente`, não `trilha`: a policy de escrita compara com `perfis.frente`, que
-- é como a 013 deixou a coluna. Um `trilha` aqui obrigaria a ler
-- `p.frente = m.trilha` em código de autorização, que é onde menos se quer
-- confusão de vocabulário.
-- =============================================================================

-- 1. PATRIMÔNIO GANHA VALOR --------------------------------------------------
-- Pré-requisito do indicador `valor_patrimonio`, que a especificação exige ser
-- CALCULADO e não digitado. A 003 criou `patrimonio` sem nenhuma coluna de
-- valor, então não havia o que somar. Nullable de propósito: o inventário já
-- existe preenchido, e exigir valor retroativo travaria a edição de todo item
-- antigo.
alter table public.patrimonio
  add column if not exists valor_estimado numeric(12,2) check (valor_estimado is null or valor_estimado >= 0);

comment on column public.patrimonio.valor_estimado is
  'Valor unitário estimado em BRL. Null = não estimado; entra como zero na soma.';

/*
 * Soma do inventário. `security definer` porque a leitura de `patrimonio`
 * exige cargo (003/016) e esta função é chamada na tela de métricas, que
 * qualquer membro aprovado abre — o que sai daqui é UM número agregado, não
 * a lista de bens.
 *
 * 'Baixado' fica de fora: bem baixado saiu do patrimônio, e mantê-lo na conta
 * faria o indicador crescer para sempre.
 */
create or replace function public.valor_patrimonio_atual()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.quantidade * coalesce(p.valor_estimado, 0)), 0)
    from public.patrimonio p
   where p.status <> 'Baixado';
$$;

comment on function public.valor_patrimonio_atual() is
  'Soma de quantidade * valor_estimado do patrimônio ativo. Alimenta insumos.valor_patrimonio.';

revoke execute on function public.valor_patrimonio_atual() from public, anon;
grant execute on function public.valor_patrimonio_atual() to authenticated, service_role;

-- 2. TABELA ------------------------------------------------------------------
create table if not exists public.metricas_periodo (
  id             uuid primary key default gen_random_uuid(),
  -- "2026.2": ano e semestre. O formato é fechado porque proximoPeriodo() em
  -- lib/metricas.ts depende dele para saber qual é o próximo.
  periodo        text not null check (periodo ~ '^\d{4}\.[12]$'),
  status         text not null default 'Em andamento'
                   check (status in ('Em andamento', 'Fechado')),
  -- null = métrica geral da entidade, que só a diretoria edita
  frente         text check (frente in ('Competição', 'Pesquisa', 'Projetos')),

  insumos        jsonb not null default '{}'::jsonb,
  atividades     jsonb not null default '{}'::jsonb,
  resultados     jsonb not null default '{}'::jsonb,
  impacto        jsonb not null default '{}'::jsonb,

  atualizado_por uuid references auth.users (id) on delete set null,
  atualizado_em  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

comment on table public.metricas_periodo is
  'Indicadores por período em quatro camadas. frente null = entidade inteira.';

/*
 * Um registro por período e frente. Sem isto, dois cliques em "Novo período"
 * criariam dois 2027.1 e a tela mostraria um deles ao acaso.
 * `coalesce` porque UNIQUE não junta linhas com null — sem ele, o registro
 * geral (frente nula) poderia ser criado infinitas vezes.
 */
create unique index if not exists metricas_periodo_unico
  on public.metricas_periodo (periodo, coalesce(frente, 'GERAL'));

create index if not exists metricas_periodo_recente_idx
  on public.metricas_periodo (status, periodo desc);

-- 3. CARIMBO DE AUTORIA ------------------------------------------------------
-- Mesmo padrão de 016: a coluna diz "quem mexeu por último", então é reescrita
-- em todo update, e o cliente não consegue mentir sobre ela.
create or replace function public.carimbar_metrica()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  new.atualizado_em := now();
  if atual is not null then
    new.atualizado_por := atual;
  end if;
  return new;
end;
$$;

drop trigger if exists metricas_carimbar on public.metricas_periodo;
create trigger metricas_carimbar
  before insert or update on public.metricas_periodo
  for each row execute function public.carimbar_metrica();

-- 4. RLS ---------------------------------------------------------------------
alter table public.metricas_periodo enable row level security;

/*
 * LEITURA: qualquer sessão autenticada, como especificado.
 *
 * Note a diferença para o resto do schema interno, que desde a 014 exige
 * e_membro(). Aqui a régua é mais baixa DE PROPÓSITO porque a vitrine pública
 * (seção 6) precisa dos mesmos números — e o que ela expõe é um subconjunto
 * escolhido a dedo, pela view, não a tabela inteira.
 */
drop policy if exists "metricas: leitura autenticada" on public.metricas_periodo;
create policy "metricas: leitura autenticada"
  on public.metricas_periodo for select to authenticated using (true);

/*
 * ESCRITA: a mesma forma da 011, com um terceiro caso.
 *   · diretoria            → qualquer registro, inclusive o geral;
 *   · cargo + frente igual → só a própria frente;
 *   · frente nula          → só diretoria (o `and m.frente is not null` do
 *                            segundo ramo é o que fecha isso).
 *
 * Os dois lados vão qualificados — `perfis` e `metricas_periodo` têm ambas uma
 * coluna `frente`, e nome solto dentro da subconsulta resolveria para perfis
 * por escopo implícito. É a mesma armadilha anotada na 011.
 */
drop policy if exists "metricas: escrita por diretoria ou cargo da frente" on public.metricas_periodo;
create policy "metricas: escrita por diretoria ou cargo da frente"
  on public.metricas_periodo for insert to authenticated
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and metricas_periodo.frente is not null
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = metricas_periodo.frente
      )
    )
  );

-- USING olha a linha como está; WITH CHECK, como ela fica. Com a condição nos
-- dois, quem tem cargo não move a métrica da própria frente para outra.
drop policy if exists "metricas: edição por diretoria ou cargo da frente" on public.metricas_periodo;
create policy "metricas: edição por diretoria ou cargo da frente"
  on public.metricas_periodo for update to authenticated
  using (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and metricas_periodo.frente is not null
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = metricas_periodo.frente
      )
    )
  )
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and metricas_periodo.frente is not null
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = metricas_periodo.frente
      )
    )
  );

-- Sem DELETE, como em patrimonio e atas: período encerrado vira histórico
-- (status 'Fechado'), não some.

-- 5. VITRINE PÚBLICA ---------------------------------------------------------
/*
 * A especificação pede os números no site público E leitura restrita a
 * autenticado. As duas coisas não cabem na mesma policy, então a saída é uma
 * VIEW com o recorte apresentável — e só ele.
 *
 * `security_invoker = false` (o padrão) faz a view rodar com o privilégio do
 * dono e, portanto, atravessar a RLS da tabela. É deliberado e é o motivo de
 * a lista de colunas abaixo ser escrita à mão, campo por campo:
 *
 *   FICA DE FORA, e não por esquecimento: `insumos` inteiro (valor de
 *   patrimônio e patrocínio recebido são informação financeira interna),
 *   `atividades` (reuniões e sprints não dizem nada a quem está de fora),
 *   `atualizado_por` (id de pessoa) e o funil de retenção (quantos desistiram
 *   é dado sensível de gestão, não vitrine).
 *
 * Qualquer campo novo aqui é decisão de publicação. Acrescentar por hábito é
 * como um `select *` vaza o que ninguém decidiu mostrar.
 */
drop view if exists public.metricas_publicas;
create view public.metricas_publicas as
  select
    m.periodo,
    m.frente,
    m.resultados -> 'projetos_validacao_concluidos' as projetos_concluidos,
    m.resultados -> 'competicoes_disputadas'        as competicoes_disputadas,
    m.resultados -> 'publicacoes_aceitas'           as publicacoes_aceitas,
    m.resultados -> 'publicacoes_submetidas'        as publicacoes_submetidas,
    m.impacto    -> 'parcerias_apoio_real'          as parcerias,
    m.impacto    -> 'colocacoes_competicao'         as colocacoes,
    m.atualizado_em
  from public.metricas_periodo m
  where m.status = 'Em andamento';

comment on view public.metricas_publicas is
  'Recorte publicável das métricas do período aberto. Atravessa a RLS de propósito — ver 019.';

grant select on public.metricas_publicas to anon, authenticated;

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. RLS ligada e 3 policies (esperado: 1 linha t, depois 3 linhas)
--   select relrowsecurity from pg_class where relname = 'metricas_periodo';
--   select cmd, policyname from pg_policies
--    where tablename = 'metricas_periodo' order by cmd;
--
--   -- 2. a coluna de valor entrou no patrimônio (esperado: 1 linha)
--   select column_name, data_type from information_schema.columns
--    where table_name = 'patrimonio' and column_name = 'valor_estimado';
--
--   -- 3. a soma responde (esperado: um número, 0 se nada foi estimado)
--   select public.valor_patrimonio_atual();
--
--   -- 4. a view existe e anon a enxerga (esperado: 1 linha, t)
--   select has_table_privilege('anon', 'public.metricas_publicas', 'select');
--
--   -- 5. anon não TIRA NADA da tabela por baixo (esperado: 0)
--   --    Atenção: o Supabase concede select em public.* a anon por padrão, então
--   --    has_table_privilege devolve TRUE e não prova nada. Quem barra é a RLS,
--   --    devolvendo zero linhas — é isso que precisa ser verificado:
--   set local role anon;
--   select count(*) from public.metricas_periodo;
--   reset role;
--
-- REGISTRO INICIAL — crie o período geral para a tela ter o que mostrar.
-- Rodando no SQL Editor, auth.uid() é nulo e o trigger deixa passar:
--
--   insert into public.metricas_periodo (periodo, frente) values ('2026.2', null);
--   insert into public.metricas_periodo (periodo, frente) values ('2026.2', 'Competição');
--   insert into public.metricas_periodo (periodo, frente) values ('2026.2', 'Pesquisa');
--   insert into public.metricas_periodo (periodo, frente) values ('2026.2', 'Projetos');
-- =============================================================================
