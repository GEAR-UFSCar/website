-- =============================================================================
-- GEAR — apagar atas e documentos (só diretoria)
-- Rodar no SQL Editor, DEPOIS de 029_inventario.sql. Pode rodar mais de uma vez.
--
-- Até aqui atas e documentos não tinham policy de DELETE: registro oficial se
-- corrige, não some. Na prática isso deixava lixo de teste e cadastro duplicado
-- sem saída. Fica liberado, mas só para a diretoria; quem tem cargo continua
-- criando e corrigindo.
--
-- O arquivo no bucket `documentos` NÃO é apagado junto: sem a linha ele deixa
-- de aparecer no site e de ser público (documento_e_publico consulta a tabela).
-- Limpar o bucket, se precisar, é pelo painel (Storage).
-- =============================================================================

drop policy if exists "atas: delete da diretoria" on public.atas;
create policy "atas: delete da diretoria"
  on public.atas for delete to authenticated
  using (public.e_diretoria());

drop policy if exists "documentos: delete da diretoria" on public.documentos;
create policy "documentos: delete da diretoria"
  on public.documentos for delete to authenticated
  using (public.e_diretoria());
