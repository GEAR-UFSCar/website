-- =============================================================================
-- GEAR — trava de ordem sequencial no banco
-- Rodar no SQL Editor, DEPOIS de 002_academia.sql.
--
-- Move para o Postgres a regra que hoje só existe em JavaScript
-- (app/membros/aprendizagem/page.tsx). A validação em JS continua valendo
-- para a interface; esta aqui é a que não dá para contornar com um POST
-- direto ao PostgREST.
-- =============================================================================

create or replace function public.validar_ordem_progresso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nivel_alvo  text;
  ordem_alvo  integer;
  pendente    text;
begin
  -- Desmarcar (ou apenas registrar início) não exige nada: a regra é sobre
  -- CONCLUIR fora de ordem.
  if new.concluido_em is null then
    return new;
  end if;

  select m.nivel, m.ordem into nivel_alvo, ordem_alvo
  from public.modulos m
  where m.id = new.modulo_id;

  if not found then
    raise exception 'Módulo % não existe.', new.modulo_id;
  end if;

  -- Primeiro módulo anterior do MESMO nível que ainda não está concluído
  -- para este usuário. LEFT JOIN porque "sem linha em progresso" também
  -- conta como não concluído.
  select anterior.titulo into pendente
  from public.modulos anterior
  left join public.progresso p
    on p.modulo_id = anterior.id
   and p.usuario_id = new.usuario_id
  where anterior.nivel = nivel_alvo
    and anterior.ordem < ordem_alvo
    and p.concluido_em is null
  order by anterior.ordem
  limit 1;

  if pendente is not null then
    raise exception
      'Ordem do nível % não respeitada: conclua antes "%".', nivel_alvo, pendente
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists progresso_validar_ordem on public.progresso;
create trigger progresso_validar_ordem
  before insert or update on public.progresso
  for each row execute function public.validar_ordem_progresso();
