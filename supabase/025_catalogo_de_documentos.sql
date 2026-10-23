-- =============================================================================
-- GEAR — catálogo de documentos: biblioteca de membros e vitrine pública
-- Rodar no SQL Editor, DEPOIS de 024_diretoria_minima_e_limites_do_bucket.sql.
-- Depende de 006 (tabela e bucket), 014 (e_membro) e 023 (tem_cargo nas escritas).
--
-- A 006 criou `documentos` como uma lista plana de sete títulos. A documentação
-- institucional passou de cinquenta documentos em oito pacotes, e a lista plana
-- não responde às duas perguntas que importam: "qual documento eu uso agora?"
-- (resumo, quando usar, quem usa, tags) e "o que pode ser mostrado a quem não
-- é membro?" (publico + status). Esta migração acrescenta isso SEM trocar a
-- tabela: o formulário de cadastro, o anexo de arquivo e o bucket continuam
-- como estavam.
--
-- REGRA DE PUBLICAÇÃO (uma só, no banco)
--   `publico = true` diz que o documento PODE ser mostrado a quem não é membro.
--   Isso dá dois níveis, e só o segundo entrega o arquivo:
--     · LISTADO   — publico E status <> 'arquivado': aparece na vitrine com o
--                   rótulo "Em aprovação" (ou "Vigente"), título e resumo;
--     · ABERTO    — publico E status = 'vigente': o visitante também abre o PDF.
--   Rascunho marcado como público NUNCA entrega arquivo. A regra vive na view
--   e na função abaixo, e lib/documentos-catalogo.ts repete as mesmas condições
--   (eListadoNoPublico, eVisivelAoPublico), com teste em
--   scripts/testar-documentos.mjs.
--
-- O QUE QUALQUER VISITANTE PASSA A ENXERGAR
--   Só o que a view `documentos_publicos` expõe, e só de documento marcado como
--   público e não arquivado. A tabela continua fechada para anônimo. O arquivo de um documento
--   público também é aberto a anônimo no bucket (função documento_e_publico);
--   os demais continuam exigindo sessão de membro aprovado.
-- =============================================================================

-- 1. COLUNAS -----------------------------------------------------------------
alter table public.documentos add column if not exists codigo      text;
alter table public.documentos add column if not exists pacote      smallint;
alter table public.documentos add column if not exists pacote_nome text;
alter table public.documentos add column if not exists resumo      text;
alter table public.documentos add column if not exists quando      text;
alter table public.documentos add column if not exists quem        text;
alter table public.documentos add column if not exists paginas     smallint;
alter table public.documentos add column if not exists tags        text[] not null default '{}';
alter table public.documentos add column if not exists publico     boolean not null default false;
alter table public.documentos add column if not exists status      text not null default 'rascunho';
-- Formulários editáveis (.docx) do documento: [{ "nome": "...", "caminho": "formularios/..." }].
-- Caminhos dentro do mesmo bucket privado; nunca são públicos.
alter table public.documentos add column if not exists anexos      jsonb not null default '[]'::jsonb;

alter table public.documentos drop constraint if exists documentos_status_check;
alter table public.documentos add constraint documentos_status_check
  check (status in ('rascunho', 'em_aprovacao', 'vigente', 'arquivado'));

alter table public.documentos drop constraint if exists documentos_anexos_array;
alter table public.documentos add constraint documentos_anexos_array
  check (jsonb_typeof(anexos) = 'array');

-- Limites no mesmo espírito da 015: texto livre não cresce sem teto.
alter table public.documentos drop constraint if exists documentos_resumo_tam;
alter table public.documentos add constraint documentos_resumo_tam check (length(resumo) <= 600);
alter table public.documentos drop constraint if exists documentos_quando_tam;
alter table public.documentos add constraint documentos_quando_tam check (length(quando) <= 400);
alter table public.documentos drop constraint if exists documentos_quem_tam;
alter table public.documentos add constraint documentos_quem_tam   check (length(quem) <= 200);

create unique index if not exists documentos_codigo_idx
  on public.documentos (codigo) where codigo is not null;
create index if not exists documentos_pacote_idx on public.documentos (pacote, codigo);

comment on column public.documentos.status  is 'rascunho | em_aprovacao | vigente | arquivado. Só vigente pode ser público.';
comment on column public.documentos.publico is 'Pode ser mostrado a quem não é membro DEPOIS de vigente. Sozinha, esta marca não publica nada.';

-- 2. QUEM PODE MUDAR PUBLICO E STATUS ----------------------------------------
-- Tornar um documento vigente é aprovação (Assembleia/Diretoria); torná-lo
-- público é decisão de exposição. Qualquer cargo anexa arquivo, mas só a
-- diretoria muda estes dois campos — senão o cargo de uma frente poderia
-- publicar sozinho um texto ainda em rascunho.
create or replace function public.guardar_publicacao_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sem sessão = SQL Editor/service_role (seed, importação, socorro).
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (new.publico or new.status <> 'rascunho') and not public.e_diretoria() then
      raise exception 'Apenas a diretoria cadastra documento já público ou vigente.';
    end if;
  elsif (new.publico, new.status) is distinct from (old.publico, old.status)
        and not public.e_diretoria() then
    raise exception 'Apenas a diretoria altera a publicação e o status de um documento.';
  end if;

  return new;
end;
$$;

drop trigger if exists documentos_guardar_publicacao on public.documentos;
create trigger documentos_guardar_publicacao
  before insert or update on public.documentos
  for each row execute function public.guardar_publicacao_documento();

-- 3. VITRINE PÚBLICA ---------------------------------------------------------
-- Mesmo padrão da 019: a view é o recorte que alguém decidiu publicar, coluna
-- por coluna, e atravessa a RLS de propósito. `arquivo` só sai quando o
-- documento é vigente E o valor é caminho no bucket: link externo é cadastrado
-- por cargo e não passa por esta revisão, então não é repassado ao visitante.
-- `quando`, `quem`, `anexos` e `tags` internas ficam de fora.
drop view if exists public.documentos_publicos;
create view public.documentos_publicos as
  select
    d.codigo,
    d.titulo,
    d.categoria,
    d.pacote,
    d.pacote_nome,
    d.resumo,
    d.versao,
    d.paginas,
    d.status,
    case when d.status = 'vigente' and d.arquivo_url !~* '^https?://'
         then d.arquivo_url end as arquivo,
    d.atualizado_em
  from public.documentos d
  where d.publico and d.status <> 'arquivado';

comment on view public.documentos_publicos is
  'Recorte publicável do catálogo: publico e não arquivado; arquivo só se vigente. Atravessa a RLS de propósito — ver 025.';

grant select on public.documentos_publicos to anon, authenticated;

-- 4. ARQUIVO PÚBLICO NO BUCKET -----------------------------------------------
-- A policy de storage não enxerga `documentos` como anônimo (a tabela é
-- fechada), então a consulta vai numa função security definer que só responde
-- sim/não para UM caminho — não lista nada.
create or replace function public.documento_e_publico(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documentos d
     where d.arquivo_url = caminho and d.publico and d.status = 'vigente'
  );
$$;

revoke all on function public.documento_e_publico(text) from public;
grant execute on function public.documento_e_publico(text) to anon, authenticated;

drop policy if exists "documentos storage: leitura publica de vigentes" on storage.objects;
create policy "documentos storage: leitura publica de vigentes"
  on storage.objects for select to anon
  using (bucket_id = 'documentos' and public.documento_e_publico(name));

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. colunas novas (esperado: 11 linhas)
--   select column_name from information_schema.columns
--    where table_name = 'documentos'
--      and column_name in ('codigo','pacote','pacote_nome','resumo','quando',
--                          'quem','paginas','tags','publico','status','anexos');
--
--   -- 2. anônimo não lê a tabela (esperado: 0)
--   set local role anon;  select count(*) from public.documentos;  reset role;
--
--   -- 3. a vitrine lista só o marcado como público (esperado: 10 logo após a
--   --    026) e NENHUM arquivo enquanto tudo for rascunho (esperado: 0)
--   select count(*), count(arquivo) from public.documentos_publicos;
--
--   -- 4. o gatilho de publicação existe (esperado: 1)
--   select count(*) from pg_trigger where tgname = 'documentos_guardar_publicacao';
-- =============================================================================
