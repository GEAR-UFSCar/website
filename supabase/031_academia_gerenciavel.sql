-- =============================================================================
-- GEAR — Academia gerenciável pelo site
-- Rodar no SQL Editor, DEPOIS de 030_apagar_atas_e_documentos.sql. Pode rodar
-- mais de uma vez.
--
-- Até aqui `modulos` não tinha política de escrita (002): criar módulo, trocar
-- link de material ou preencher prazo exigia o SQL Editor. E `progresso` só era
-- lido pelo dono, então a gestão não tinha como saber quem está parado.
--
--   · quem tem cargo cria e corrige módulo (mesma regra de atas);
--   · só a diretoria apaga: apagar módulo apaga em cascata o progresso de todos
--     nele (FK da 002), então é o mesmo peso de apagar ata;
--   · quem tem cargo lê o progresso de todos. Escrita continua só do dono.
-- =============================================================================

-- 1. LIMITES -----------------------------------------------------------------
-- Mesmo espírito da 015: o banco recusa o que a tela também recusa. Em produção
-- o maior título tem 87 caracteres e nenhum link foge de http/https.
alter table public.modulos drop constraint if exists modulos_titulo_tamanho;
alter table public.modulos add constraint modulos_titulo_tamanho
  check (char_length(titulo) between 1 and 200);

alter table public.modulos drop constraint if exists modulos_descricao_tamanho;
alter table public.modulos add constraint modulos_descricao_tamanho
  check (descricao is null or char_length(descricao) <= 2000);

-- só http/https: `javascript:` num href é XSS de um clique
alter table public.modulos drop constraint if exists modulos_conteudo_url_formato;
alter table public.modulos add constraint modulos_conteudo_url_formato
  check (conteudo_url is null or (conteudo_url ~* '^https?://' and char_length(conteudo_url) <= 2000));

alter table public.modulos drop constraint if exists modulos_ordem_positiva;
alter table public.modulos add constraint modulos_ordem_positiva check (ordem > 0);

-- 2. ESCRITA EM MODULOS ------------------------------------------------------
drop policy if exists "modulos: cargo cria" on public.modulos;
create policy "modulos: cargo cria"
  on public.modulos for insert to authenticated
  with check (public.tem_cargo());

drop policy if exists "modulos: cargo corrige" on public.modulos;
create policy "modulos: cargo corrige"
  on public.modulos for update to authenticated
  using (public.tem_cargo())
  with check (public.tem_cargo());

drop policy if exists "modulos: delete da diretoria" on public.modulos;
create policy "modulos: delete da diretoria"
  on public.modulos for delete to authenticated
  using (public.e_diretoria());

-- 3. GESTÃO LÊ O PROGRESSO ---------------------------------------------------
-- Política somada à "ler o próprio": SELECT passa se qualquer uma passar.
drop policy if exists "progresso: cargo lê todos" on public.progresso;
create policy "progresso: cargo lê todos"
  on public.progresso for select to authenticated
  using (public.tem_cargo());
