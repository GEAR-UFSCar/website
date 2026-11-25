-- =============================================================================
-- GEAR — volta para três trilhas
-- Rodar no SQL Editor, DEPOIS de 044_organizacao_fase3.sql. Pode rodar mais de
-- uma vez. Não apaga dado.
--
-- Decisão de 25/11/2026: a trilha continua se chamando "Projetos" e não existe
-- "Extensão". Desfaz só a parte 1 da 042 (o resto dela fica): "Desenvolvimento
-- e Projetos" volta a ser "Projetos" nos dados e em todo CHECK, e os cargos de
-- diretor/vice de Extensão somem da lista.
--
-- Se alguém já tiver usado Extensão, para sem mexer em nada: aí é uma pessoa
-- que decide para onde vai cada registro, não a migração.
-- =============================================================================

create or replace function public.trilha_do_cargo(cargo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select (regexp_match(cargo, '^(?:Vice-diretor|Diretor) de (Competição|Pesquisa|Projetos)$'))[1];
$$;

-- Mesmo caminho da 042, ao contrário: derruba os CHECKs, traduz os dados com os
-- gatilhos de usuário desligados (é renomeação, não edição) e recria cada um.
do $$
declare
  c record;
  alvos jsonb := '[]'::jsonb;
  def text;
  col text;
  usados bigint;
begin
  for c in
    select con.conname, con.conrelid::regclass::text as tabela, pg_get_constraintdef(con.oid) as def,
           array(select a.attname::text from pg_attribute a
                  where a.attrelid = con.conrelid and a.attnum = any (con.conkey)) as cols
      from pg_constraint con
      join pg_namespace n on n.oid = con.connamespace
     where n.nspname = 'public' and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ~ 'Extensão'
  loop
    foreach col in array c.cols loop
      execute format('select count(*) from %s where %I ~ ''Extensão''', c.tabela, col) into usados;
      if usados > 0 then
        raise exception '%.% tem % registro(s) com Extensão. Decida para onde vão antes de rodar a 045.', c.tabela, col, usados;
      end if;
    end loop;
    alvos := alvos || jsonb_build_object('nome', c.conname, 'tabela', c.tabela, 'def', c.def, 'cols', to_jsonb(c.cols));
  end loop;

  for c in select * from jsonb_to_recordset(alvos) as x(nome text, tabela text, def text, cols jsonb) loop
    execute format('alter table %s drop constraint %I', c.tabela, c.nome);
  end loop;

  for c in select * from jsonb_to_recordset(alvos) as x(nome text, tabela text, def text, cols jsonb) loop
    execute format('alter table %s disable trigger user', c.tabela);
    for col in select jsonb_array_elements_text(c.cols) loop
      execute format(
        'update %s set %I = replace(%I, ''Desenvolvimento e Projetos'', ''Projetos'')
          where %I in (''Desenvolvimento e Projetos'', ''Diretor de Desenvolvimento e Projetos'', ''Vice-diretor de Desenvolvimento e Projetos'')',
        c.tabela, col, col, col);
    end loop;
    execute format('alter table %s enable trigger user', c.tabela);
  end loop;

  for c in select * from jsonb_to_recordset(alvos) as x(nome text, tabela text, def text, cols jsonb) loop
    def := replace(c.def, '''Desenvolvimento e Projetos''::text, ''Extensão''::text', '''Projetos''::text');
    def := replace(def, '''Diretor de Desenvolvimento e Projetos''::text, ''Diretor de Extensão''::text', '''Diretor de Projetos''::text');
    def := replace(def, '''Vice-diretor de Desenvolvimento e Projetos''::text, ''Vice-diretor de Extensão''::text', '''Vice-diretor de Projetos''::text');
    execute format('alter table %s add constraint %I %s', c.tabela, c.nome, def);
  end loop;
end;
$$;

-- Página 00: a lista de trilhas que a 042 escreveu.
update public.artigos
   set conteudo = replace(conteudo, 'Competições, Pesquisa, Desenvolvimento e Projetos ou Extensão', 'Competições, Pesquisa ou Projetos')
 where slug = 'como-funciona'
   and conteudo like '%Desenvolvimento e Projetos ou Extensão%';
