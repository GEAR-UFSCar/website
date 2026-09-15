-- =============================================================================
-- GEAR — o perfil que falta pode ser criado pelo próprio dono, sem privilégio
-- Rodar no SQL Editor, DEPOIS de 014_aprovacao_de_membros.sql.
--
-- O PROBLEMA QUE ISTO RESOLVE
-- /membros/completar-perfil fazia UPDATE. UPDATE em linha que não existe não
-- é erro: afeta zero linhas e volta sem reclamar. Quem tem conta no auth mas
-- não tem linha em `perfis` — trigger que não disparou, conta anterior à 001,
-- backfill que passou por cima — preenchia o formulário, via "Nenhum perfil
-- encontrado" e era devolvido à mesma tela. Para sempre, sem saída pela
-- interface. A pessoa não conseguia entrar e não havia o que ela pudesse
-- fazer a respeito.
--
-- A policy "perfis: criar o próprio" (001) já permite o INSERT. O que faltava
-- era a aplicação usá-la — e o guarda que impede esse INSERT de ser usado
-- para outra coisa.
--
-- O BURACO QUE ISTO FECHA
-- guardar_cargo() (004, reescrito na 014) é BEFORE **UPDATE**. Um INSERT
-- carregando {"aprovado": true, "cargo": "Presidente"} nunca passava por ele:
-- a policy de insert só compara o id. Hoje isso é latente, porque nenhum
-- código insere em `perfis` — mas a chave anônima está no bundle, e quem não
-- tem linha (exatamente quem este arquivo desbloqueia) podia se autoaprovar
-- com um POST. Passar a usar o upsert sem fechar isto seria trocar um portão
-- travado por um portão aberto.
-- =============================================================================

create or replace function public.guardar_perfil_novo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  -- Sem sessão = SQL Editor ou service_role. É o caminho do backfill da 001 e
  -- da promoção do primeiro Presidente; nele o valor passado é respeitado.
  if atual is null then
    return new;
  end if;

  -- Vindo de sessão, a linha é de quem está pedindo, e nasce sem poder algum.
  -- Não é validação ("recuse se vier errado"): é carimbo ("o valor é este"),
  -- o mesmo raciocínio dos triggers de autoria da 016.
  new.id                   := atual;
  new.aprovado             := false;
  new.cargo                := null;
  new.cargo_atualizado_por := null;
  new.cargo_atualizado_em  := null;

  return new;
end;
$$;

comment on function public.guardar_perfil_novo() is
  'Perfil criado por sessão nasce do próprio dono, não aprovado e sem cargo. Fecha o INSERT que guardar_cargo() não cobria.';

drop trigger if exists perfis_guardar_perfil_novo on public.perfis;
create trigger perfis_guardar_perfil_novo
  before insert on public.perfis
  for each row execute function public.guardar_perfil_novo();

-- =============================================================================
-- CONFERÊNCIA
--
--   -- os dois triggers de perfis convivem (esperado: 2 linhas)
--   select trigger_name, event_manipulation from information_schema.triggers
--    where event_object_table = 'perfis' order by 1;
--
--   -- com sessão de membro comum, pelo PostgREST:
--   POST /rest/v1/perfis {"id":"<seu-uuid>","nome_completo":"X","aprovado":true}
--   → grava, mas a linha volta com aprovado = false e cargo = null.
--
-- CONTAS ÓRFÃS QUE JÁ EXISTEM — o backfill da 001, de novo. Roda sem sessão,
-- então o trigger acima devolve `new` intacto e o default `aprovado = false`
-- vale. Ninguém é aprovado por este arquivo.
--
--   insert into public.perfis (id)
--   select u.id from auth.users u
--   left join public.perfis p on p.id = u.id
--    where p.id is null;
-- =============================================================================
