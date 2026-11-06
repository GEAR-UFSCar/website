-- =============================================================================
-- GEAR — agenda pública e ciclos do processo seletivo
-- Rodar no SQL Editor, DEPOIS de 037_lista_de_espera.sql. Pode rodar mais de
-- uma vez. Só cria; não apaga nem muda dado (eventos existentes nascem
-- privados).
--
-- 1. AGENDA PÚBLICA. O site público não tinha nada que mudasse sem pull
--    request. Agora quem cria evento no Calendário marca "Mostrar no site" e
--    ele aparece em /agenda. A view entrega só o recorte publicável: sem link
--    (pode ser sala de reunião interna), sem frente, sem autor.
--
-- 2. CICLOS DO PROCESSO SELETIVO. /ingressar dizia "inscrições fechadas" fixo
--    no código; abrir um ciclo exigia PR. Agora a diretoria cadastra o ciclo
--    em Seleção e a página troca sozinha entre "abre em", "aberto até" e
--    "fechado". O edital sai com pelo menos 7 dias de antecedência (doc. 11 e
--    doc. 35), e o banco recusa ciclo marcado para antes disso.
-- =============================================================================

-- 1. AGENDA PÚBLICA -----------------------------------------------------------
alter table public.eventos add column if not exists publico boolean not null default false;
comment on column public.eventos.publico is 'true = aparece em /agenda, sem link nem frente (view agenda_publica).';

drop view if exists public.agenda_publica;
create view public.agenda_publica as
  select e.id, e.titulo, e.descricao, e.tipo, e.data_inicio, e.data_fim, e.local,
         e.dia_inteiro, e.recorrencia, e.recorrencia_ate
    from public.eventos e
   where e.publico;

comment on view public.agenda_publica is
  'Eventos marcados como públicos, sem colunas internas. Atravessa a RLS de propósito, como metricas_publicas (019).';
grant select on public.agenda_publica to anon, authenticated;

-- 2. CICLOS DO PROCESSO SELETIVO ----------------------------------------------
create table if not exists public.ciclos_selecao (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(titulo) between 3 and 120),
  inscricoes_de  date not null,
  inscricoes_ate date not null,
  edital_url     text check (edital_url is null or edital_url ~ '^https?://'),
  criado_por     uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint ciclos_selecao_periodo check (inscricoes_ate >= inscricoes_de)
);

alter table public.ciclos_selecao enable row level security;

drop policy if exists "ciclos_selecao: cargo lê" on public.ciclos_selecao;
create policy "ciclos_selecao: cargo lê" on public.ciclos_selecao
  for select to authenticated using (public.tem_cargo());
drop policy if exists "ciclos_selecao: diretoria cria" on public.ciclos_selecao;
create policy "ciclos_selecao: diretoria cria" on public.ciclos_selecao
  for insert to authenticated with check (public.e_diretoria());
drop policy if exists "ciclos_selecao: diretoria corrige" on public.ciclos_selecao;
create policy "ciclos_selecao: diretoria corrige" on public.ciclos_selecao
  for update to authenticated using (public.e_diretoria()) with check (public.e_diretoria());
drop policy if exists "ciclos_selecao: diretoria apaga" on public.ciclos_selecao;
create policy "ciclos_selecao: diretoria apaga" on public.ciclos_selecao
  for delete to authenticated using (public.e_diretoria());

-- Antecedência mínima do edital. Vale ao criar e ao mudar a data de abertura;
-- corrigir título ou link de um ciclo já aberto continua possível.
create or replace function public.exigir_antecedencia_do_edital()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.inscricoes_de is distinct from old.inscricoes_de)
     and new.inscricoes_de < (now() at time zone 'America/Sao_Paulo')::date + 7 then
    raise exception 'As inscrições abrem no mínimo 7 dias depois de publicar o edital (doc. 35).'
      using errcode = '23514';
  end if;
  return new;
end
$$;
revoke execute on function public.exigir_antecedencia_do_edital() from public, anon, authenticated;

drop trigger if exists ciclos_selecao_antecedencia on public.ciclos_selecao;
create trigger ciclos_selecao_antecedencia
  before insert or update on public.ciclos_selecao
  for each row execute function public.exigir_antecedencia_do_edital();

-- O ciclo que interessa ao visitante: o próximo ou o que está aberto.
drop view if exists public.ciclo_publico;
create view public.ciclo_publico as
  select c.titulo, c.inscricoes_de, c.inscricoes_ate, c.edital_url
    from public.ciclos_selecao c
   where c.inscricoes_ate >= (now() at time zone 'America/Sao_Paulo')::date
   order by c.inscricoes_de
   limit 1;

comment on view public.ciclo_publico is
  'Próximo ciclo ou ciclo aberto, para /ingressar. Atravessa a RLS de propósito, como metricas_publicas (019).';
grant select on public.ciclo_publico to anon, authenticated;
