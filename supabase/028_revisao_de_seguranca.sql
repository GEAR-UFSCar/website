-- =============================================================================
-- GEAR — revisão de segurança de 24/10/2026: cadastro, funções de gatilho e
-- políticas sobrando
-- Rodar no SQL Editor, DEPOIS de 027_calendario_completo.sql.
-- Depende das migrações que criam as funções de gatilho aqui fechadas: 001
-- (handle_new_user), 004 (guardar_cargo), 005, 007, 012, 018 e 025.
--
-- Três achados da revisão completa do site. NADA AQUI APAGA DADO e nada muda o
-- que um membro consegue fazer hoje: são um gatilho de cadastro, grants e três
-- políticas que já eram redundantes.
--
--   M1  O domínio do e-mail só era conferido no navegador (components/entrar.tsx).
--       Quem chama a API de cadastro do Supabase direto criava conta com
--       qualquer e-mail. A conta nascia sem aprovação e não lia nada de
--       membro, mas a regra da entidade não valia no servidor.
--
--   B5  Sete funções de gatilho SECURITY DEFINER (mais `rls_auto_enable`, o
--       gatilho de evento que o painel cria) tinham EXECUTE aberto a `anon` e
--       `authenticated`. O Postgres já recusa chamar uma função de gatilho
--       direto, então não havia exploração — mas o advisor do Supabase as
--       lista como alerta, e alerta que nunca some esconde o que for novo.
--       Gatilho dispara sem que quem faz a escrita precise de EXECUTE na
--       função; o privilégio só é conferido na criação do gatilho. O teste
--       `npm run test:banco` prova isso disparando cada um como o papel real.
--
--   B6  Três políticas de `sprints` da 010 ("… só na própria trilha") que a
--       011 já remove ainda estavam em produção ao lado das da 013. Não sabemos
--       por quê (011 pulada, ou 010 reexecutada depois dela — a ordem não
--       ficou registrada em lugar nenhum). São mais estreitas que as vigentes,
--       então nunca deram acesso extra; só custo (o advisor aponta "múltiplas
--       políticas permissivas") e confusão para quem lê a tabela.
--
-- O QUE FICOU DE FORA, DE PROPÓSITO
--   · Índices nas oito chaves estrangeiras sem índice e paginação das listas:
--     com ~14 membros não mudam nada; entram quando o volume pedir.
--   · A view `metricas_publicas` (e `documentos_publicos`) como SECURITY
--     DEFINER: é de propósito, é o recorte que a diretoria decidiu publicar.
--     Está registrada em SECURITY.md como risco aceito.
-- =============================================================================

-- 1. CADASTRO SÓ COM E-MAIL INSTITUCIONAL (M1) ---------------------------------
-- Mesma regra de components/entrar.tsx (DOMINIOS_PERMITIDOS): o domínio inteiro,
-- sem subdomínios além dos dois listados. Mudou lá, muda aqui. O domínio é o
-- que vem depois do ÚLTIMO `@`, então `x@ufscar.br@gmail.com` e
-- `"x@ufscar.br"@gmail.com` valem como gmail.com.
--
-- Só INSERT: quem já tem conta entra normalmente, inclusive se a conta veio de
-- outro domínio. Trocar o e-mail DEPOIS de criada a conta não passa por aqui —
-- a barreira real é a aprovação da diretoria, que este gatilho não substitui.
--
-- Vale para qualquer caminho que crie linha em auth.users, inclusive "Add
-- user" do painel, convite e login anônimo (sem e-mail, é recusado). Conta de
-- teste fora da UFSCar precisa desligar este gatilho enquanto é criada.
--
-- O Supabase Auth não repassa a mensagem do gatilho ao cliente: quem se
-- cadastra pela API de fora vê "Database error saving new user". A mensagem
-- útil continua sendo a da tela, que confere antes.
create or replace function public.exigir_email_institucional()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- coalesce: sem `@`, substring() devolve null, e `null not in (...)` seria
  -- null — o `if` leria como falso e deixaria passar.
  dominio text := lower(btrim(coalesce(
    substring(coalesce(new.email, '') from '@([^@]*)$'), ''
  )));
begin
  if dominio not in ('ufscar.br', 'estudante.ufscar.br') then
    raise exception 'O cadastro é restrito a e-mail institucional da UFSCar.'
      using errcode = 'GE002';
  end if;
  return new;
end;
$$;

comment on function public.exigir_email_institucional() is
  'Recusa cadastro (insert em auth.users) fora de ufscar.br e estudante.ufscar.br. Espelha DOMINIOS_PERMITIDOS em components/entrar.tsx.';

drop trigger if exists exigir_email_institucional on auth.users;
create trigger exigir_email_institucional
  before insert on auth.users
  for each row execute function public.exigir_email_institucional();

-- 2. FUNÇÕES DE GATILHO FORA DO ALCANCE DA API (B5) -----------------------------
-- Nenhuma delas é chamada por RPC no site (a busca por `.rpc(` só acha
-- calendario_token_valido, feed_do_calendario e valor_patrimonio_atual, que
-- continuam como estão). `service_role` e o dono mantêm o privilégio.
--
-- Ficam de fora as nove funções de gatilho SECURITY INVOKER (carimbar_* e
-- tocar_*): o advisor não as lista, rodam com o papel de quem escreve e não
-- ampliam nada. Fechar também seria coerente, mas é mexer em coisa que não
-- estava quebrada.
revoke execute on function public.cascatear_desconclusao()        from public, anon, authenticated;
revoke execute on function public.guardar_cargo()                 from public, anon, authenticated;
revoke execute on function public.guardar_perfil_novo()           from public, anon, authenticated;
revoke execute on function public.guardar_publicacao_documento()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()               from public, anon, authenticated;
revoke execute on function public.registrar_termos_aceitos()      from public, anon, authenticated;
revoke execute on function public.validar_ordem_progresso()       from public, anon, authenticated;
revoke execute on function public.exigir_email_institucional()    from public, anon, authenticated;

-- Quem dispara os dois gatilhos de cadastro é o GoTrue, com o papel
-- supabase_auth_admin — que a API não alcança. O Postgres não confere EXECUTE
-- quando um gatilho dispara (o teste prova isso com um papel sem nenhum), então
-- estas duas linhas não deveriam ser necessárias. Ficam para que o cadastro não
-- dependa de isso estar certo: o custo é zero e o papel é o único que precisa.
grant execute on function public.handle_new_user()           to supabase_auth_admin;
grant execute on function public.registrar_termos_aceitos()  to supabase_auth_admin;

-- `rls_auto_enable` é do painel do Supabase ("Enable automatic RLS"), não está
-- em nenhuma migração: por isso o bloco só age se ela existir. Também é gatilho
-- (de evento), e o privilégio de EXECUTE não é conferido quando ele dispara.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

-- 3. POLÍTICAS DA 010 QUE A 011 JÁ REMOVE E EM PRODUÇÃO SOBRARAM (B6) -----------
-- Idempotente: em banco onde a 011 valeu, não há o que apagar.
drop policy if exists "sprints: escrita só na própria trilha" on public.sprints;
drop policy if exists "sprints: edição só na própria trilha" on public.sprints;
drop policy if exists "sprints: remoção só na própria trilha" on public.sprints;

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. o gatilho de cadastro existe (esperado: 1 linha, tgenabled = 'O')
--   select tgname, tgenabled from pg_trigger where tgname = 'exigir_email_institucional';
--
--   -- 2. nenhuma função de gatilho SECURITY DEFINER executável por
--   --    anon/authenticated (esperado: 0 linhas)
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosecdef
--      and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
--      and (has_function_privilege('anon', p.oid, 'execute')
--        or has_function_privilege('authenticated', p.oid, 'execute'));
--
--   -- 3. sprints com 4 políticas: 1 SELECT e 3 de escrita (esperado: 4 linhas)
--   select policyname, cmd from pg_policies where tablename = 'sprints' order by cmd;
--
-- REVERTER, se o cadastro de verdade falhar com "Database error saving new user"
-- depois desta migração (não deve; é só o caminho de volta):
--
--   drop trigger if exists exigir_email_institucional on auth.users;
--   grant execute on function public.handle_new_user(),
--                             public.registrar_termos_aceitos() to public;
--
-- TESTE DE REGRESSÃO — pela API de Auth, com a chave anônima:
--   POST /auth/v1/signup {"email":"alguem@gmail.com","password":"…"}
--   → falha. Com @ufscar.br ou @estudante.ufscar.br, cria a conta.
-- =============================================================================
