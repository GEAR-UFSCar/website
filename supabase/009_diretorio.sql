-- =============================================================================
-- GEAR — leitura de perfis para o diretório de membros
-- Rodar no SQL Editor, DEPOIS de 004_cargos.sql.
--
-- POR QUE ISTO É NECESSÁRIO
-- 001 deu SELECT em `perfis` só para a própria linha; 004 abriu para a
-- diretoria. Com essas duas, /membros/diretorio mostraria um card só — o de
-- quem abriu a página. O diretório existe para os membros se encontrarem,
-- então a leitura precisa ser de todos para todos.
--
-- O QUE ISTO EXPÕE
-- Nome, curso, trilha, cargo, created_at e as colunas de auditoria de cargo,
-- para qualquer membro autenticado. NÃO expõe e-mail: e-mail vive em
-- auth.users, que continua fora do alcance — `perfis` nunca teve essa coluna.
-- A escrita não muda em nada: continua valendo "editar o próprio" (001), o
-- trigger guardar_cargo (004) e a exclusividade da diretoria sobre cargo.
-- =============================================================================

drop policy if exists "perfis: membros leem todos" on public.perfis;
create policy "perfis: membros leem todos"
  on public.perfis for select
  to authenticated
  using (true);

-- "perfis: diretoria lê todos" (004) fica redundante: políticas permissivas se
-- somam com OR, e a de cima já cobre todo mundo. Mantida de propósito — se um
-- dia o diretório for restringido, basta apagar a política acima e o acesso da
-- diretoria volta a funcionar sozinho, sem precisar reescrever 004.

-- Conferência: esperado 3 políticas de SELECT em perfis.
-- select policyname, cmd from pg_policies
--  where tablename = 'perfis' and cmd = 'SELECT' order by policyname;
