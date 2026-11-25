-- =============================================================================
-- GEAR — avisos de partida e barreira anônima
-- Rodar no SQL Editor, DEPOIS de 045_tres_trilhas.sql. Pode rodar mais de uma
-- vez. Não apaga nem muda dado.
--
--   1. Dois alertas novos para a diretoria (grupo 'diretoria'):
--      · sem_revisor: nenhum membro ativo tem formação Principal ou Avançada.
--        Sem revisor nenhuma tarefa conclui e nenhuma comprovação é aprovada;
--        a 042 deixou todo mundo em Fundamental, então é o estado de partida.
--      · sem_ciclo: não há ciclo cobrindo hoje. Assumir tarefa funciona, mas
--        não entra em ciclo e a meta de pontos da Academia fica sem referência.
--   2. modulos e sprint_tarefas respondem 42501 a quem não tem sessão antes de
--      qualquer outro gatilho. Antes, preparar_competencia (043) e
--      preparar_tarefa (042) validavam o corpo primeiro e respondiam GE016 /
--      GE010; nada era gravado, mas o test:rls (que exige 42501) acusava.
-- =============================================================================

-- 1. ALERTAS -------------------------------------------------------------------
-- Igual à 044, com os dois tipos novos no fim.
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
   where g.status = 'Aguardando aprovação'
  union all
  select 'sem_revisor', 'Ninguém pode revisar',
         'Nenhum membro ativo tem formação Principal ou Avançada, então nenhuma tarefa conclui. Defina os níveis em Cargos.',
         '/membros/administracao/cargos', null, 'diretoria', null
   where not exists (select 1 from public.perfis p
                      where p.aprovado and p.ativo and p.nivel_formacao in ('Principal', 'Avançada'))
  union all
  select 'sem_ciclo', 'Nenhum ciclo em andamento',
         'Crie o ciclo de duas semanas com a meta de pontos da Academia.',
         '/membros/ciclos', null, 'diretoria', null
   where not exists (select 1 from public.ciclos c where current_date between c.inicio and c.fim);
revoke all on public.alertas from public, anon;
grant select on public.alertas to authenticated, service_role;

-- 2. BARREIRA ANÔNIMA ----------------------------------------------------------
-- "aa_" para disparar antes dos outros gatilhos BEFORE (ordem alfabética).
-- Sem security definer: current_user é o papel de quem chamou.
create or replace function public.barrar_anonimo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'anon' then
    raise exception 'É preciso entrar para escrever aqui.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.barrar_anonimo() from public, anon, authenticated;

drop trigger if exists aa_barrar_anonimo on public.modulos;
create trigger aa_barrar_anonimo before insert or update on public.modulos
  for each row execute function public.barrar_anonimo();
drop trigger if exists aa_barrar_anonimo on public.sprint_tarefas;
create trigger aa_barrar_anonimo before insert or update on public.sprint_tarefas
  for each row execute function public.barrar_anonimo();
