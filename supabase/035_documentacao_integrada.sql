-- =============================================================================
-- GEAR — documentação da entidade dentro do site
-- Rodar no SQL Editor, DEPOIS de 034_horas_sobrevivem_ao_evento.sql. Pode
-- rodar mais de uma vez. Só cria e amplia; não apaga dado.
--
-- O pacote de documentos de 27/10/2026 (Regimento v2 e docs 01–35) descreve
-- processos que hoje vivem em Word, planilha e formulário de terceiros. Esta
-- migração dá a eles um lugar no banco:
--   1. categoria do membro (Regimento art. 11) e quem vota (art. 11 § 1º);
--   2. os cargos das áreas do Regimento (art. 20), somados aos que já existem;
--   3. `registros`: fichas, termos, relatórios e checklists dos documentos,
--      numerados por ano, com envio, aprovação por outra pessoa e versão
--      anônima para o canal de denúncia (doc. 24);
--   4. votações abertas (F/C/A) e secretas, com quórum (Regimento art. 16 e
--      38; doc. 28);
--   5. pesquisas anônimas, divulgadas só com 5+ respostas (doc. 33);
--   6. registros financeiros acessíveis a todos os membros (Regimento art. 49).
-- =============================================================================

-- 1. CATEGORIA E DIREITO A VOTO -------------------------------------------------
alter table public.perfis add column if not exists categoria text not null default 'em_formacao';
alter table public.perfis drop constraint if exists perfis_categoria_check;
alter table public.perfis add constraint perfis_categoria_check
  check (categoria in ('fundador', 'efetivo', 'em_formacao', 'colaborador', 'conselheiro'));

-- Só a diretoria muda categoria, nunca a própria pessoa: categoria dá voto.
create or replace function public.guardar_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and new.categoria is distinct from old.categoria
     and not public.e_diretoria() then
    raise exception 'Só a diretoria altera a categoria de um membro.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.guardar_categoria() from public, anon, authenticated;
drop trigger if exists guardar_categoria on public.perfis;
create trigger guardar_categoria before update on public.perfis
  for each row execute function public.guardar_categoria();

create or replace function public.tem_voto()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.aprovado and p.categoria in ('fundador', 'efetivo')
  );
$$;
revoke execute on function public.tem_voto() from public, anon;
grant execute on function public.tem_voto() to authenticated, service_role;

-- 2. CARGOS DAS ÁREAS -----------------------------------------------------------
alter table public.perfis drop constraint if exists perfis_cargo_check;
alter table public.perfis add constraint perfis_cargo_check
  check (cargo in ('Presidente', 'Vice-Presidente', 'Diretor de Competição', 'Diretor de Pesquisa',
                   'Diretor de Projetos', 'Tesouraria', 'Comunicação',
                   'Coordenação Técnica', 'Administração', 'Marketing', 'Documentação',
                   'Operações e Patrimônio'));

-- Operações e Patrimônio registra receitas e despesas (Regimento art. 49).
create or replace function public.e_financeiro()
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
      and p.cargo in ('Presidente', 'Vice-Presidente', 'Tesouraria', 'Operações e Patrimônio')
  );
$$;

-- 3. REGISTROS (FICHAS, TERMOS, RELATÓRIOS, CHECKLISTS) --------------------------
create table if not exists public.registros (
  id            uuid primary key default gen_random_uuid(),
  modelo        text not null check (modelo ~ '^[a-z0-9_]{2,40}$'),
  ano           integer not null default extract(year from now())::integer,
  numero        integer,
  titulo        text not null check (char_length(titulo) between 1 and 200),
  dados         jsonb not null default '{}'::jsonb check (pg_column_size(dados) <= 60000),
  status        text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'devolvido')),
  -- interno: todo membro; restrito: quem tem cargo e o autor; denuncia: só a diretoria
  visibilidade  text not null default 'interno' check (visibilidade in ('interno', 'restrito', 'denuncia')),
  anonimo       boolean not null default false,
  autor_id      uuid references public.perfis (id) on delete set null,
  decisao_por   uuid references public.perfis (id) on delete set null,
  decisao_em    timestamptz,
  decisao_nota  text check (decisao_nota is null or char_length(decisao_nota) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint registros_numero_unico unique (modelo, ano, numero)
);
create index if not exists registros_modelo_idx on public.registros (modelo, created_at desc);
create index if not exists registros_autor_idx on public.registros (autor_id);
alter table public.registros enable row level security;

create or replace function public.guardar_registro()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    -- denúncia é sempre restrita à diretoria; anônimo não guarda autor
    if new.modelo = 'denuncia' then
      new.visibilidade := 'denuncia';
    end if;
    new.autor_id := case when new.anonimo then null else coalesce(eu, new.autor_id) end;
    new.decisao_por := null;
    new.decisao_em := null;
    new.decisao_nota := null;
    if new.status not in ('rascunho', 'enviado') then
      new.status := 'enviado';
    end if;
    new.ano := extract(year from now())::integer;
    perform pg_advisory_xact_lock(hashtext('registros:' || new.modelo || ':' || new.ano));
    select coalesce(max(r.numero), 0) + 1 into new.numero
      from public.registros r where r.modelo = new.modelo and r.ano = new.ano;
    return new;
  end if;

  -- UPDATE: modelo, número, autoria e anonimato não mudam
  new.modelo := old.modelo;
  new.ano := old.ano;
  new.numero := old.numero;
  new.autor_id := old.autor_id;
  new.anonimo := old.anonimo;
  new.visibilidade := case when old.modelo = 'denuncia' then 'denuncia' else new.visibilidade end;
  new.updated_at := now();

  if eu is null then
    return new;
  end if;

  if new.status in ('aprovado', 'devolvido') and new.status is distinct from old.status then
    -- quem pede não aprova (doc. 20, separação de funções)
    if not public.tem_cargo() or eu = old.autor_id then
      raise exception 'Só outra pessoa com cargo aprova ou devolve este registro.' using errcode = '42501';
    end if;
    new.decisao_por := eu;
    new.decisao_em := now();
  else
    new.decisao_por := old.decisao_por;
    new.decisao_em := old.decisao_em;
    if new.status is distinct from old.status then
      new.decisao_nota := old.decisao_nota;
    end if;
  end if;

  -- registro aprovado só muda por quem tem cargo (para reabrir ou corrigir)
  if old.status = 'aprovado' and not public.tem_cargo() then
    raise exception 'Registro aprovado não pode ser alterado.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.guardar_registro() from public, anon, authenticated;
drop trigger if exists guardar_registro on public.registros;
create trigger guardar_registro before insert or update on public.registros
  for each row execute function public.guardar_registro();

drop policy if exists "registros: leitura" on public.registros;
create policy "registros: leitura" on public.registros for select to authenticated
  using (
    case visibilidade
      when 'interno' then public.e_membro()
      when 'restrito' then public.tem_cargo() or autor_id = (select auth.uid())
      else public.e_diretoria()
    end
  );
drop policy if exists "registros: membro cria" on public.registros;
create policy "registros: membro cria" on public.registros for insert to authenticated
  with check (public.e_membro());
drop policy if exists "registros: autor ou cargo edita" on public.registros;
create policy "registros: autor ou cargo edita" on public.registros for update to authenticated
  using ((autor_id = (select auth.uid()) and public.e_membro()) or (public.tem_cargo() and visibilidade <> 'denuncia') or public.e_diretoria())
  with check ((autor_id = (select auth.uid()) and public.e_membro()) or (public.tem_cargo() and visibilidade <> 'denuncia') or public.e_diretoria());
drop policy if exists "registros: autor apaga rascunho ou diretoria" on public.registros;
create policy "registros: autor apaga rascunho ou diretoria" on public.registros for delete to authenticated
  using ((autor_id = (select auth.uid()) and status = 'rascunho') or public.e_diretoria());

-- 4. VOTAÇÕES ---------------------------------------------------------------------
create table if not exists public.votacoes (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (char_length(titulo) between 1 and 200),
  descricao   text check (descricao is null or char_length(descricao) <= 4000),
  secreta     boolean not null default false,
  opcoes      text[] not null default array['Favorável', 'Contrário', 'Abstenção']
              check (cardinality(opcoes) between 2 and 20),
  -- simples: maioria simples dos presentes; dois_tercos: 2/3 dos membros com voto (Regimento art. 16 § 3º)
  regra       text not null default 'simples' check (regra in ('simples', 'dois_tercos')),
  abre_em     timestamptz not null default now(),
  fecha_em    timestamptz not null,
  criado_por  uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint votacoes_intervalo check (fecha_em > abre_em)
);
create table if not exists public.votacao_participacao (
  votacao_id  uuid not null references public.votacoes (id) on delete cascade,
  usuario_id  uuid not null references public.perfis (id) on delete cascade,
  votou_em    timestamptz not null default now(),
  primary key (votacao_id, usuario_id)
);
-- Em votação secreta o voto não guarda quem votou: só a participação guarda.
create table if not exists public.votos (
  id          uuid primary key default gen_random_uuid(),
  votacao_id  uuid not null references public.votacoes (id) on delete cascade,
  opcao       text not null,
  usuario_id  uuid references public.perfis (id) on delete set null
);
create index if not exists votos_votacao_idx on public.votos (votacao_id);
alter table public.votacoes enable row level security;
alter table public.votacao_participacao enable row level security;
alter table public.votos enable row level security;

drop policy if exists "votacoes: membro lê" on public.votacoes;
create policy "votacoes: membro lê" on public.votacoes for select to authenticated using (public.e_membro());
drop policy if exists "votacoes: cargo convoca" on public.votacoes;
create policy "votacoes: cargo convoca" on public.votacoes for insert to authenticated with check (public.tem_cargo());
drop policy if exists "votacoes: diretoria apaga" on public.votacoes;
create policy "votacoes: diretoria apaga" on public.votacoes for delete to authenticated using (public.e_diretoria());
drop policy if exists "participacao: membro lê" on public.votacao_participacao;
create policy "participacao: membro lê" on public.votacao_participacao for select to authenticated using (public.e_membro());
-- voto nominal (aberta) é público entre membros; o secreto só sai somado, pela função abaixo
drop policy if exists "votos: aberto e encerrado" on public.votos;
create policy "votos: aberto e encerrado" on public.votos for select to authenticated
  using (public.e_membro() and exists (
    select 1 from public.votacoes v where v.id = votacao_id and not v.secreta and v.fecha_em <= now()
  ));

create or replace function public.votar(p_votacao uuid, p_opcao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes;
  eu uuid := (select auth.uid());
begin
  select * into v from public.votacoes where id = p_votacao;
  if not found then raise exception 'Votação não encontrada.' using errcode = '23503'; end if;
  if not public.tem_voto() then
    raise exception 'Só fundadores e efetivos aprovados votam (Regimento art. 11).' using errcode = '42501';
  end if;
  if now() < v.abre_em or now() >= v.fecha_em then
    raise exception 'A votação não está aberta.' using errcode = 'GE005';
  end if;
  if not (p_opcao = any (v.opcoes)) then
    raise exception 'Opção inválida.' using errcode = '23514';
  end if;
  insert into public.votacao_participacao (votacao_id, usuario_id) values (p_votacao, eu);
  insert into public.votos (votacao_id, opcao, usuario_id)
  values (p_votacao, p_opcao, case when v.secreta then null else eu end);
exception when unique_violation then
  raise exception 'Você já votou nesta votação.' using errcode = 'GE006';
end;
$$;
revoke execute on function public.votar(uuid, text) from public, anon;
grant execute on function public.votar(uuid, text) to authenticated;

-- Totais só depois do encerramento: resultado parcial influencia quem ainda vai votar.
create or replace function public.resultado_votacao(p_votacao uuid)
returns table (opcao text, votos bigint, votantes bigint, aptos bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.opcao,
         (select count(*) from public.votos x where x.votacao_id = v.id and x.opcao = o.opcao),
         (select count(*) from public.votacao_participacao p where p.votacao_id = v.id),
         (select count(*) from public.perfis p where p.aprovado and p.categoria in ('fundador', 'efetivo'))
    from public.votacoes v, unnest(v.opcoes) as o(opcao)
   where v.id = p_votacao and v.fecha_em <= now() and public.e_membro();
$$;
revoke execute on function public.resultado_votacao(uuid) from public, anon;
grant execute on function public.resultado_votacao(uuid) to authenticated;

-- 5. PESQUISAS ANÔNIMAS -------------------------------------------------------------
create table if not exists public.pesquisas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (char_length(titulo) between 1 and 200),
  modelo      text not null check (modelo ~ '^[a-z0-9_]{2,40}$'),
  abre_em     timestamptz not null default now(),
  fecha_em    timestamptz not null,
  minimo      integer not null default 5 check (minimo >= 5),
  criado_por  uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint pesquisas_intervalo check (fecha_em > abre_em)
);
create table if not exists public.pesquisa_participacao (
  pesquisa_id uuid not null references public.pesquisas (id) on delete cascade,
  usuario_id  uuid not null references public.perfis (id) on delete cascade,
  primary key (pesquisa_id, usuario_id)
);
create table if not exists public.pesquisa_respostas (
  id          uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas (id) on delete cascade,
  respostas   jsonb not null check (pg_column_size(respostas) <= 20000)
);
alter table public.pesquisas enable row level security;
alter table public.pesquisa_participacao enable row level security;
alter table public.pesquisa_respostas enable row level security;

drop policy if exists "pesquisas: membro lê" on public.pesquisas;
create policy "pesquisas: membro lê" on public.pesquisas for select to authenticated using (public.e_membro());
drop policy if exists "pesquisas: cargo cria" on public.pesquisas;
create policy "pesquisas: cargo cria" on public.pesquisas for insert to authenticated with check (public.tem_cargo());
drop policy if exists "pesquisas: diretoria apaga" on public.pesquisas;
create policy "pesquisas: diretoria apaga" on public.pesquisas for delete to authenticated using (public.e_diretoria());
drop policy if exists "pesquisa_participacao: própria" on public.pesquisa_participacao;
create policy "pesquisa_participacao: própria" on public.pesquisa_participacao for select to authenticated
  using (usuario_id = (select auth.uid()));
-- pesquisa_respostas sem policy: só as funções leem e escrevem

create or replace function public.responder_pesquisa(p_pesquisa uuid, p_respostas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pesquisas;
begin
  select * into p from public.pesquisas where id = p_pesquisa;
  if not found then raise exception 'Pesquisa não encontrada.' using errcode = '23503'; end if;
  if not public.e_membro() then raise exception 'Só membros respondem.' using errcode = '42501'; end if;
  if now() < p.abre_em or now() >= p.fecha_em then
    raise exception 'A pesquisa não está aberta.' using errcode = 'GE005';
  end if;
  insert into public.pesquisa_participacao (pesquisa_id, usuario_id) values (p_pesquisa, (select auth.uid()));
  insert into public.pesquisa_respostas (pesquisa_id, respostas) values (p_pesquisa, p_respostas);
exception when unique_violation then
  raise exception 'Você já respondeu esta pesquisa.' using errcode = 'GE006';
end;
$$;
revoke execute on function public.responder_pesquisa(uuid, jsonb) from public, anon;
grant execute on function public.responder_pesquisa(uuid, jsonb) to authenticated;

-- Respostas só saem com o mínimo atingido e para quem tem cargo; em ordem
-- aleatória, para a ordem de chegada não denunciar ninguém.
create or replace function public.respostas_pesquisa(p_pesquisa uuid)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select r.respostas
    from public.pesquisa_respostas r
    join public.pesquisas p on p.id = r.pesquisa_id
   where r.pesquisa_id = p_pesquisa
     and public.tem_cargo()
     and (select count(*) from public.pesquisa_respostas x where x.pesquisa_id = p_pesquisa) >= p.minimo
   order by random();
$$;
revoke execute on function public.respostas_pesquisa(uuid) from public, anon;
grant execute on function public.respostas_pesquisa(uuid) to authenticated;

create or replace function public.contagem_pesquisa(p_pesquisa uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.pesquisa_participacao where pesquisa_id = p_pesquisa and public.e_membro();
$$;
revoke execute on function public.contagem_pesquisa(uuid) from public, anon;
grant execute on function public.contagem_pesquisa(uuid) to authenticated;

-- 6. CONTAS ABERTAS AOS MEMBROS (Regimento art. 49, parágrafo único) ------------------
drop policy if exists "caixa: cargo lê" on public.caixa_lancamentos;
drop policy if exists "caixa: membro lê" on public.caixa_lancamentos;
create policy "caixa: membro lê" on public.caixa_lancamentos for select to authenticated using (public.e_membro());
