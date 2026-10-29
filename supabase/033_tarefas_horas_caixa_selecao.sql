-- =============================================================================
-- GEAR — tarefas de sprint, histórico de empréstimo, horas de extensão,
-- caixa e compras, processo seletivo, perfil público e novidades
-- Rodar no SQL Editor, DEPOIS de 032_emprestimos_e_contato.sql. Pode rodar
-- mais de uma vez. Só cria; não apaga nem altera dado existente.
-- =============================================================================

-- 0. QUEM MEXE NO DINHEIRO -----------------------------------------------------
-- Diretoria e Tesouraria. Mesmo molde de e_diretoria() (014): exige aprovação.
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
      and p.cargo in ('Presidente', 'Vice-Presidente', 'Tesouraria')
  );
$$;
revoke execute on function public.e_financeiro() from public, anon;
grant execute on function public.e_financeiro() to authenticated, service_role;

-- Autoria carimbada pelo banco: a coluna nomeada em TG_ARGV[0] recebe auth.uid()
-- em todo INSERT/UPDATE vindo de sessão. Um default só valeria se o cliente
-- não mandasse a coluna; isto vale sempre (mesma ideia da 016).
create or replace function public.carimbar_autor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new := jsonb_populate_record(new, jsonb_build_object(tg_argv[0], (select auth.uid())));
  end if;
  return new;
end;
$$;
revoke execute on function public.carimbar_autor() from public, anon, authenticated;

-- 1. TAREFAS DO SPRINT ---------------------------------------------------------
create table if not exists public.sprint_tarefas (
  id             uuid primary key default gen_random_uuid(),
  sprint_id      uuid not null references public.sprints (id) on delete cascade,
  titulo         text not null check (char_length(titulo) between 1 and 200),
  responsavel_id uuid references public.perfis (id) on delete set null,
  prazo          date,
  feita          boolean not null default false,
  criado_por     uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists sprint_tarefas_sprint_idx on public.sprint_tarefas (sprint_id);
create index if not exists sprint_tarefas_responsavel_idx on public.sprint_tarefas (responsavel_id) where not feita;
alter table public.sprint_tarefas enable row level security;

drop policy if exists "sprint_tarefas: membro lê" on public.sprint_tarefas;
create policy "sprint_tarefas: membro lê" on public.sprint_tarefas
  for select to authenticated using (public.e_membro());

-- Quem escreve no sprint (021) cria, edita e apaga tarefa.
drop policy if exists "sprint_tarefas: quem edita o sprint cria" on public.sprint_tarefas;
create policy "sprint_tarefas: quem edita o sprint cria" on public.sprint_tarefas
  for insert to authenticated with check (public.pode_editar_sprint(sprint_id));
drop policy if exists "sprint_tarefas: quem edita o sprint apaga" on public.sprint_tarefas;
create policy "sprint_tarefas: quem edita o sprint apaga" on public.sprint_tarefas
  for delete to authenticated using (public.pode_editar_sprint(sprint_id));

-- O responsável, mesmo sem cargo, marca a própria tarefa como feita.
-- A policy libera a linha inteira para o responsável; o gatilho abaixo
-- recusa qualquer mudança além de `feita` para quem não edita o sprint.
drop policy if exists "sprint_tarefas: editar" on public.sprint_tarefas;
create policy "sprint_tarefas: editar" on public.sprint_tarefas
  for update to authenticated
  using (public.pode_editar_sprint(sprint_id) or responsavel_id = (select auth.uid()))
  with check (public.pode_editar_sprint(sprint_id) or responsavel_id = (select auth.uid()));

create or replace function public.guardar_tarefa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- compara a linha inteira menos `feita`: coluna nova nasce protegida
  if (select auth.uid()) is not null
     and not public.pode_editar_sprint(old.sprint_id)
     and (to_jsonb(new) - 'feita') is distinct from (to_jsonb(old) - 'feita') then
    raise exception 'Você só pode marcar a tarefa como feita.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.guardar_tarefa() from public, anon, authenticated;
drop trigger if exists guardar_tarefa on public.sprint_tarefas;
create trigger guardar_tarefa before update on public.sprint_tarefas
  for each row execute function public.guardar_tarefa();

drop trigger if exists carimbar_autor on public.sprint_tarefas;
create trigger carimbar_autor before insert on public.sprint_tarefas
  for each row execute function public.carimbar_autor('criado_por');

-- 2. HISTÓRICO DE EMPRÉSTIMOS --------------------------------------------------
create table if not exists public.emprestimos (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.patrimonio (id) on delete cascade,
  usuario_id   uuid references public.perfis (id) on delete set null,
  retirado_em  timestamptz not null default now(),
  prazo        date,
  devolvido_em timestamptz
);
create index if not exists emprestimos_item_idx on public.emprestimos (item_id, retirado_em desc);
create index if not exists emprestimos_abertos_idx on public.emprestimos (usuario_id) where devolvido_em is null;
alter table public.emprestimos enable row level security;

-- Sem policy de escrita: só as funções abaixo gravam.
drop policy if exists "emprestimos: membro lê" on public.emprestimos;
create policy "emprestimos: membro lê" on public.emprestimos
  for select to authenticated using (public.e_membro());

-- Troca a assinatura da 032 (ganha o prazo), então a antiga sai.
drop function if exists public.retirar_item(uuid);
create or replace function public.retirar_item(p_id uuid, p_prazo date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.e_membro() then
    raise exception 'Só membro aprovado retira item.' using errcode = '42501';
  end if;
  if p_prazo is not null and p_prazo < current_date then
    raise exception 'O prazo de devolução já passou.' using errcode = '23514';
  end if;

  update public.patrimonio p
     set status = 'Emprestado',
         emprestado_para = (select auth.uid()),
         responsavel_atual = (select nome_completo from public.perfis where id = (select auth.uid()))
   where p.id = p_id and p.status = 'Disponível';

  if not found then
    raise exception 'Este item não está disponível para retirada.' using errcode = 'GE004';
  end if;

  insert into public.emprestimos (item_id, usuario_id, prazo)
  values (p_id, (select auth.uid()), p_prazo);
end;
$$;

create or replace function public.devolver_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.patrimonio p
     set status = 'Disponível',
         responsavel_atual = null
   where p.id = p_id
     and p.status = 'Emprestado'
     and public.e_membro()
     and (p.emprestado_para = (select auth.uid()) or public.tem_cargo());

  if not found then
    raise exception 'Este item não está emprestado para você.' using errcode = 'GE004';
  end if;

  update public.emprestimos set devolvido_em = now()
   where item_id = p_id and devolvido_em is null;
end;
$$;

revoke execute on function public.retirar_item(uuid, date) from public, anon;
revoke execute on function public.devolver_item(uuid) from public, anon;
grant execute on function public.retirar_item(uuid, date) to authenticated;
grant execute on function public.devolver_item(uuid) to authenticated;

-- 3. HORAS DE EXTENSÃO ---------------------------------------------------------
-- Chamada: quem compareceu a uma ocorrência de evento. `horas` vem preenchida
-- pela duração do evento e quem registra ajusta.
create table if not exists public.eventos_chamada (
  evento_id      uuid not null references public.eventos (id) on delete cascade,
  dia            date not null,
  usuario_id     uuid not null references public.perfis (id) on delete cascade,
  horas          numeric(5,2) not null check (horas > 0 and horas <= 24),
  registrado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at     timestamptz not null default now(),
  primary key (evento_id, dia, usuario_id)
);
create index if not exists eventos_chamada_usuario_idx on public.eventos_chamada (usuario_id);
alter table public.eventos_chamada enable row level security;

-- Horas fora de evento (viagem de competição, oficina externa).
create table if not exists public.horas_lancadas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfis (id) on delete cascade,
  data        date not null,
  horas       numeric(5,2) not null check (horas > 0 and horas <= 200),
  descricao   text not null check (char_length(descricao) between 1 and 300),
  lancado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists horas_lancadas_usuario_idx on public.horas_lancadas (usuario_id);
alter table public.horas_lancadas enable row level security;

drop policy if exists "eventos_chamada: dono ou cargo lê" on public.eventos_chamada;
create policy "eventos_chamada: dono ou cargo lê" on public.eventos_chamada
  for select to authenticated using (usuario_id = (select auth.uid()) or public.tem_cargo());
-- Ninguém registra nem corrige as próprias horas: quem tem cargo também é
-- membro, e a declaração sai do que está aqui. A chamada de quem fez a
-- chamada fica para outra pessoa com cargo.
drop policy if exists "eventos_chamada: cargo registra" on public.eventos_chamada;
create policy "eventos_chamada: cargo registra" on public.eventos_chamada
  for insert to authenticated with check (public.tem_cargo() and usuario_id <> (select auth.uid()));
drop policy if exists "eventos_chamada: cargo corrige" on public.eventos_chamada;
create policy "eventos_chamada: cargo corrige" on public.eventos_chamada
  for update to authenticated
  using (public.tem_cargo() and usuario_id <> (select auth.uid()))
  with check (public.tem_cargo() and usuario_id <> (select auth.uid()));
drop policy if exists "eventos_chamada: cargo apaga" on public.eventos_chamada;
create policy "eventos_chamada: cargo apaga" on public.eventos_chamada
  for delete to authenticated using (public.tem_cargo());

drop trigger if exists carimbar_autor on public.eventos_chamada;
create trigger carimbar_autor before insert or update on public.eventos_chamada
  for each row execute function public.carimbar_autor('registrado_por');

drop policy if exists "horas_lancadas: dono ou cargo lê" on public.horas_lancadas;
create policy "horas_lancadas: dono ou cargo lê" on public.horas_lancadas
  for select to authenticated using (usuario_id = (select auth.uid()) or public.tem_cargo());
drop policy if exists "horas_lancadas: cargo lança" on public.horas_lancadas;
create policy "horas_lancadas: cargo lança" on public.horas_lancadas
  for insert to authenticated with check (public.tem_cargo() and usuario_id <> (select auth.uid()));
drop policy if exists "horas_lancadas: cargo apaga" on public.horas_lancadas;
create policy "horas_lancadas: cargo apaga" on public.horas_lancadas
  for delete to authenticated using (public.tem_cargo());

drop trigger if exists carimbar_autor on public.horas_lancadas;
create trigger carimbar_autor before insert on public.horas_lancadas
  for each row execute function public.carimbar_autor('lancado_por');

-- 4. PERFIL: BIO E NOVIDADES -------------------------------------------------
alter table public.perfis add column if not exists bio text;
alter table public.perfis add column if not exists novidades_vistas_em timestamptz;

alter table public.perfis drop constraint if exists perfis_bio_tamanho;
alter table public.perfis add constraint perfis_bio_tamanho check (bio is null or char_length(bio) <= 500);

-- guardar_contato (032) passa a proteger também a bio e o marcador de novidades.
create or replace function public.guardar_contato()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (select auth.uid()) is distinct from old.id
     and (new.whatsapp, new.github, new.linkedin, new.bio, new.novidades_vistas_em)
         is distinct from (old.whatsapp, old.github, old.linkedin, old.bio, old.novidades_vistas_em) then
    raise exception 'Estes campos só o próprio dono altera.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 5. PROCESSO SELETIVO ---------------------------------------------------------
-- Candidato é a conta que aguarda aprovação (014). Aqui fica a etapa e as notas
-- da banca, que o candidato NÃO lê. Aprovar continua sendo o botão da 014.
create table if not exists public.selecao (
  perfil_id     uuid primary key references public.perfis (id) on delete cascade,
  etapa         text not null default 'Inscrito'
                check (etapa in ('Inscrito', 'Entrevista', 'Desafio', 'Aprovado', 'Recusado')),
  notas         text check (notas is null or char_length(notas) <= 4000),
  atualizado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  atualizado_em timestamptz not null default now()
);
alter table public.selecao enable row level security;

drop policy if exists "selecao: cargo lê" on public.selecao;
create policy "selecao: cargo lê" on public.selecao for select to authenticated using (public.tem_cargo());
drop policy if exists "selecao: cargo cria" on public.selecao;
create policy "selecao: cargo cria" on public.selecao for insert to authenticated with check (public.tem_cargo());
drop policy if exists "selecao: cargo edita" on public.selecao;
create policy "selecao: cargo edita" on public.selecao for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

drop trigger if exists carimbar_autor on public.selecao;
create trigger carimbar_autor before insert or update on public.selecao
  for each row execute function public.carimbar_autor('atualizado_por');

-- Motivação do candidato: fora de `perfis`, que todo membro aprovado lê (009).
-- O candidato escreve e lê a própria; quem tem cargo lê todas.
create table if not exists public.candidaturas (
  perfil_id     uuid primary key default auth.uid() references public.perfis (id) on delete cascade,
  motivacao     text not null check (char_length(motivacao) between 1 and 2000),
  atualizado_em timestamptz not null default now()
);
alter table public.candidaturas enable row level security;

drop policy if exists "candidaturas: dono ou cargo lê" on public.candidaturas;
create policy "candidaturas: dono ou cargo lê" on public.candidaturas for select to authenticated
  using (perfil_id = (select auth.uid()) or public.tem_cargo());
drop policy if exists "candidaturas: dono escreve" on public.candidaturas;
create policy "candidaturas: dono escreve" on public.candidaturas for insert to authenticated
  with check (perfil_id = (select auth.uid()));
drop policy if exists "candidaturas: dono corrige" on public.candidaturas;
create policy "candidaturas: dono corrige" on public.candidaturas for update to authenticated
  using (perfil_id = (select auth.uid())) with check (perfil_id = (select auth.uid()));

-- 6. CAIXA ---------------------------------------------------------------------
create table if not exists public.caixa_lancamentos (
  id              uuid primary key default gen_random_uuid(),
  data            date not null default current_date,
  tipo            text not null check (tipo in ('Entrada', 'Saída')),
  valor           numeric(12,2) not null check (valor > 0),
  descricao       text not null check (char_length(descricao) between 1 and 300),
  categoria       text check (categoria is null or char_length(categoria) <= 60),
  comprovante_url text check (comprovante_url is null or (comprovante_url ~* '^https?://' and char_length(comprovante_url) <= 2000)),
  registrado_por  uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists caixa_lancamentos_data_idx on public.caixa_lancamentos (data desc);
alter table public.caixa_lancamentos enable row level security;

drop policy if exists "caixa: cargo lê" on public.caixa_lancamentos;
create policy "caixa: cargo lê" on public.caixa_lancamentos for select to authenticated using (public.tem_cargo());
drop policy if exists "caixa: financeiro lança" on public.caixa_lancamentos;
create policy "caixa: financeiro lança" on public.caixa_lancamentos for insert to authenticated with check (public.e_financeiro());
drop policy if exists "caixa: financeiro corrige" on public.caixa_lancamentos;
create policy "caixa: financeiro corrige" on public.caixa_lancamentos for update to authenticated
  using (public.e_financeiro()) with check (public.e_financeiro());
drop policy if exists "caixa: diretoria apaga" on public.caixa_lancamentos;
create policy "caixa: diretoria apaga" on public.caixa_lancamentos for delete to authenticated using (public.e_diretoria());

drop trigger if exists carimbar_autor on public.caixa_lancamentos;
create trigger carimbar_autor before insert on public.caixa_lancamentos
  for each row execute function public.carimbar_autor('registrado_por');

-- 7. PEDIDOS DE COMPRA ---------------------------------------------------------
create table if not exists public.pedidos_compra (
  id             uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  item           text not null check (char_length(item) between 1 and 200),
  justificativa  text not null check (char_length(justificativa) between 1 and 2000),
  link           text check (link is null or (link ~* '^https?://' and char_length(link) <= 2000)),
  valor_estimado numeric(12,2) check (valor_estimado is null or valor_estimado >= 0),
  frente         text check (frente is null or frente in ('Competição', 'Pesquisa', 'Projetos')),
  status         text not null default 'Pendente' check (status in ('Pendente', 'Aprovado', 'Recusado', 'Comprado')),
  resposta       text check (resposta is null or char_length(resposta) <= 1000),
  decidido_por   uuid references public.perfis (id) on delete set null,
  decidido_em    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists pedidos_compra_status_idx on public.pedidos_compra (status, created_at desc);
alter table public.pedidos_compra enable row level security;

drop policy if exists "pedidos: dono ou cargo lê" on public.pedidos_compra;
create policy "pedidos: dono ou cargo lê" on public.pedidos_compra for select to authenticated
  using (solicitante_id = (select auth.uid()) or public.tem_cargo());
drop policy if exists "pedidos: membro pede" on public.pedidos_compra;
create policy "pedidos: membro pede" on public.pedidos_compra for insert to authenticated
  with check (
    public.e_membro() and solicitante_id = (select auth.uid()) and status = 'Pendente'
    and decidido_por is null and decidido_em is null and resposta is null
  );
drop policy if exists "pedidos: financeiro decide" on public.pedidos_compra;
create policy "pedidos: financeiro decide" on public.pedidos_compra for update to authenticated
  using (public.e_financeiro()) with check (public.e_financeiro());
drop policy if exists "pedidos: dono desiste ou diretoria apaga" on public.pedidos_compra;
create policy "pedidos: dono desiste ou diretoria apaga" on public.pedidos_compra for delete to authenticated
  using ((solicitante_id = (select auth.uid()) and status = 'Pendente') or public.e_diretoria());

-- Quem decide é carimbado pelo banco, não pelo cliente.
create or replace function public.carimbar_decisao_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.decidido_por := (select auth.uid());
    new.decidido_em  := now();
  else
    new.decidido_por := old.decidido_por;
    new.decidido_em  := old.decidido_em;
  end if;
  new.solicitante_id := old.solicitante_id;
  return new;
end;
$$;
revoke execute on function public.carimbar_decisao_pedido() from public, anon, authenticated;
drop trigger if exists carimbar_decisao_pedido on public.pedidos_compra;
create trigger carimbar_decisao_pedido before update on public.pedidos_compra
  for each row execute function public.carimbar_decisao_pedido();
