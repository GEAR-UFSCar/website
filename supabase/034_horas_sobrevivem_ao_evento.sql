-- =============================================================================
-- GEAR — horas de extensão não somem quando o evento é apagado
-- Rodar no SQL Editor, DEPOIS de 033_tarefas_horas_caixa_selecao.sql. Pode
-- rodar mais de uma vez. Não apaga dado.
--
-- Na 033 a chamada tinha `evento_id` na chave e `on delete cascade`: apagar um
-- evento no Calendário (para corrigir data, limpar duplicado) levava junto as
-- horas de todo mundo que esteve nele, e a declaração de cada um encolhia sem
-- ninguém perceber. Agora a chamada guarda o nome da atividade no momento do
-- registro e, se o evento sumir, fica com `evento_id` nulo.
-- =============================================================================

alter table public.eventos_chamada add column if not exists id uuid not null default gen_random_uuid();
alter table public.eventos_chamada add column if not exists atividade text;

-- quem já existe recebe o nome do evento atual
update public.eventos_chamada c
   set atividade = e.tipo || ': ' || e.titulo
  from public.eventos e
 where e.id = c.evento_id and c.atividade is null;
update public.eventos_chamada set atividade = 'Evento' where atividade is null;
alter table public.eventos_chamada alter column atividade set not null;
alter table public.eventos_chamada drop constraint if exists eventos_chamada_atividade_tamanho;
alter table public.eventos_chamada add constraint eventos_chamada_atividade_tamanho
  check (char_length(atividade) between 1 and 300);

-- chave passa a ser o id; a trinca evento+dia+pessoa continua única (é o alvo
-- do upsert da chamada). Com evento apagado ela vira (null, dia, pessoa), e
-- null não colide com nada — é o comportamento certo para histórico.
alter table public.eventos_chamada drop constraint if exists eventos_chamada_pkey;
alter table public.eventos_chamada add constraint eventos_chamada_pkey primary key (id);
alter table public.eventos_chamada drop constraint if exists eventos_chamada_ocorrencia_unica;
alter table public.eventos_chamada add constraint eventos_chamada_ocorrencia_unica unique (evento_id, dia, usuario_id);

alter table public.eventos_chamada alter column evento_id drop not null;
alter table public.eventos_chamada drop constraint if exists eventos_chamada_evento_id_fkey;
alter table public.eventos_chamada add constraint eventos_chamada_evento_id_fkey
  foreign key (evento_id) references public.eventos (id) on delete set null;

-- O nome vem do evento, não do cliente: ninguém escreve "Viagem à NASA" numa
-- reunião de 1h. Só no INSERT; depois o nome fica congelado.
create or replace function public.nomear_chamada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select e.tipo || ': ' || e.titulo into new.atividade from public.eventos e where e.id = new.evento_id;
  if new.atividade is null then
    raise exception 'Evento não encontrado.' using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke execute on function public.nomear_chamada() from public, anon, authenticated;
drop trigger if exists nomear_chamada on public.eventos_chamada;
create trigger nomear_chamada before insert on public.eventos_chamada
  for each row execute function public.nomear_chamada();
