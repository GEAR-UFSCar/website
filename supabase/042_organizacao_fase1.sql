-- =============================================================================
-- GEAR — organização interna, fase 1
-- Rodar no SQL Editor, DEPOIS de 041_frente_pelo_cargo.sql. Pode rodar mais de
-- uma vez. Não apaga dado: renomeia uma trilha e troca `feita` por `estado`.
--
-- Princípio: ninguém espera outra pessoa para começar. A revisão acontece no
-- FIM do trabalho. As regras abaixo moram no banco para valerem fora da tela:
--
--   1. Quatro trilhas: Projetos vira "Desenvolvimento e Projetos" e entra
--      Extensão (com diretor e vice). Todo CHECK que listava as três é refeito.
--   2. Perfil ganha nível de formação, áreas de interesse e `ativo`. Revisor =
--      membro ativo com formação Principal ou Avançada (e_revisor()). Nível e
--      `ativo` só a diretoria (Presidente/Vice) muda.
--   3. Sprint é o "projeto" da interface e ganha o documento de interfaces,
--      que o time inteiro do projeto edita.
--   4. Tarefa (sprint_tarefas): projeto opcional, responsável único, estados
--      Aberta → Em andamento → Em revisão → Ajustes/Concluída, "Pronto
--      quando…" obrigatório ao criar, evidência obrigatória para enviar à
--      revisão, ninguém revisa o próprio trabalho. Estado só muda pelas funções
--      enviar_tarefa_para_revisao() e revisar_tarefa(). `feita` continua
--      existindo, gerada a partir do estado, para quem só lê.
--   5. Evento ganha `escopo` (Interno/Externo). `tipo` já existia e é outra coisa.
--   6. `artigos` em Markdown. O artigo de slug 'como-funciona' é a página 00,
--      que só quem tem cargo edita; os sem slug são a base de conhecimento.
--
-- Códigos de erro novos (lib/erros.ts traduz): GE010 sem "Pronto quando",
-- GE011 sem evidência, GE012 revisar o próprio trabalho, GE013 estado mudou,
-- GE014 não é revisor, GE015 pedir ajustes sem comentário.
-- =============================================================================

-- 1. QUATRO TRILHAS ------------------------------------------------------------
create or replace function public.trilha_do_cargo(cargo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select (regexp_match(cargo, '^(?:Vice-diretor|Diretor) de (Competição|Pesquisa|Desenvolvimento e Projetos|Extensão)$'))[1];
$$;

-- Acha todo CHECK de public que lista 'Projetos' (trilha) ou o cargo de
-- diretor/vice de Projetos, derruba todos, traduz os dados e recria cada um com
-- as quatro trilhas. Derrubar todos ANTES de traduzir importa: perfis tem um
-- CHECK no cargo e outro na frente, e um não pode barrar o outro no meio.
-- Gatilhos de usuário ficam desligados durante a tradução para não carimbar
-- autor nulo nem mexer em updated_at: é renomeação, não edição.
do $$
declare
  c record;
  alvos jsonb := '[]'::jsonb;
  def text;
  col text;
begin
  for c in
    select con.conname, con.conrelid::regclass::text as tabela, pg_get_constraintdef(con.oid) as def,
           array(select a.attname::text from pg_attribute a
                  where a.attrelid = con.conrelid and a.attnum = any (con.conkey)) as cols
      from pg_constraint con
      join pg_namespace n on n.oid = con.connamespace
     where n.nspname = 'public' and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ~ '''(Vice-diretor de |Diretor de )?Projetos'''
  loop
    alvos := alvos || jsonb_build_object('nome', c.conname, 'tabela', c.tabela, 'def', c.def, 'cols', to_jsonb(c.cols));
    execute format('alter table %s drop constraint %I', c.tabela, c.conname);
  end loop;

  for c in select * from jsonb_to_recordset(alvos) as x(nome text, tabela text, def text, cols jsonb) loop
    execute format('alter table %s disable trigger user', c.tabela);
    for col in select jsonb_array_elements_text(c.cols) loop
      execute format(
        'update %s set %I = replace(%I, ''Projetos'', ''Desenvolvimento e Projetos'')
          where %I in (''Projetos'', ''Diretor de Projetos'', ''Vice-diretor de Projetos'')',
        c.tabela, col, col, col);
    end loop;
    execute format('alter table %s enable trigger user', c.tabela);
  end loop;

  for c in select * from jsonb_to_recordset(alvos) as x(nome text, tabela text, def text, cols jsonb) loop
    def := replace(c.def, '''Projetos''::text', '''Desenvolvimento e Projetos''::text, ''Extensão''::text');
    def := replace(def, '''Diretor de Projetos''::text', '''Diretor de Desenvolvimento e Projetos''::text, ''Diretor de Extensão''::text');
    def := replace(def, '''Vice-diretor de Projetos''::text', '''Vice-diretor de Desenvolvimento e Projetos''::text, ''Vice-diretor de Extensão''::text');
    execute format('alter table %s add constraint %I %s', c.tabela, c.nome, def);
  end loop;
end;
$$;

-- 2. PERFIL: FORMAÇÃO, INTERESSES, ATIVO ---------------------------------------
alter table public.perfis
  add column if not exists nivel_formacao text not null default 'Fundamental'
    check (nivel_formacao in ('Fundamental', 'Principal', 'Avançada')),
  add column if not exists areas_interesse text[] not null default '{}'
    check (cardinality(areas_interesse) <= 12),
  add column if not exists ativo boolean not null default true;

create or replace function public.guardar_formacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.nivel_formacao := 'Fundamental';
    new.ativo := true;
  elsif (new.nivel_formacao, new.ativo) is distinct from (old.nivel_formacao, old.ativo)
        and not public.e_diretoria() then
    raise exception 'Nível de formação e situação (ativo) são definidos pela diretoria.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.guardar_formacao() from public, anon, authenticated;
drop trigger if exists perfis_guardar_formacao on public.perfis;
create trigger perfis_guardar_formacao
  before insert or update on public.perfis
  for each row execute function public.guardar_formacao();

-- security definer pelo mesmo motivo de e_membro() (014): lê perfis sem depender
-- da RLS de perfis, que por sua vez chama predicados.
create or replace function public.e_revisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
     where p.id = (select auth.uid())
       and p.aprovado and p.ativo
       and p.nivel_formacao in ('Principal', 'Avançada')
  );
$$;
revoke execute on function public.e_revisor() from public, anon;
grant  execute on function public.e_revisor() to authenticated, service_role;

-- 3. PROJETO: DOCUMENTO DE INTERFACES ------------------------------------------
alter table public.sprints
  add column if not exists documento_interfaces text
    check (documento_interfaces is null or char_length(documento_interfaces) <= 20000);

-- Igual à 040, com documento_interfaces entre as colunas que o participante muda:
-- o contrato entre subsistemas é do time, não só de quem tem cargo.
create or replace function public.guardar_andamento_sprint()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  livres constant text[] := array['progresso', 'proximo_passo', 'status', 'documento_interfaces', 'updated_at', 'atualizado_por'];
begin
  if (select auth.uid()) is null or public.pode_editar_sprint(old.id) then
    return new;
  end if;

  if (to_jsonb(new) - livres) is distinct from (to_jsonb(old) - livres) then
    raise exception 'Você pode atualizar progresso, próximo passo, status e o documento de interfaces. O resto do projeto é de quem tem cargo na trilha.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status and 'Concluído' in (new.status, old.status) then
    raise exception 'Concluir ou reabrir um projeto é de quem tem cargo na trilha.' using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke execute on function public.guardar_andamento_sprint() from public, anon, authenticated;

-- 4. TAREFAS -------------------------------------------------------------------
alter table public.sprint_tarefas
  alter column sprint_id drop not null,
  add column if not exists estado text not null default 'Aberta'
    check (estado in ('Aberta', 'Em andamento', 'Em revisão', 'Ajustes', 'Concluída')),
  add column if not exists pronto_quando text
    check (pronto_quando is null or char_length(pronto_quando) <= 1000),
  add column if not exists evidencia_url text
    check (evidencia_url is null or (evidencia_url ~* '^https?://' and char_length(evidencia_url) <= 2000)),
  add column if not exists revisor_id uuid references public.perfis (id) on delete set null,
  add column if not exists rodadas_ajustes integer not null default 0 check (rodadas_ajustes >= 0),
  add column if not exists comentario_revisao text
    check (comentario_revisao is null or char_length(comentario_revisao) <= 2000),
  add column if not exists enviada_revisao_em timestamptz,
  add column if not exists concluida_em timestamptz;

-- `feita` vira gerada. Só na primeira execução: depois disso ela já é gerada e
-- traduzir de novo reabriria tarefas em revisão.
do $$
begin
  if exists (select 1 from pg_attribute
              where attrelid = 'public.sprint_tarefas'::regclass and attname = 'feita' and attgenerated = '') then
    alter table public.sprint_tarefas disable trigger user;
    update public.sprint_tarefas
       set estado = case when feita then 'Concluída'
                         when responsavel_id is not null then 'Em andamento'
                         else 'Aberta' end;
    alter table public.sprint_tarefas enable trigger user;
    alter table public.sprint_tarefas drop column feita;
    alter table public.sprint_tarefas
      add column feita boolean generated always as (estado = 'Concluída') stored;
  end if;
end;
$$;
create index if not exists sprint_tarefas_responsavel_idx
  on public.sprint_tarefas (responsavel_id) where estado <> 'Concluída';
create index if not exists sprint_tarefas_revisao_idx
  on public.sprint_tarefas (enviada_revisao_em) where estado = 'Em revisão';

-- Quem edita a tarefa direto (título, prazo, responsável): quem a criou e quem
-- edita o projeto. Sem projeto, pode_editar_sprint(null) é só a diretoria.
create or replace function public.pode_editar_tarefa(sprint uuid, autor uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.e_membro()
     and (autor = (select auth.uid()) or public.pode_editar_sprint(sprint));
$$;
revoke execute on function public.pode_editar_tarefa(uuid, uuid) from public, anon;
grant  execute on function public.pode_editar_tarefa(uuid, uuid) to authenticated, service_role;

drop policy if exists "sprint_tarefas: quem edita ou participa cria" on public.sprint_tarefas;
drop policy if exists "sprint_tarefas: quem edita o sprint apaga" on public.sprint_tarefas;
drop policy if exists "sprint_tarefas: editar" on public.sprint_tarefas;
drop policy if exists "sprint_tarefas: criar" on public.sprint_tarefas;
drop policy if exists "sprint_tarefas: apagar" on public.sprint_tarefas;

-- Sem projeto, qualquer membro aprovado cria (é uma pauta aberta); com projeto,
-- quem edita ou participa dele (040).
create policy "sprint_tarefas: criar" on public.sprint_tarefas
  for insert to authenticated
  with check (public.e_membro()
              and (sprint_id is null or public.pode_editar_sprint(sprint_id) or public.participa_do_sprint(sprint_id)));
-- O WITH CHECK repete a regra de criar: sem isso, quem criou uma pauta sem
-- projeto a moveria para o projeto de outra trilha, onde não pode criar tarefa.
create policy "sprint_tarefas: editar" on public.sprint_tarefas
  for update to authenticated
  using (public.pode_editar_tarefa(sprint_id, criado_por))
  with check (public.pode_editar_tarefa(sprint_id, criado_por)
              and (sprint_id is null or public.pode_editar_sprint(sprint_id) or public.participa_do_sprint(sprint_id)));
create policy "sprint_tarefas: apagar" on public.sprint_tarefas
  for delete to authenticated
  using (public.pode_editar_tarefa(sprint_id, criado_por));

create or replace function public.preparar_tarefa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(new.pronto_quando, '')), '') is null then
    raise exception 'Toda tarefa nasce dizendo quando fica pronta ("Pronto quando…").' using errcode = 'GE010';
  end if;
  new.pronto_quando := btrim(new.pronto_quando);
  -- estado inicial vem do responsável; sem sessão (SQL Editor, seed) só se veio o padrão
  if (select auth.uid()) is not null or new.estado = 'Aberta' then
    new.estado := case when new.responsavel_id is null then 'Aberta' else 'Em andamento' end;
  end if;
  if (select auth.uid()) is not null then
    new.evidencia_url      := null;
    new.revisor_id         := null;
    new.rodadas_ajustes    := 0;
    new.comentario_revisao := null;
    new.enviada_revisao_em := null;
    new.concluida_em       := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.preparar_tarefa() from public, anon, authenticated;
drop trigger if exists preparar_tarefa on public.sprint_tarefas;
create trigger preparar_tarefa before insert on public.sprint_tarefas
  for each row execute function public.preparar_tarefa();

-- Edição direta não toca no fluxo. As funções de fluxo ligam `gear.fluxo_tarefa`
-- só dentro da própria transação; a API não tem como ligar esse ajuste.
create or replace function public.guardar_tarefa()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  fluxo constant text[] := array['estado', 'evidencia_url', 'revisor_id', 'rodadas_ajustes',
                                 'comentario_revisao', 'enviada_revisao_em', 'concluida_em'];
  -- `feita` fica de fora: é gerada e vale NULL em gatilho BEFORE.
  c text;
begin
  if (select auth.uid()) is null or current_setting('gear.fluxo_tarefa', true) = 'on' then
    return new;
  end if;

  foreach c in array fluxo loop
    if to_jsonb(new) -> c is distinct from to_jsonb(old) -> c then
      raise exception 'O estado da tarefa muda pelos botões (assumir, enviar para revisão, revisar).' using errcode = 'GE013';
    end if;
  end loop;

  if (new.criado_por, new.created_at) is distinct from (old.criado_por, old.created_at) then
    raise exception 'Autoria da tarefa não muda.' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(new.pronto_quando, '')), '') is null and old.pronto_quando is not null then
    raise exception '"Pronto quando…" não pode ficar vazio.' using errcode = 'GE010';
  end if;

  -- responsável único: trocar o dono reinicia o andamento
  if new.responsavel_id is distinct from old.responsavel_id then
    if old.estado in ('Em revisão', 'Concluída') then
      raise exception 'Tarefa em revisão ou concluída não troca de responsável.' using errcode = 'GE013';
    end if;
    new.estado := case when new.responsavel_id is null then 'Aberta' else 'Em andamento' end;
  end if;

  return new;
end;
$$;
revoke execute on function public.guardar_tarefa() from public, anon, authenticated;
drop trigger if exists guardar_tarefa on public.sprint_tarefas;
create trigger guardar_tarefa before update on public.sprint_tarefas
  for each row execute function public.guardar_tarefa();

create or replace function public.enviar_tarefa_para_revisao(tarefa uuid, evidencia text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  link text := btrim(coalesce(evidencia, ''));
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not found or not public.e_membro() or t.responsavel_id is distinct from (select auth.uid()) then
    raise exception 'Só o responsável envia a tarefa para revisão.' using errcode = '42501';
  end if;
  if t.estado not in ('Em andamento', 'Ajustes') then
    raise exception 'A tarefa está em "%" e não pode ir para revisão agora.', t.estado using errcode = 'GE013';
  end if;
  if link !~* '^https?://\S+$' or char_length(link) > 2000 then
    raise exception 'Evidência é obrigatória: um link de repositório, vídeo ou relatório.' using errcode = 'GE011';
  end if;

  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas
     set estado = 'Em revisão', evidencia_url = link, enviada_revisao_em = now(), revisor_id = null
   where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.enviar_tarefa_para_revisao(uuid, text) from public, anon;
grant  execute on function public.enviar_tarefa_para_revisao(uuid, text) to authenticated, service_role;

create or replace function public.revisar_tarefa(tarefa uuid, aprovar boolean, comentario text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.sprint_tarefas;
  nota text := nullif(btrim(coalesce(comentario, '')), '');
begin
  select * into t from public.sprint_tarefas where id = tarefa for update;
  if not public.e_revisor() then
    raise exception 'Revisar é de quem tem formação Principal ou Avançada.' using errcode = 'GE014';
  end if;
  if not found or t.estado <> 'Em revisão' then
    raise exception 'Esta tarefa não está em revisão.' using errcode = 'GE013';
  end if;
  if t.responsavel_id = (select auth.uid()) then
    raise exception 'Ninguém revisa o próprio trabalho.' using errcode = 'GE012';
  end if;
  if not aprovar and nota is null then
    raise exception 'Pedir ajustes exige dizer o que ajustar.' using errcode = 'GE015';
  end if;
  if char_length(nota) > 2000 then
    raise exception 'Comentário longo demais.' using errcode = '22001';
  end if;

  perform set_config('gear.fluxo_tarefa', 'on', true);
  update public.sprint_tarefas
     set estado             = case when aprovar then 'Concluída' else 'Ajustes' end,
         revisor_id         = (select auth.uid()),
         comentario_revisao = nota,
         rodadas_ajustes    = rodadas_ajustes + case when aprovar then 0 else 1 end,
         concluida_em       = case when aprovar then now() end
   where id = tarefa;
  perform set_config('gear.fluxo_tarefa', '', true);
end;
$$;
revoke execute on function public.revisar_tarefa(uuid, boolean, text) from public, anon;
grant  execute on function public.revisar_tarefa(uuid, boolean, text) to authenticated, service_role;

-- 5. EVENTO INTERNO OU EXTERNO -------------------------------------------------
alter table public.eventos
  add column if not exists escopo text not null default 'Interno'
    check (escopo in ('Interno', 'Externo'));

-- 6. ARTIGOS (PÁGINA 00 E BASE DE CONHECIMENTO) --------------------------------
create table if not exists public.artigos (
  id                 uuid primary key default gen_random_uuid(),
  -- slug só nos artigos fixos do site (página 00); a base de conhecimento usa id
  slug               text unique check (slug is null or slug ~ '^[a-z0-9-]{1,60}$'),
  titulo             text not null check (char_length(titulo) between 1 and 200),
  area               text check (area is null or char_length(area) <= 60),
  conteudo           text not null default '' check (char_length(conteudo) <= 50000),
  nasceu_de_pergunta boolean not null default false,
  autor_id           uuid default auth.uid() references public.perfis (id) on delete set null,
  atualizado_por     uuid references public.perfis (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.artigos enable row level security;

drop policy if exists "artigos: membro lê" on public.artigos;
create policy "artigos: membro lê" on public.artigos
  for select to authenticated using (public.e_membro());
-- Base de conhecimento é de todos; artigo fixo (slug) é de quem tem cargo.
drop policy if exists "artigos: criar" on public.artigos;
create policy "artigos: criar" on public.artigos
  for insert to authenticated
  with check (public.e_membro() and (slug is null or public.tem_cargo()));
drop policy if exists "artigos: editar" on public.artigos;
create policy "artigos: editar" on public.artigos
  for update to authenticated
  using (public.e_membro() and (slug is null or public.tem_cargo()))
  with check (public.e_membro() and (slug is null or public.tem_cargo()));
drop policy if exists "artigos: apagar" on public.artigos;
create policy "artigos: apagar" on public.artigos
  for delete to authenticated
  using ((slug is null and autor_id = (select auth.uid())) or public.tem_cargo());

drop trigger if exists carimbar_autor on public.artigos;
create trigger carimbar_autor before insert on public.artigos
  for each row execute function public.carimbar_autor('autor_id');

create or replace function public.tocar_artigo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.atualizado_por := coalesce((select auth.uid()), new.atualizado_por);
  if tg_op = 'UPDATE' then
    new.autor_id := old.autor_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.tocar_artigo() from public, anon, authenticated;
drop trigger if exists tocar_artigo on public.artigos;
create trigger tocar_artigo before insert or update on public.artigos
  for each row execute function public.tocar_artigo();

insert into public.artigos (slug, titulo, area, conteudo) values (
  'como-funciona',
  'Como funciona a GEAR',
  'Geral',
  $md$Ninguém na GEAR fica parado esperando outra pessoa. Você escolhe a própria tarefa, sabe quando ela está pronta ("Pronto quando…"), acha como fazer na base de conhecimento, pega o material sozinho e decide o que é seu. A revisão acontece no **fim** do trabalho, nunca como permissão para começar.

## Como se entra

1. **Processo Seletivo**
2. **Bootcamp**
3. **Academia GEAR**: competências comprovadas com evidência
4. **Projeto de Validação**
5. **Avaliação Técnica**: baseada nas competências aprovadas
6. **Escolha da Trilha**: Competições, Pesquisa, Desenvolvimento e Projetos ou Extensão

## Quem decide o quê

| Decide sozinho | Avisa, mas não espera | Precisa de aprovação |
|---|---|---|
| Como implementar a própria tarefa | Mudança que afeta outro subsistema | Gasto acima do limite |
| Qual biblioteca ou ferramenta usar | Troca de prazo | Inscrição em competição |
| Assumir uma pauta aberta | Mudança no repositório principal | Falar em nome da GEAR |
| Compras abaixo do limite | Retirada de equipamento caro | Parcerias e patrocínios |

## Regras que não se quebram

- Toda tarefa nasce com **"Pronto quando…"**. Enviar para revisão exige **evidência** (link).
- Uma tarefa tem **um único responsável**.
- **Ninguém revisa o próprio trabalho.** Revisa quem tem formação Principal ou Avançada.
- Pontos existem **só na Academia**, nunca em tarefa de projeto.
- Assumir tarefa, retirar material e gastar abaixo do limite **não pedem aprovação**.
$md$
) on conflict (slug) do nothing;
