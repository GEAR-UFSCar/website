-- =============================================================================
-- GEAR — organização interna, fase 3
-- Rodar no SQL Editor, DEPOIS de 043_organizacao_fase2.sql. Pode rodar mais de
-- uma vez. Não apaga dado.
--
--   1. Ciclos de 2 semanas com meta de pontos (só Academia). ciclo_atual().
--   2. Tarefa: tipo (principal/reserva, uma de cada por pessoa), bloqueio com
--      motivo e data, roteiro de primeiros passos, nível, área, ciclo.
--      assumir_tarefa() em um clique e sem aprovação: vira responsável, entra
--      no ciclo atual, fica Em andamento; se já tem dono, recusa e diz quem é.
--   3. Gastos: pedidos_compra vira o registro de gastos. Até o limite (padrão
--      R$ 50, em `parametros`) nasce "Registrado"; acima, "Aguardando
--      aprovação" até o financeiro decidir. Comprovante por link ou arquivo
--      (bucket privado `comprovantes`). Todo membro lê (prestação de contas).
--   4. Alertas calculados: view `alertas` (tarefa atrasada, bloqueada há mais
--      de 2 dias, fila > 48 h, membro sem principal ou reserva, material
--      atrasado, gasto aguardando aprovação).
--   5. Base de conhecimento: os cinco artigos-modelo.
--
-- Códigos novos: GE018 tarefa já tem dono, GE019 já tem principal/reserva,
-- GE020 bloqueio sem motivo, GE021 gasto sem valor, GE022 gasto sem comprovante.
-- =============================================================================

-- 1. CICLOS --------------------------------------------------------------------
create table if not exists public.ciclos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(nome) between 1 and 80),
  inicio      date not null,
  fim         date not null,
  meta_pontos integer not null default 0 check (meta_pontos between 0 and 1000),
  created_at  timestamptz not null default now(),
  constraint ciclos_intervalo check (fim > inicio)
);
alter table public.ciclos enable row level security;
drop policy if exists "ciclos: membro lê" on public.ciclos;
create policy "ciclos: membro lê" on public.ciclos for select to authenticated using (public.e_membro());
drop policy if exists "ciclos: cargo gerencia" on public.ciclos;
create policy "ciclos: cargo gerencia" on public.ciclos for all to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

-- Dois ciclos sobrepostos: vale o que começou por último.
create or replace function public.ciclo_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.ciclos where current_date between inicio and fim order by inicio desc limit 1;
$$;
revoke execute on function public.ciclo_atual() from public, anon;
grant  execute on function public.ciclo_atual() to authenticated, service_role;

-- 2. TAREFA: PRINCIPAL, RESERVA, BLOQUEIO, PAUTA -------------------------------
alter table public.sprint_tarefas
  add column if not exists tipo text check (tipo is null or tipo in ('principal', 'reserva')),
  add column if not exists bloqueada boolean not null default false,
  add column if not exists motivo_bloqueio text check (motivo_bloqueio is null or char_length(motivo_bloqueio) <= 500),
  add column if not exists bloqueada_em timestamptz,
  add column if not exists roteiro text check (roteiro is null or char_length(roteiro) <= 4000),
  add column if not exists nivel text check (nivel is null or nivel in ('Fundamental', 'Principal', 'Avançada')),
  add column if not exists area text check (area is null or char_length(area) <= 60),
  add column if not exists ciclo_id uuid references public.ciclos (id) on delete set null;

-- Uma principal e uma reserva por pessoa, entre as que não estão concluídas.
create unique index if not exists sprint_tarefas_um_tipo_por_pessoa
  on public.sprint_tarefas (responsavel_id, tipo)
  where tipo is not null and responsavel_id is not null and estado <> 'Concluída';

-- guardar_tarefa (042) com tipo e bloqueio entre as colunas de fluxo; trocar de
-- dono limpa os dois, porque eram da pessoa anterior.
create or replace function public.guardar_tarefa()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  fluxo constant text[] := array['estado', 'evidencia_url', 'revisor_id', 'rodadas_ajustes',
                                 'comentario_revisao', 'enviada_revisao_em', 'concluida_em',
                                 'tipo', 'bloqueada', 'motivo_bloqueio', 'bloqueada_em'];
  -- `feita` fica de fora: é gerada e vale NULL em gatilho BEFORE.
  c text;
begin
  if (select auth.uid()) is null or current_setting('gear.fluxo_tarefa', true) = 'on' then
    return new;
  end if;

  foreach c in array fluxo loop
    if to_jsonb(new) -> c is distinct from to_jsonb(old) -> c then
      raise exception 'O estado da tarefa muda pelos botões (assumir, bloquear, enviar para revisão, revisar).' using errcode = 'GE013';
    end if;
  end loop;

  if (new.criado_por, new.created_at) is distinct from (old.criado_por, old.created_at) then
    raise exception 'Autoria da tarefa não muda.' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(new.pronto_quando, '')), '') is null and old.pronto_quando is not null then
    raise exception '"Pronto quando…" não pode ficar vazio.' using errcode = 'GE010';
  end if;

  if new.responsavel_id is distinct from old.responsavel_id then
    if old.estado in ('Em revisão', 'Concluída') then
      raise exception 'Tarefa em revisão ou concluída não troca de responsável.' using errcode = 'GE013';
    end if;
    new.estado := case when new.responsavel_id is null then 'Aberta' else 'Em andamento' end;
    new.tipo := null;
    new.bloqueada := false;
    new.motivo_bloqueio := null;
    new.bloqueada_em := null;
  end if;

  return new;
end;
$$;
revoke execute on function public.guardar_tarefa() from public, anon, authenticated;

-- Assumir: um clique, sem aprovação. Recusa (e diz quem é) se já tem dono.
create or replace function public.assumir_tarefa(tarefa uuid, tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  eu uuid := (select auth.uid());
  dono text;
  outra text;
begin
  if not public.e_membro() then
    raise exception 'Só membro aprovado assume tarefa.' using errcode = '42501';
  end if;
  if tipo is null or tipo not in ('principal', 'reserva') then
    raise exception 'Diga se é a tarefa principal ou a de reserva.' using errcode = '22023';
  end if;
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not found then
    raise exception 'Tarefa não encontrada.' using errcode = 'GE013';
  end if;
  if t.responsavel_id is not null then
    select nome_completo into dono from public.perfis where id = t.responsavel_id;
    raise exception 'Esta tarefa já é de %.', coalesce(dono, 'outra pessoa') using errcode = 'GE018';
  end if;
  if t.estado <> 'Aberta' then
    raise exception 'Esta tarefa não está aberta.' using errcode = 'GE013';
  end if;
  select s.titulo into outra from public.sprint_tarefas s
   where s.responsavel_id = eu and s.tipo = assumir_tarefa.tipo and s.estado <> 'Concluída' limit 1;
  if outra is not null then
    raise exception 'Você já tem uma tarefa %: "%".', assumir_tarefa.tipo, outra using errcode = 'GE019';
  end if;

  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas
     set responsavel_id = eu, tipo = assumir_tarefa.tipo, estado = 'Em andamento',
         ciclo_id = coalesce(public.ciclo_atual(), ciclo_id),
         bloqueada = false, motivo_bloqueio = null, bloqueada_em = null
   where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.assumir_tarefa(uuid, text) from public, anon;
grant  execute on function public.assumir_tarefa(uuid, text) to authenticated, service_role;

-- O responsável marca a própria tarefa como principal, reserva ou nenhuma das duas.
create or replace function public.definir_tipo_tarefa(tarefa uuid, tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  eu uuid := (select auth.uid());
  outra uuid;
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not found or not public.e_membro() or t.responsavel_id is distinct from eu then
    raise exception 'Só o responsável define se a tarefa é principal ou reserva.' using errcode = '42501';
  end if;
  if tipo is not null and tipo not in ('principal', 'reserva') then
    raise exception 'Tipo inválido.' using errcode = '22023';
  end if;
  if t.estado = 'Concluída' then
    raise exception 'Tarefa concluída não muda de tipo.' using errcode = 'GE013';
  end if;

  perform set_config('gear.fluxo_tarefa', 'on', true);
  -- se já existe outra com esse tipo, as duas trocam de lugar
  select s.id into outra from public.sprint_tarefas s
   where s.responsavel_id = eu and s.tipo = definir_tipo_tarefa.tipo and s.estado <> 'Concluída' and s.id <> tarefa;
  if outra is not null then
    update public.sprint_tarefas set tipo = null where id = outra;
    update public.sprint_tarefas set tipo = definir_tipo_tarefa.tipo where id = tarefa;
    update public.sprint_tarefas set tipo = t.tipo where id = outra;
  else
    update public.sprint_tarefas set tipo = definir_tipo_tarefa.tipo where id = tarefa;
  end if;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.definir_tipo_tarefa(uuid, text) from public, anon;
grant  execute on function public.definir_tipo_tarefa(uuid, text) to authenticated, service_role;

create or replace function public.marcar_bloqueio(tarefa uuid, motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  porque text := nullif(btrim(coalesce(motivo, '')), '');
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not found or not public.e_membro() or t.responsavel_id is distinct from (select auth.uid()) then
    raise exception 'Só o responsável marca bloqueio.' using errcode = '42501';
  end if;
  if porque is null then
    raise exception 'Diga o que está bloqueando.' using errcode = 'GE020';
  end if;
  if t.estado not in ('Em andamento', 'Ajustes') then
    raise exception 'Só tarefa em andamento fica bloqueada.' using errcode = 'GE013';
  end if;
  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas
     set bloqueada = true, motivo_bloqueio = left(porque, 500),
         bloqueada_em = case when t.bloqueada then t.bloqueada_em else now() end
   where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.marcar_bloqueio(uuid, text) from public, anon;
grant  execute on function public.marcar_bloqueio(uuid, text) to authenticated, service_role;

create or replace function public.tirar_bloqueio(tarefa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not found or not public.e_membro()
     or (t.responsavel_id is distinct from (select auth.uid()) and not public.pode_editar_sprint(t.sprint_id)) then
    raise exception 'Só o responsável (ou quem edita o projeto) tira o bloqueio.' using errcode = '42501';
  end if;
  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas set bloqueada = false, motivo_bloqueio = null, bloqueada_em = null where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.tirar_bloqueio(uuid) from public, anon;
grant  execute on function public.tirar_bloqueio(uuid) to authenticated, service_role;

-- preparar_tarefa (042) também zera tipo e bloqueio: tarefa nova não nasce
-- principal, reserva ou bloqueada; isso é pelos botões (assumir, bloquear).
create or replace function public.preparar_tarefa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(new.pronto_quando, '')), '') is null then
    raise exception 'Toda tarefa nasce dizendo quando fica pronta ("Pronto quando…").' using errcode = 'GE010';
  end if;
  new.pronto_quando := btrim(new.pronto_quando);
  if (select auth.uid()) is not null or new.estado = 'Aberta' then
    new.estado := case when new.responsavel_id is null then 'Aberta' else 'Em andamento' end;
  end if;
  if (select auth.uid()) is not null then
    new.evidencia_url      := null;
    new.revisor_id         := null;
    new.rodadas_ajustes    := 0;
    new.comentario_revisao := null;
    new.enviada_revisao_em := null;
    new.concluida_em       := null;
    new.tipo               := null;
    new.bloqueada          := false;
    new.motivo_bloqueio    := null;
    new.bloqueada_em       := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.preparar_tarefa() from public, anon, authenticated;

-- Enviar para revisão (042) também desfaz o bloqueio: se andou até o fim, não está parada.
create or replace function public.enviar_tarefa_para_revisao(tarefa uuid, evidencia text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  link text := btrim(coalesce(evidencia, ''));
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not found or not public.e_membro() or t.responsavel_id is distinct from (select auth.uid()) then
    raise exception 'Só o responsável envia a tarefa para revisão.' using errcode = '42501';
  end if;
  if t.estado not in ('Em andamento', 'Ajustes') then
    raise exception 'A tarefa está em "%" e não pode ir para revisão agora.', t.estado using errcode = 'GE013';
  end if;
  if link !~* '^https?://\S+$' or char_length(link) > 2000 then
    raise exception 'Evidência é obrigatória: um link de repositório, vídeo ou relatório.' using errcode = 'GE011';
  end if;

  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas
     set estado = 'Em revisão', evidencia_url = link, enviada_revisao_em = now(), revisor_id = null,
         bloqueada = false, motivo_bloqueio = null, bloqueada_em = null
   where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.enviar_tarefa_para_revisao(uuid, text) from public, anon;
grant  execute on function public.enviar_tarefa_para_revisao(uuid, text) to authenticated, service_role;

-- 3. GASTOS --------------------------------------------------------------------
create table if not exists public.parametros (
  id           boolean primary key default true check (id),
  limite_gasto numeric(12,2) not null default 50 check (limite_gasto >= 0),
  updated_at   timestamptz not null default now()
);
insert into public.parametros (id) values (true) on conflict (id) do nothing;
alter table public.parametros enable row level security;
drop policy if exists "parametros: membro lê" on public.parametros;
create policy "parametros: membro lê" on public.parametros for select to authenticated using (public.e_membro());
drop policy if exists "parametros: diretoria muda" on public.parametros;
create policy "parametros: diretoria muda" on public.parametros for update to authenticated
  using (public.e_diretoria()) with check (public.e_diretoria());

alter table public.pedidos_compra
  add column if not exists data_gasto date not null default current_date,
  add column if not exists comprovante_url text
    check (comprovante_url is null or (comprovante_url ~* '^https?://' and char_length(comprovante_url) <= 2000)),
  add column if not exists comprovante_arquivo text check (comprovante_arquivo is null or char_length(comprovante_arquivo) <= 300);
alter table public.pedidos_compra alter column justificativa drop not null;
alter table public.pedidos_compra drop constraint if exists pedidos_compra_justificativa_check;
alter table public.pedidos_compra add constraint pedidos_compra_justificativa_check
  check (justificativa is null or char_length(justificativa) <= 2000);

-- Estados do enunciado. "Pendente" vira "Aguardando aprovação"; "Comprado" fica
-- aceito para os pedidos antigos.
alter table public.pedidos_compra drop constraint if exists pedidos_compra_status_check;
update public.pedidos_compra set status = 'Aguardando aprovação' where status = 'Pendente';
alter table public.pedidos_compra add constraint pedidos_compra_status_check
  check (status in ('Registrado', 'Aguardando aprovação', 'Aprovado', 'Recusado', 'Comprado'));
alter table public.pedidos_compra alter column status set default 'Aguardando aprovação';

create or replace function public.preparar_gasto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.valor_estimado is null or new.valor_estimado <= 0 then
    raise exception 'Informe o valor do gasto.' using errcode = 'GE021';
  end if;
  if new.comprovante_url is null and new.comprovante_arquivo is null then
    raise exception 'Anexe o comprovante (link ou arquivo).' using errcode = 'GE022';
  end if;
  -- arquivo só vale se for da própria pasta e existir de fato no bucket
  if new.comprovante_arquivo is not null and (
       split_part(new.comprovante_arquivo, '/', 1) <> (select auth.uid())::text
       or not exists (select 1 from storage.objects o
                       where o.bucket_id = 'comprovantes' and o.name = new.comprovante_arquivo)) then
    raise exception 'Comprovante não encontrado entre os seus arquivos.' using errcode = 'GE022';
  end if;
  -- até o limite não pede aprovação; acima, espera o financeiro
  new.status := case when new.valor_estimado <= (select limite_gasto from public.parametros) then 'Registrado'
                     else 'Aguardando aprovação' end;
  new.solicitante_id := (select auth.uid());
  new.decidido_por := null;
  new.decidido_em := null;
  new.resposta := null;
  return new;
end;
$$;
revoke execute on function public.preparar_gasto() from public, anon, authenticated;
drop trigger if exists preparar_gasto on public.pedidos_compra;
create trigger preparar_gasto before insert on public.pedidos_compra
  for each row execute function public.preparar_gasto();

drop policy if exists "pedidos: dono ou cargo lê" on public.pedidos_compra;
drop policy if exists "gastos: membro lê" on public.pedidos_compra;
create policy "gastos: membro lê" on public.pedidos_compra for select to authenticated using (public.e_membro());
drop policy if exists "pedidos: membro pede" on public.pedidos_compra;
drop policy if exists "gastos: membro registra" on public.pedidos_compra;
create policy "gastos: membro registra" on public.pedidos_compra for insert to authenticated
  with check (public.e_membro() and solicitante_id = (select auth.uid())
              and status in ('Registrado', 'Aguardando aprovação'));
drop policy if exists "pedidos: dono desiste ou diretoria apaga" on public.pedidos_compra;
drop policy if exists "gastos: dono retira ou diretoria apaga" on public.pedidos_compra;
create policy "gastos: dono retira ou diretoria apaga" on public.pedidos_compra for delete to authenticated
  using ((solicitante_id = (select auth.uid()) and status in ('Registrado', 'Aguardando aprovação')) or public.e_diretoria());

-- Decidir: só o que espera aprovação, e nunca o próprio gasto.
create or replace function public.carimbar_decisao_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- o que foi gasto não muda depois de registrado: senão um gasto pequeno
  -- (Registrado direto) viraria grande sem passar por aprovação
  if (select auth.uid()) is not null
     and (new.valor_estimado, new.item, new.comprovante_url, new.comprovante_arquivo, new.data_gasto)
         is distinct from (old.valor_estimado, old.item, old.comprovante_url, old.comprovante_arquivo, old.data_gasto) then
    raise exception 'Valor, item, data e comprovante do gasto não mudam. Retire e registre de novo.' using errcode = 'GE013';
  end if;
  if new.status is distinct from old.status then
    if (select auth.uid()) is not null then
      if not ((old.status = 'Aguardando aprovação' and new.status in ('Aprovado', 'Recusado'))
              or (old.status = 'Aprovado' and new.status = 'Comprado')) then
        raise exception 'Só gasto aguardando aprovação é aprovado ou recusado.' using errcode = 'GE013';
      end if;
      if old.solicitante_id = (select auth.uid()) then
        raise exception 'Ninguém aprova o próprio gasto.' using errcode = 'GE012';
      end if;
    end if;
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

-- Comprovante em arquivo: bucket privado, cada membro escreve na própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "comprovantes: membro envia na própria pasta" on storage.objects;
create policy "comprovantes: membro envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.e_membro()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "comprovantes: membro lê" on storage.objects;
create policy "comprovantes: membro lê" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and public.e_membro());

-- 4. ALERTAS -------------------------------------------------------------------
-- `pessoa_id` = quem está envolvido; `grupo` = quem também deve agir
-- (revisores, financeiro). A diretoria vê a lista inteira.
create or replace view public.alertas with (security_invoker = true) as
  select 'tarefa_atrasada'::text as tipo, 'Tarefa atrasada'::text as titulo,
         t.titulo as detalhe, '/membros/tarefas'::text as href,
         t.responsavel_id as pessoa_id, null::text as grupo, t.prazo::timestamptz as desde
    from public.sprint_tarefas t
   where t.prazo < current_date and t.estado <> 'Concluída'
  union all
  select 'tarefa_bloqueada', 'Bloqueada há mais de 2 dias: passe para a tarefa de reserva',
         t.titulo || ' · ' || coalesce(t.motivo_bloqueio, ''), '/membros/tarefas',
         t.responsavel_id, null, t.bloqueada_em
    from public.sprint_tarefas t
   where t.bloqueada and t.bloqueada_em < now() - interval '2 days' and t.estado <> 'Concluída'
  union all
  select 'revisao_parada', 'Na fila de revisão há mais de 48 h', f.titulo, '/membros/revisao',
         null, 'revisores', f.enviada_em
    from public.fila_revisao f
   where f.enviada_em < now() - interval '48 hours'
  union all
  select 'sem_principal', 'Sem tarefa principal', 'Assuma uma pauta aberta como principal.', '/membros/pautas',
         p.id, null, null
    from public.perfis p
   where p.aprovado and p.ativo
     and not exists (select 1 from public.sprint_tarefas t
                      where t.responsavel_id = p.id and t.tipo = 'principal' and t.estado <> 'Concluída')
  union all
  select 'sem_reserva', 'Sem tarefa de reserva', 'Assuma uma pauta aberta como reserva.', '/membros/pautas',
         p.id, null, null
    from public.perfis p
   where p.aprovado and p.ativo
     and not exists (select 1 from public.sprint_tarefas t
                      where t.responsavel_id = p.id and t.tipo = 'reserva' and t.estado <> 'Concluída')
  union all
  select 'material_atrasado', 'Material com devolução atrasada', i.codigo || ' · ' || i.item, '/membros/inventario',
         i.emprestado_para, null, i.devolucao_prevista::timestamptz
    from public.patrimonio i
   where i.status = 'Emprestado' and i.devolucao_prevista < current_date
  union all
  select 'gasto_aguardando', 'Gasto aguardando aprovação',
         g.item || ' · R$ ' || to_char(g.valor_estimado, 'FM999G990D00'), '/membros/gastos',
         g.solicitante_id, 'financeiro', g.created_at
    from public.pedidos_compra g
   where g.status = 'Aguardando aprovação';
revoke all on public.alertas from public, anon;
grant select on public.alertas to authenticated, service_role;

-- 5. BASE DE CONHECIMENTO: ARTIGOS-MODELO --------------------------------------
insert into public.artigos (titulo, area, conteudo)
select v.titulo, v.area, v.conteudo
  from (values
    ('Como gravar firmware no ESP32', 'Sistemas Embarcados',
     E'## Para que serve\n\n## O que você precisa\n\n## Passo a passo\n\n1. \n\n## Problemas comuns\n\n## Quem escreveu e quando testou\n'),
    ('Como instalar o ROS 2', 'ROS 2',
     E'## Versão e sistema\n\n## Passo a passo\n\n1. \n\n## Como conferir que funcionou\n\n## Problemas comuns\n'),
    ('Como usar a impressora 3D', 'Mecânica',
     E'## Antes de imprimir\n\n## Fatiando a peça\n\n## Durante a impressão\n\n## Depois (limpeza e registro)\n\n## Problemas comuns\n'),
    ('Como pedir uma peça', 'Geral',
     E'## Até o limite de gasto\n\nCompre e registre em Gastos com o comprovante. Não precisa pedir.\n\n## Acima do limite\n\nRegistre em Gastos; fica aguardando aprovação.\n\n## Onde comprar\n\n## Prazo típico de entrega\n'),
    ('Modelo de README de projeto', 'Geral',
     E'# Nome do projeto\n\n## O que é\n\n## Como rodar\n\n## Interfaces (tópicos, pinagem, dimensões)\n\n## Quem mantém\n\n## Licença\n')
  ) as v(titulo, area, conteudo)
 where not exists (select 1 from public.artigos a where a.titulo = v.titulo);
