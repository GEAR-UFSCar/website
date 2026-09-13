-- =============================================================================
-- GEAR — autoria carimbada pelo banco, predicados fechados e cargo coerente
-- Rodar no SQL Editor, DEPOIS de 014_aprovacao_de_membros.sql.
--
-- Corrige três achados da auditoria de segurança pós-correção:
--
--   SEC-06  As colunas de autoria (avisos.autor_id, eventos.criado_por,
--           sprints.atualizado_por, atas.registrado_por) eram preenchidas pelo
--           CLIENTE. Nenhuma policy amarrava o valor a auth.uid(), então quem
--           tinha cargo podia publicar um aviso assinado por outra pessoa. A
--           RLS dizia QUEM pode escrever, nunca EM NOME DE QUEM.
--
--   SEC-07  e_diretoria(), e_membro() e tem_cargo() eram executáveis por
--           `anon` — chamáveis por RPC sem sessão. Hoje devolvem `false` e não
--           vazam nada, mas são predicados de autorização: quem os lê de fora
--           mapeia o modelo de acesso, e qualquer mudança futura no corpo
--           delas vira superfície pública sem ninguém perceber.
--
--   SEC-10  (novo) patrimonio e atas ainda usavam o `exists` inline de 003,
--           escrito antes de `aprovado` existir. A 014 acrescentou a exigência
--           de aprovação dentro de tem_cargo(), mas essas seis policies não
--           chamam tem_cargo() — copiaram o predicado. Efeito: um membro NÃO
--           aprovado que receba cargo lê patrimônio e atas, embora não leia
--           diretório, documentos, avisos nem calendário.
--
-- NADA AQUI APAGA DADO. São triggers, grants e policies.
-- =============================================================================

-- 1. AUTORIA CARIMBADA PELO BANCO (SEC-06) ------------------------------------
--
-- Por que trigger e não `with check (autor_id = auth.uid())`:
-- a policy compara o que o cliente mandou; o trigger IGNORA o que o cliente
-- mandou e escreve o valor certo. O primeiro recusa a mentira, o segundo torna
-- a mentira impossível de expressar — e de quebra o cliente pode parar de
-- mandar a coluna sem que ela fique nula.
--
-- Quatro funções quase iguais, de propósito. A versão genérica com
-- `to_jsonb(new) || jsonb_build_object(tg_argv[0], ...)` existe e funciona,
-- mas custa uma ida e volta por jsonb em código de segurança que outra pessoa
-- vai auditar. Explícito ganha de esperto aqui.
--
-- `security definer` em nenhuma delas: não há tabela a ler, só auth.uid(), que
-- qualquer papel enxerga. Manter invoker é o menor privilégio.
--
-- Em TODAS: auth.uid() nulo = SQL Editor ou service_role, que já ignoram RLS.
-- Nesses casos o valor passado é respeitado — é o que permite carga inicial e
-- correção manual de histórico.

-- 1a. avisos.autor_id — autoria é de quem escreveu, e não muda na edição.
create or replace function public.carimbar_autor_aviso()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  if atual is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.autor_id := atual;
  else
    -- Editar o texto de um aviso não transfere a assinatura para o editor.
    new.autor_id := old.autor_id;
  end if;

  return new;
end;
$$;

comment on function public.carimbar_autor_aviso() is
  'avisos.autor_id = auth.uid() no insert, imutável no update. Fecha SEC-06.';

drop trigger if exists avisos_carimbar_autor on public.avisos;
create trigger avisos_carimbar_autor
  before insert or update on public.avisos
  for each row execute function public.carimbar_autor_aviso();

-- 1b. eventos.criado_por — quem criou criou; edição não reescreve a origem.
create or replace function public.carimbar_criador_evento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  if atual is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.criado_por := atual;
  else
    new.criado_por := old.criado_por;
  end if;

  return new;
end;
$$;

comment on function public.carimbar_criador_evento() is
  'eventos.criado_por = auth.uid() no insert, imutável no update. Fecha SEC-06.';

drop trigger if exists eventos_carimbar_criador on public.eventos;
create trigger eventos_carimbar_criador
  before insert or update on public.eventos
  for each row execute function public.carimbar_criador_evento();

-- 1c. atas.registrado_por — é registro histórico. Nunca muda depois de escrito.
create or replace function public.carimbar_registrador_ata()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  if atual is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.registrado_por := atual;
  else
    new.registrado_por := old.registrado_por;
  end if;

  return new;
end;
$$;

comment on function public.carimbar_registrador_ata() is
  'atas.registrado_por = auth.uid() no insert, imutável no update. Fecha SEC-06.';

drop trigger if exists atas_carimbar_registrador on public.atas;
create trigger atas_carimbar_registrador
  before insert or update on public.atas
  for each row execute function public.carimbar_registrador_ata();

-- 1d. sprints.atualizado_por — semântica OPOSTA às três acima.
-- Aqui a coluna significa "quem mexeu por último", então ela é reescrita em
-- todo update. Não é exceção à regra: é a regra aplicada ao que a coluna diz.
create or replace function public.carimbar_atualizador_sprint()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  if atual is null then
    return new;
  end if;

  new.atualizado_por := atual;
  return new;
end;
$$;

comment on function public.carimbar_atualizador_sprint() is
  'sprints.atualizado_por = auth.uid() em insert E update — a coluna é "quem mexeu por último". Fecha SEC-06.';

drop trigger if exists sprints_carimbar_atualizador on public.sprints;
create trigger sprints_carimbar_atualizador
  before insert or update on public.sprints
  for each row execute function public.carimbar_atualizador_sprint();

-- perfis.cargo_atualizado_por JÁ estava protegido: guardar_cargo() (004, e
-- reescrito em 014) carimba na troca de cargo e restaura o valor antigo em
-- qualquer outro update. Não precisa de trigger novo.

-- 2. PREDICADOS FORA DO ALCANCE ANÔNIMO (SEC-07) ------------------------------
--
-- Por que não basta o corpo devolver `false`: EXECUTE para PUBLIC é o que faz
-- o PostgREST expor a função em /rest/v1/rpc/. Tirando o privilégio, a rota
-- responde 404 para quem não tem sessão, e o modelo de acesso deixa de ser
-- enumerável de fora.
--
-- `authenticated` PRECISA de execute: as policies de 014 chamam estas funções,
-- e policy roda com o papel de quem pede, não com o do dono da tabela.
-- Revogar de authenticated trancaria a área de membros inteira.
revoke execute on function public.e_diretoria() from public;
revoke execute on function public.e_membro()   from public;
revoke execute on function public.tem_cargo()  from public;

revoke execute on function public.e_diretoria() from anon;
revoke execute on function public.e_membro()   from anon;
revoke execute on function public.tem_cargo()  from anon;

grant execute on function public.e_diretoria() to authenticated, service_role;
grant execute on function public.e_membro()   to authenticated, service_role;
grant execute on function public.tem_cargo()  to authenticated, service_role;

-- 3. PATRIMÔNIO E ATAS PASSAM A EXIGIR APROVAÇÃO (SEC-10) ---------------------
--
-- Troca o `exists` copiado de 003 pela chamada a tem_cargo(), que desde a 014
-- exige `aprovado`. Passa a existir UM lugar onde "ter cargo" é definido —
-- que era o motivo de a função ter sido criada na 008.
drop policy if exists "patrimonio: select com cargo" on public.patrimonio;
create policy "patrimonio: select com cargo"
  on public.patrimonio for select to authenticated using (public.tem_cargo());

drop policy if exists "patrimonio: insert com cargo" on public.patrimonio;
create policy "patrimonio: insert com cargo"
  on public.patrimonio for insert to authenticated with check (public.tem_cargo());

drop policy if exists "patrimonio: update com cargo" on public.patrimonio;
create policy "patrimonio: update com cargo"
  on public.patrimonio for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

drop policy if exists "atas: select com cargo" on public.atas;
create policy "atas: select com cargo"
  on public.atas for select to authenticated using (public.tem_cargo());

drop policy if exists "atas: insert com cargo" on public.atas;
create policy "atas: insert com cargo"
  on public.atas for insert to authenticated with check (public.tem_cargo());

drop policy if exists "atas: update com cargo" on public.atas;
create policy "atas: update com cargo"
  on public.atas for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

-- Continua sem policy de DELETE nas duas, como em 003. Baixa de bem é
-- status = 'Baixado'; ata não se apaga.

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. os quatro triggers de autoria existem (esperado: 4 linhas)
--   select event_object_table, trigger_name
--     from information_schema.triggers
--    where trigger_name in ('avisos_carimbar_autor', 'eventos_carimbar_criador',
--                           'atas_carimbar_registrador', 'sprints_carimbar_atualizador')
--    order by 1;
--
--   -- 2. anon não executa mais os predicados (esperado: 3 linhas, todas f)
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute') as anon_executa
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('e_diretoria', 'e_membro', 'tem_cargo')
--    order by 1;
--
--   -- 3. authenticated CONTINUA executando (esperado: 3 linhas, todas t)
--   --    Se der f, a área de membros para. Refaça o grant da seção 2.
--   select p.proname,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth_executa
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('e_diretoria', 'e_membro', 'tem_cargo')
--    order by 1;
--
--   -- 4. nenhuma policy de patrimonio/atas com o exists antigo (esperado: 0)
--   select tablename, policyname from pg_policies
--    where schemaname = 'public' and tablename in ('patrimonio', 'atas')
--      and coalesce(qual, with_check) like '%p.cargo is not null%';
--
-- TESTE DE REGRESSÃO — com sessão de membro com cargo, pelo PostgREST:
--   POST /rest/v1/avisos  {"titulo":"t","conteudo":"c","autor_id":"<outro-uuid>"}
--   → grava, mas a linha volta com autor_id = SEU id. Antes voltava com o outro.
-- =============================================================================
