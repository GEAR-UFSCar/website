-- =============================================================================
-- GEAR — organização interna, fase 2
-- Rodar no SQL Editor, DEPOIS de 042_organizacao_fase1.sql. Pode rodar mais de
-- uma vez. Não apaga dado.
--
--   1. Academia por competências: `modulos` vira competência (código único,
--      área, pontos, critério de aceite obrigatório, guia na base de
--      conhecimento). A trava de ordem (005/007) sai: o membro escolhe.
--   2. `progresso` vira comprovação: evidência, estado Enviada → Em revisão →
--      Ajustes/Aprovada, revisor, comentário, datas. Só as funções mudam o
--      estado; o membro não marca mais "concluído" sozinho. Concluídos antigos
--      viram "Aprovada" com `legado = true`. `concluido_em` passa a ser "aprovada
--      em", e só isso conta pontos.
--   3. Fila de revisão: view `fila_revisao` (tarefas em revisão + comprovações
--      enviadas), mais antigas primeiro. Revisor "pega" um item; depois de 48 h
--      na fila qualquer outro revisor pode pegar. Ninguém revisa o próprio.
--   4. Inventário: `devolucao_prevista` no item (para a lista e os alertas) e
--      os quatro kits iniciais, se ainda não estiverem cadastrados.
--
-- Códigos novos: GE016 competência sem código/critério, GE017 item pego por
-- outra pessoa há menos de 48 h. Reusa GE011–GE015 da 042.
-- =============================================================================

-- 1. COMPETÊNCIAS --------------------------------------------------------------
alter table public.modulos
  add column if not exists codigo text unique
    check (codigo is null or codigo ~ '^[A-Z0-9]{2,6}-[0-9]{2,3}$'),
  add column if not exists area text
    check (area is null or area in ('IA', 'Visão Computacional', 'Sistemas Embarcados', 'Robótica Móvel',
                                    'Eletrônica', 'Mecânica', 'Controle', 'CAD', 'ROS 2',
                                    'Aprendizado por Reforço', 'Drones', 'Manipulação')),
  add column if not exists pontos integer not null default 0 check (pontos between 0 and 1000),
  add column if not exists criterio_aceite text
    check (criterio_aceite is null or char_length(criterio_aceite) <= 2000),
  add column if not exists guia_id uuid references public.artigos (id) on delete set null;

-- Os nove módulos antigos ficam sem código e sem critério (legado); toda
-- competência nova nasce com os dois, e nenhum dos dois volta a ficar vazio.
create or replace function public.preparar_competencia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.codigo := nullif(upper(btrim(coalesce(new.codigo, ''))), '');
  new.criterio_aceite := nullif(btrim(coalesce(new.criterio_aceite, '')), '');
  if (tg_op = 'INSERT' or old.codigo is not null or old.criterio_aceite is not null)
     and (new.codigo is null or new.criterio_aceite is null) then
    raise exception 'Competência precisa de código (ex.: EMB-01) e critério de aceite.' using errcode = 'GE016';
  end if;
  if tg_op = 'INSERT' and new.ordem is null then
    select coalesce(max(m.ordem), 0) + 1 into new.ordem from public.modulos m where m.nivel = new.nivel;
  end if;
  return new;
end;
$$;
revoke execute on function public.preparar_competencia() from public, anon, authenticated;
drop trigger if exists preparar_competencia on public.modulos;
create trigger preparar_competencia before insert or update on public.modulos
  for each row execute function public.preparar_competencia();

-- Sem trava de ordem: o membro escolhe a competência (decisão de 24/11/2026).
drop trigger if exists progresso_validar_ordem on public.progresso;
drop trigger if exists progresso_cascatear_desconclusao on public.progresso;
-- As funções ficam (sem gatilho, sem EXECUTE): a 028 as cita e precisa continuar reexecutável.

-- 2. COMPROVAÇÕES --------------------------------------------------------------
alter table public.progresso
  add column if not exists estado text
    check (estado is null or estado in ('Enviada', 'Em revisão', 'Ajustes', 'Aprovada')),
  add column if not exists evidencia_url text
    check (evidencia_url is null or (evidencia_url ~* '^https?://' and char_length(evidencia_url) <= 2000)),
  add column if not exists revisor_id uuid references public.perfis (id) on delete set null,
  add column if not exists comentario text check (comentario is null or char_length(comentario) <= 2000),
  add column if not exists enviada_em timestamptz,
  add column if not exists revisada_em timestamptz,
  add column if not exists rodadas_ajustes integer not null default 0 check (rodadas_ajustes >= 0),
  add column if not exists legado boolean not null default false;

-- Concluído antigo = aprovado de legado. Linha sem conclusão e sem estado era
-- só "comecei": fica, sem estado, e não conta ponto.
update public.progresso set estado = 'Aprovada', legado = true
 where estado is null and concluido_em is not null;

create index if not exists progresso_fila_idx on public.progresso (enviada_em) where estado in ('Enviada', 'Em revisão');

drop policy if exists "progresso: criar o próprio" on public.progresso;
drop policy if exists "progresso: editar o próprio" on public.progresso;
drop policy if exists "progresso: apagar o próprio" on public.progresso;
-- Retirar a própria comprovação antes de aprovada; aprovada é registro.
create policy "progresso: apagar o próprio" on public.progresso
  for delete to authenticated
  using (usuario_id = (select auth.uid()) and estado is distinct from 'Aprovada');
-- Todo membro vê as comprovações de todos: é o que embasa a Avaliação Técnica
-- e a página de membros. Somada à "ler o próprio" (002) e à de cargo (031).
drop policy if exists "progresso: membro lê" on public.progresso;
create policy "progresso: membro lê" on public.progresso
  for select to authenticated using (public.e_membro());

create or replace function public.enviar_comprovacao(competencia uuid, evidencia text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  link text := btrim(coalesce(evidencia, ''));
  atual text;
begin
  if not public.e_membro() then
    raise exception 'Só membro aprovado envia comprovação.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.modulos where id = competencia) then
    raise exception 'Competência não encontrada.' using errcode = 'GE013';
  end if;
  if link !~* '^https?://\S+$' or char_length(link) > 2000 then
    raise exception 'Evidência é obrigatória: um link de repositório, vídeo ou relatório.' using errcode = 'GE011';
  end if;

  select estado into atual from public.progresso
   where usuario_id = eu and modulo_id = competencia for update;
  if atual in ('Em revisão', 'Aprovada') then
    raise exception 'Esta comprovação está "%" e não pode ser reenviada agora.', atual using errcode = 'GE013';
  end if;

  insert into public.progresso (usuario_id, modulo_id, estado, evidencia_url, enviada_em)
  values (eu, competencia, 'Enviada', link, now())
  on conflict on constraint progresso_usuario_modulo_unico do update
     set estado = 'Enviada', evidencia_url = excluded.evidencia_url, enviada_em = now(),
         revisor_id = null, concluido_em = null;
end;
$$;
revoke execute on function public.enviar_comprovacao(uuid, text) from public, anon;
grant  execute on function public.enviar_comprovacao(uuid, text) to authenticated, service_role;

-- Pegar: o revisor avisa que está olhando. Pego por outra pessoa trava por 48 h
-- contadas do envio; depois disso qualquer revisor pode pegar.
create or replace function public.pegar_comprovacao(comprovacao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.progresso;
  eu uuid := (select auth.uid());
begin
  select * into c from public.progresso where id = comprovacao for update;
  if not public.e_revisor() then
    raise exception 'Revisar é de quem tem formação Principal ou Avançada.' using errcode = 'GE014';
  end if;
  if not found or c.estado not in ('Enviada', 'Em revisão') then
    raise exception 'Esta comprovação não está na fila.' using errcode = 'GE013';
  end if;
  if c.usuario_id = eu then
    raise exception 'Ninguém revisa o próprio trabalho.' using errcode = 'GE012';
  end if;
  if c.revisor_id is not null and c.revisor_id <> eu and c.enviada_em > now() - interval '48 hours' then
    raise exception 'Outra pessoa já pegou esta revisão.' using errcode = 'GE017';
  end if;
  update public.progresso set estado = 'Em revisão', revisor_id = eu where id = comprovacao;
end;
$$;
revoke execute on function public.pegar_comprovacao(uuid) from public, anon;
grant  execute on function public.pegar_comprovacao(uuid) to authenticated, service_role;

create or replace function public.revisar_comprovacao(comprovacao uuid, aprovar boolean, comentario text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.progresso;
  eu uuid := (select auth.uid());
  nota text := nullif(btrim(coalesce(comentario, '')), '');
begin
  select * into c from public.progresso where id = comprovacao for update;
  if not public.e_revisor() then
    raise exception 'Revisar é de quem tem formação Principal ou Avançada.' using errcode = 'GE014';
  end if;
  if not found or c.estado not in ('Enviada', 'Em revisão') then
    raise exception 'Esta comprovação não está na fila.' using errcode = 'GE013';
  end if;
  if c.usuario_id = eu then
    raise exception 'Ninguém revisa o próprio trabalho.' using errcode = 'GE012';
  end if;
  if c.revisor_id is not null and c.revisor_id <> eu and c.enviada_em > now() - interval '48 hours' then
    raise exception 'Outra pessoa já pegou esta revisão.' using errcode = 'GE017';
  end if;
  if not aprovar and nota is null then
    raise exception 'Pedir ajustes exige dizer o que ajustar.' using errcode = 'GE015';
  end if;
  if char_length(nota) > 2000 then
    raise exception 'Comentário longo demais.' using errcode = '22001';
  end if;

  update public.progresso
     set estado          = case when aprovar then 'Aprovada' else 'Ajustes' end,
         revisor_id      = eu,
         comentario      = nota,
         revisada_em     = now(),
         concluido_em    = case when aprovar then now() end,
         rodadas_ajustes = rodadas_ajustes + case when aprovar then 0 else 1 end
   where id = comprovacao;
end;
$$;
revoke execute on function public.revisar_comprovacao(uuid, boolean, text) from public, anon;
grant  execute on function public.revisar_comprovacao(uuid, boolean, text) to authenticated, service_role;

-- 3. FILA DE REVISÃO -----------------------------------------------------------
-- Tarefa ganha o mesmo "pegar". Em revisão, revisor_id é quem pegou (a 042 o
-- zera a cada envio); a regra das 48 h conta de enviada_revisao_em.
create or replace function public.pegar_tarefa_para_revisar(tarefa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  eu uuid := (select auth.uid());
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not public.e_revisor() then
    raise exception 'Revisar é de quem tem formação Principal ou Avançada.' using errcode = 'GE014';
  end if;
  if not found or t.estado <> 'Em revisão' then
    raise exception 'Esta tarefa não está em revisão.' using errcode = 'GE013';
  end if;
  if t.responsavel_id = eu then
    raise exception 'Ninguém revisa o próprio trabalho.' using errcode = 'GE012';
  end if;
  if t.revisor_id is not null and t.revisor_id <> eu and t.enviada_revisao_em > now() - interval '48 hours' then
    raise exception 'Outra pessoa já pegou esta revisão.' using errcode = 'GE017';
  end if;
  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas set revisor_id = eu where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.pegar_tarefa_para_revisar(uuid) from public, anon;
grant  execute on function public.pegar_tarefa_para_revisar(uuid) to authenticated, service_role;

-- revisar_tarefa (042) passa a respeitar quem pegou.
create or replace function public.revisar_tarefa(tarefa uuid, aprovar boolean, comentario text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  eu uuid := (select auth.uid());
  nota text := nullif(btrim(coalesce(comentario, '')), '');
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not public.e_revisor() then
    raise exception 'Revisar é de quem tem formação Principal ou Avançada.' using errcode = 'GE014';
  end if;
  if not found or t.estado <> 'Em revisão' then
    raise exception 'Esta tarefa não está em revisão.' using errcode = 'GE013';
  end if;
  if t.responsavel_id = eu then
    raise exception 'Ninguém revisa o próprio trabalho.' using errcode = 'GE012';
  end if;
  if t.revisor_id is not null and t.revisor_id <> eu and t.enviada_revisao_em > now() - interval '48 hours' then
    raise exception 'Outra pessoa já pegou esta revisão.' using errcode = 'GE017';
  end if;
  if not aprovar and nota is null then
    raise exception 'Pedir ajustes exige dizer o que ajustar.' using errcode = 'GE015';
  end if;
  if char_length(nota) > 2000 then
    raise exception 'Comentário longo demais.' using errcode = '22001';
  end if;

  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas
     set estado             = case when aprovar then 'Concluída' else 'Ajustes' end,
         revisor_id         = eu,
         comentario_revisao = nota,
         rodadas_ajustes    = rodadas_ajustes + case when aprovar then 0 else 1 end,
         concluida_em       = case when aprovar then now() end
   where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.revisar_tarefa(uuid, boolean, text) from public, anon;
grant  execute on function public.revisar_tarefa(uuid, boolean, text) to authenticated, service_role;

-- security_invoker: a view lê com a RLS de quem pede (membro aprovado lê os dois lados).
create or replace view public.fila_revisao with (security_invoker = true) as
  select 'tarefa'::text as tipo, t.id, t.titulo, t.responsavel_id as autor_id,
         t.enviada_revisao_em as enviada_em, t.revisor_id, t.evidencia_url,
         s.titulo as contexto, null::integer as pontos, t.rodadas_ajustes
    from public.sprint_tarefas t
    left join public.sprints s on s.id = t.sprint_id
   where t.estado = 'Em revisão'
  union all
  select 'comprovacao', p.id, concat_ws(' · ', m.codigo, m.titulo), p.usuario_id,
         p.enviada_em, p.revisor_id, p.evidencia_url,
         m.criterio_aceite, m.pontos, p.rodadas_ajustes
    from public.progresso p
    join public.modulos m on m.id = p.modulo_id
   where p.estado in ('Enviada', 'Em revisão');
revoke all on public.fila_revisao from public, anon;
grant select on public.fila_revisao to authenticated, service_role;

-- 4. INVENTÁRIO ----------------------------------------------------------------
alter table public.patrimonio add column if not exists devolucao_prevista date;
update public.patrimonio p set devolucao_prevista = e.prazo
  from public.emprestimos e
 where e.item_id = p.id and e.devolvido_em is null and p.devolucao_prevista is distinct from e.prazo;

-- Iguais às da 033, carimbando e limpando devolucao_prevista.
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
         responsavel_atual = (select nome_completo from public.perfis where id = (select auth.uid())),
         devolucao_prevista = p_prazo
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
         responsavel_atual = null,
         devolucao_prevista = null
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

-- Os quatro kits do enunciado. Um registro por unidade: o empréstimo é do item
-- inteiro, e dois OSOYOO num registro só sairiam sempre juntos. Não duplica se
-- a planilha já trouxe o kit (mesmo fabricante e modelo).
insert into public.patrimonio (item, categoria, fabricante, modelo, quantidade, status, origem)
select v.item, 'Robôs e kits robóticos', v.fabricante, v.modelo, 1, 'Disponível', 'Cadastro inicial (043)'
  from (values
    ('LAFVIN 4WD Smart Robot Car Kit V2',     'LAFVIN', '4WD Smart Robot Car Kit V2', 1),
    ('LAFVIN 2WD Smart Robot Car Kit V2',     'LAFVIN', '2WD Smart Robot Car Kit V2', 1),
    ('OSOYOO Mecanum Wheel Robotic Car Kit',  'OSOYOO', 'Mecanum Wheel Robotic Car Kit', 2)
  ) as v(item, fabricante, modelo, unidades)
  cross join lateral generate_series(1, v.unidades) as n
 where n > (select count(*) from public.patrimonio p
             where p.fabricante ilike v.fabricante and p.modelo ilike v.modelo);
