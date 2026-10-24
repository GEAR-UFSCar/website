-- =============================================================================
-- GEAR — inventário: a planilha do grupo vira o cadastro de patrimônio
-- Rodar no SQL Editor, DEPOIS de 028_revisao_de_seguranca.sql.
-- Depende de 003 (cria `patrimonio`), 015 (limites de texto) e 019 (valor_estimado).
--
-- O grupo mantinha o inventário numa planilha (Inventario_GEAR: 66 itens, 9
-- categorias, 7.260 unidades somando as peças dos kits). A tabela `patrimonio`
-- da 003 nasceu enxuta — item, categoria, quantidade, status — e não tinha onde
-- guardar fabricante, modelo, part-number, estado de conservação nem a origem
-- do item. Esta migração dá a ela as colunas da planilha, para que o site seja
-- a fonte da verdade e a planilha passe a ser uma cópia exportável.
--
-- NÃO APAGA DADO. A tabela estava vazia em produção quando isto foi escrito;
-- ainda assim, o que existir é preservado (categorias antigas são traduzidas,
-- itens sem código recebem um).
--
-- O QUE MUDA
--
--   1. `trilha_vinculada` vira `frente_vinculada`. A 013 renomeou "trilha" para
--      "frente" em perfis, sprints e eventos e esqueceu `patrimonio`. O código
--      já pedia `frente_vinculada` (a tela de Patrimônio e o formulário), então
--      a página dava erro de coluna inexistente — que ninguém viu porque a
--      tabela estava vazia. Esta migração corrige o banco para ficar como o
--      código espera.
--
--   2. Colunas novas, todas as da planilha que faltavam:
--        codigo          GEAR-001…  é o que vai na etiqueta do item. Único,
--                        gerado sozinho quando não informado e IMUTÁVEL depois
--                        de gravado (etiqueta colada não muda por engano).
--        subcategoria, fabricante, modelo, part_number, descricao
--        datasheet_url   só http(s): o link é desenhado na tela, e um
--                        `javascript:` aqui seria um XSS gravado no banco.
--        estado          conservação: Novo, Seminovo, Usado, Com defeito, Em
--                        manutenção — as cinco opções da aba "Listas".
--        origem          de onde veio o item (GEAR, doação, empréstimo, nome de
--                        quem emprestou…). Texto livre: a lista da planilha
--                        mistura natureza e pessoa.
--
--   3. `categoria` troca as sete categorias da 003 pelas nove da planilha
--      (+ "Outros", para o que não couber). As antigas não tinham onde pôr
--      livros, módulos nem instrumentos de medição; a planilha é o vocabulário
--      que o grupo de fato usa.
--
--   `estado` e `status` NÃO são a mesma coisa. `estado` é a condição física do
--   item ("Usado"); `status` é onde ele está agora ("Disponível", "Emprestado").
--   "Em manutenção" existe nos dois porque a planilha mistura as duas ideias.
--
-- O QUE NÃO MUDA
--   · RLS: segue como na 016 — só quem tem cargo lê, cria e edita; ninguém apaga
--     (item que saiu vira status "Baixado").
--   · valor_patrimonio_atual() (023): soma quantidade × valor_estimado dos itens
--     não baixados. A planilha não traz preço, então `valor_estimado` fica
--     vazio e o valor do patrimônio continua R$ 0 até a diretoria estimar.
--     Isso é de propósito: preço inventado em indicador público é pior que zero.
--
-- Reexecutável: cada passo confere o que já existe.
-- =============================================================================

-- 1. TRILHA → FRENTE ---------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'patrimonio' and column_name = 'trilha_vinculada'
  ) then
    alter table public.patrimonio rename column trilha_vinculada to frente_vinculada;
  end if;
end;
$$;

comment on column public.patrimonio.frente_vinculada is
  'Frente que usa o item (Competição, Pesquisa, Projetos). Null = de uso geral.';

alter table public.patrimonio drop constraint if exists patrimonio_frente_check;
alter table public.patrimonio add constraint patrimonio_frente_check
  check (frente_vinculada is null or frente_vinculada in ('Competição', 'Pesquisa', 'Projetos')) not valid;

-- 2. COLUNAS DA PLANILHA -----------------------------------------------------
alter table public.patrimonio
  add column if not exists codigo         text,
  add column if not exists subcategoria   text,
  add column if not exists fabricante     text,
  add column if not exists modelo         text,
  add column if not exists part_number    text,
  add column if not exists descricao      text,
  add column if not exists datasheet_url  text,
  add column if not exists estado         text,
  add column if not exists origem         text;

comment on column public.patrimonio.codigo is
  'Código da etiqueta (GEAR-001…). Único e imutável depois de gravado; gerado quando não informado.';
comment on column public.patrimonio.estado is
  'Conservação do item: Novo, Seminovo, Usado, Com defeito, Em manutenção. Null = ainda não avaliado. Não é o status (onde o item está).';
comment on column public.patrimonio.origem is
  'De onde veio: GEAR, doação, empréstimo, nome de quem cedeu… Texto livre.';
comment on column public.patrimonio.datasheet_url is
  'Link http(s) para a folha de dados do componente.';

-- 3. CATEGORIAS DA PLANILHA --------------------------------------------------
-- Ordem obrigatória, como na 013: o CHECK antigo sai, os valores são
-- traduzidos, o CHECK novo entra. Invertido, o UPDATE esbarraria no CHECK que
-- ainda não conhece o valor novo.
alter table public.patrimonio drop constraint if exists patrimonio_categoria_check;

update public.patrimonio set categoria = case categoria
    when 'Robô'                       then 'Robôs e kits robóticos'
    when 'Componente Eletrônico'      then 'Componentes eletrônicos'
    when 'Ferramenta'                 then 'Ferramentas'
    when 'Consumível'                 then 'Materiais'
    when 'Equipamento de Informática' then 'Outros'
    when 'Mecânica/Estrutura'         then 'Outros'
    when 'Outro'                      then 'Outros'
    else categoria
  end
 where categoria in ('Robô', 'Componente Eletrônico', 'Ferramenta', 'Consumível',
                     'Equipamento de Informática', 'Mecânica/Estrutura', 'Outro');

alter table public.patrimonio add constraint patrimonio_categoria_check
  check (categoria in (
    'Componentes eletromecânicos', 'Componentes eletrônicos', 'Ferramentas',
    'Instrumentos de medição e teste', 'Livro', 'Materiais', 'Módulos eletrônicos',
    'Placas de desenvolvimento', 'Robôs e kits robóticos', 'Outros'));

comment on column public.patrimonio.categoria is
  'Lista fechada, espelhada em CATEGORIAS (lib/inventario.ts). As nove da planilha do grupo + Outros.';

-- 4. CÓDIGO: GERADO, ÚNICO E IMUTÁVEL ----------------------------------------
-- Itens que já existiam sem código recebem um, na ordem de cadastro, depois do
-- maior número já usado. Em banco vazio, não faz nada.
with numerados as (
  select id,
         row_number() over (order by created_at, id)
           + coalesce((select max(substring(codigo from '[0-9]+$')::bigint)
                         from public.patrimonio where codigo ~ '^GEAR-[0-9]+$'), 0) as n
    from public.patrimonio
   where codigo is null
)
update public.patrimonio p
   set codigo = 'GEAR-' || lpad(numerados.n::text, 3, '0')
  from numerados
 where p.id = numerados.id;

alter table public.patrimonio alter column codigo set not null;

alter table public.patrimonio drop constraint if exists patrimonio_codigo_key;
alter table public.patrimonio add constraint patrimonio_codigo_key unique (codigo);

alter table public.patrimonio drop constraint if exists patrimonio_codigo_formato;
alter table public.patrimonio add constraint patrimonio_codigo_formato
  check (codigo ~ '^GEAR-[0-9]{3,6}$');

-- O gatilho BEFORE roda antes do NOT NULL, então um INSERT sem código ganha um
-- aqui e nunca chega a ser recusado por falta dele.
--
-- Sem sequência de propósito. Uma sequência anda sozinha, e quem importa a
-- planilha grava GEAR-001…066 à mão: o primeiro item digitado no formulário
-- depois disso receberia o código 1 e bateria no que já existe. O máximo + 1
-- respeita o que já está gravado, e a trava (advisory lock, que dura só até o
-- fim da transação) impede duas pessoas cadastrando ao mesmo tempo de receber
-- o mesmo número. Não é SECURITY DEFINER: quem insere precisa ter cargo, e quem
-- tem cargo já lê a tabela inteira.
create or replace function public.guardar_codigo_patrimonio()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  proximo bigint;
begin
  if tg_op = 'INSERT' then
    new.codigo := upper(btrim(coalesce(new.codigo, '')));
    if new.codigo = '' then
      perform pg_advisory_xact_lock(hashtext('patrimonio.codigo'));
      select coalesce(max(substring(p.codigo from '[0-9]+$')::bigint), 0) + 1
        into proximo
        from public.patrimonio p
       where p.codigo ~ '^GEAR-[0-9]+$';
      new.codigo := 'GEAR-' || lpad(proximo::text, 3, '0');
    end if;
  elsif old.codigo is not null and new.codigo is distinct from old.codigo then
    raise exception 'O código de um item é a etiqueta dele e não muda. Para corrigir, baixe o item e cadastre outro.'
      using errcode = 'GE003';
  end if;
  return new;
end;
$$;

revoke execute on function public.guardar_codigo_patrimonio() from public, anon, authenticated;

drop trigger if exists guardar_codigo_patrimonio on public.patrimonio;
create trigger guardar_codigo_patrimonio
  before insert or update on public.patrimonio
  for each row execute function public.guardar_codigo_patrimonio();

-- 5. ESTADO E LIMITES --------------------------------------------------------
alter table public.patrimonio drop constraint if exists patrimonio_estado_check;
alter table public.patrimonio add constraint patrimonio_estado_check
  check (estado is null or estado in ('Novo', 'Seminovo', 'Usado', 'Com defeito', 'Em manutenção'));

-- Só http(s), sem espaço: o link vira <a href> na tela.
alter table public.patrimonio drop constraint if exists patrimonio_datasheet_url_check;
alter table public.patrimonio add constraint patrimonio_datasheet_url_check
  check (datasheet_url is null or (length(datasheet_url) <= 2000 and datasheet_url ~* '^https?://[^[:space:]]+$'));

-- Mesmo critério da 015: o limite vale para escrita NOVA e não varre o que já
-- existe. As colunas novas poderiam ser validadas na hora (estão vazias), mas
-- `localizacao` e `responsavel_atual` já existiam sem limite.
alter table public.patrimonio drop constraint if exists patrimonio_campos_curtos_tam;
alter table public.patrimonio add constraint patrimonio_campos_curtos_tam check (
      (subcategoria      is null or length(subcategoria)      <= 120)
  and (fabricante        is null or length(fabricante)        <= 120)
  and (modelo            is null or length(modelo)            <= 200)
  and (part_number       is null or length(part_number)       <= 120)
  and (origem            is null or length(origem)            <= 80)
  and (localizacao       is null or length(localizacao)       <= 200)
  and (responsavel_atual is null or length(responsavel_atual) <= 150)
) not valid;

alter table public.patrimonio drop constraint if exists patrimonio_descricao_tam;
alter table public.patrimonio add constraint patrimonio_descricao_tam
  check (descricao is null or length(descricao) <= 5000);

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. a coluna se chama frente_vinculada (esperado: 1 linha; a antiga, 0)
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'patrimonio'
--      and column_name in ('frente_vinculada', 'trilha_vinculada');
--
--   -- 2. as nove colunas novas existem (esperado: 9 linhas)
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'patrimonio'
--      and column_name in ('codigo', 'subcategoria', 'fabricante', 'modelo',
--                          'part_number', 'descricao', 'datasheet_url', 'estado', 'origem');
--
--   -- 3. todo item tem código e nenhum se repete (esperado: 0 linhas)
--   select codigo, count(*) from public.patrimonio group by codigo having count(*) > 1;
--
--   -- 4. o gatilho do código existe (esperado: 1 linha, tgenabled = 'O')
--   select tgname, tgenabled from pg_trigger where tgname = 'guardar_codigo_patrimonio';
--
--   -- 5. nada de categoria fora da lista nova (esperado: 0 linhas)
--   select distinct categoria from public.patrimonio
--    where categoria not in ('Componentes eletromecânicos', 'Componentes eletrônicos', 'Ferramentas',
--      'Instrumentos de medição e teste', 'Livro', 'Materiais', 'Módulos eletrônicos',
--      'Placas de desenvolvimento', 'Robôs e kits robóticos', 'Outros');
--
-- REVERTER (só se preciso; perde o conteúdo das colunas novas):
--
--   drop trigger if exists guardar_codigo_patrimonio on public.patrimonio;
--   drop function if exists public.guardar_codigo_patrimonio();
--   alter table public.patrimonio
--     drop column codigo, drop column subcategoria, drop column fabricante,
--     drop column modelo, drop column part_number, drop column descricao,
--     drop column datasheet_url, drop column estado, drop column origem;
--   -- a categoria e o nome da coluna de frente NÃO voltam sozinhos: o site novo
--   -- depende de `frente_vinculada`, e o antigo nunca funcionou com ela.
-- =============================================================================
