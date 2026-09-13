-- =============================================================================
-- GEAR — teto de tamanho nos campos de texto livre
-- Rodar no SQL Editor, DEPOIS de 014_aprovacao_de_membros.sql.
--
-- Os CHECKs existentes cobrem os enums (categoria, status, tipo, cargo), mas
-- nenhuma coluna `text` livre tem limite. Um membro com cargo — ou uma
-- credencial comprometida — pode gravar megabytes num único aviso e inflar o
-- banco sem que nada recuse. É o achado SEC-05 da auditoria.
--
-- Os limites são folgados de propósito: o objetivo é impedir abuso, não
-- apertar quem escreve uma ata longa.
-- =============================================================================

-- Títulos e nomes: uma linha.
alter table public.avisos      add constraint avisos_titulo_tam      check (length(titulo) <= 200)      not valid;
alter table public.eventos     add constraint eventos_titulo_tam     check (length(titulo) <= 200)      not valid;
alter table public.sprints     add constraint sprints_titulo_tam     check (length(titulo) <= 200)      not valid;
alter table public.documentos  add constraint documentos_titulo_tam  check (length(titulo) <= 200)      not valid;
alter table public.patrimonio  add constraint patrimonio_item_tam    check (length(item) <= 200)        not valid;

-- Corpo de texto: o suficiente para uma ata detalhada (~10 páginas).
alter table public.avisos   add constraint avisos_conteudo_tam    check (length(conteudo) <= 20000)   not valid;
alter table public.sprints  add constraint sprints_descricao_tam  check (length(descricao) <= 20000)  not valid;
alter table public.eventos  add constraint eventos_descricao_tam  check (descricao is null or length(descricao) <= 20000) not valid;

alter table public.atas add constraint atas_presentes_tam  check (length(presentes) <= 5000)  not valid;
alter table public.atas add constraint atas_pauta_tam      check (length(pauta) <= 20000)     not valid;
alter table public.atas add constraint atas_decisoes_tam   check (length(decisoes) <= 20000)  not valid;
alter table public.atas add constraint atas_pendencias_tam check (pendencias is null or length(pendencias) <= 20000) not valid;

alter table public.patrimonio add constraint patrimonio_obs_tam
  check (observacoes is null or length(observacoes) <= 5000) not valid;

-- Campos curtos de identificação.
alter table public.perfis add constraint perfis_nome_tam  check (nome_completo is null or length(nome_completo) <= 150) not valid;
alter table public.perfis add constraint perfis_curso_tam check (curso is null or length(curso) <= 150) not valid;

/*
 * `not valid` de propósito: a restrição vale para toda escrita NOVA sem
 * varrer as linhas existentes, então a migração não trava a tabela nem falha
 * por causa de um registro antigo fora do limite. Para validar o histórico
 * depois, com calma:
 *
 *   alter table public.avisos validate constraint avisos_conteudo_tam;
 *
 * Conferência — esperado: todas as linhas com convalidated = false:
 *   select conrelid::regclass as tabela, conname, convalidated
 *     from pg_constraint where conname like '%_tam' order by 1, 2;
 */
