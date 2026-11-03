-- =============================================================================
-- GEAR — vice-diretores das trilhas
-- Rodar no SQL Editor, DEPOIS de 035_documentacao_integrada.sql. Pode rodar
-- mais de uma vez. Só amplia a lista de cargos; não apaga nem muda dado.
--
-- Em nov/2026 a Presidência definiu diretor e vice para cada trilha
-- (Competição, Pesquisa e Projetos). Os diretores já existiam no CHECK de
-- perfis.cargo; esta migração acrescenta os três vices. Os cargos antigos
-- continuam aceitos para não invalidar nenhuma linha existente.
--
-- O vice não ganha permissão nova: como qualquer cargo, conta em tem_cargo()
-- (aprovar registro de outra pessoa, ver o que é restrito). Escrever em sprint
-- da própria frente segue a regra de pode_editar_sprint() para quem tem cargo.
-- =============================================================================

alter table public.perfis drop constraint if exists perfis_cargo_check;
alter table public.perfis add constraint perfis_cargo_check
  check (cargo in ('Presidente', 'Vice-Presidente',
                   'Diretor de Competição', 'Diretor de Pesquisa', 'Diretor de Projetos',
                   'Vice-diretor de Competição', 'Vice-diretor de Pesquisa', 'Vice-diretor de Projetos',
                   'Tesouraria', 'Comunicação',
                   'Coordenação Técnica', 'Administração', 'Marketing', 'Documentação',
                   'Operações e Patrimônio'));
