/**
 * Gera supabase/026_catalogo_inicial.sql a partir de supabase/seed/documentos.json.
 *
 * Por que gerar em vez de escrever o SQL à mão: o catálogo nasce do pacote de
 * documentação (LaTeX) e é revisado como JSON. Quando um documento entra ou
 * muda de resumo, edita-se o JSON e roda-se
 *
 *   node scripts/gerar-sql-catalogo.mjs
 *
 * O SQL gerado é idempotente e NÃO sobrescreve o que a diretoria decidiu no
 * painel: `arquivo_url`, `versao`, `publico` e `status` só são definidos na
 * primeira inserção. Reaplicar atualiza apenas título-resumo-quando-quem-tags.
 *
 * Só metadado entra no repositório (público). Nenhum PDF ou .docx é versionado:
 * os arquivos sobem para o bucket privado `documentos` pela própria tela.
 */

import { readFileSync, writeFileSync } from "node:fs"

import { categoriaDoCatalogo } from "../lib/documentos-catalogo.ts"

const origem = new URL("../supabase/seed/documentos.json", import.meta.url)
const destino = new URL("../supabase/026_catalogo_inicial.sql", import.meta.url)
const catalogo = JSON.parse(readFileSync(origem, "utf8"))

const txt = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`)
const arr = (v) => `array[${(v ?? []).map(txt).join(", ")}]::text[]`
const anexos = (lista) =>
  `${txt(JSON.stringify((lista ?? []).map((a) => ({ nome: a.nome, caminho: a.arquivo }))))}::jsonb`

const linhas = catalogo.documentos.map((d) => {
  const campos = [
    txt(d.id),
    txt(d.titulo),
    txt(categoriaDoCatalogo(d)),
    d.pacote,
    txt(d.pacoteNome),
    txt(d.resumo),
    txt(d.quando),
    txt(d.quem),
    d.paginas ?? "null",
    arr(d.tags),
    d.publico ? "true" : "false",
    anexos(d.docx),
  ]
  return `  (${campos.join(", ")})`
})

const sql = `-- =============================================================================
-- GEAR — catálogo inicial de documentos (GERADO — não edite à mão)
-- Rodar no SQL Editor, DEPOIS de 025_catalogo_de_documentos.sql.
--
-- Gerado por scripts/gerar-sql-catalogo.mjs a partir de supabase/seed/documentos.json
-- (catálogo versão ${catalogo.versao}, atualizado em ${catalogo.atualizado}).
-- ${catalogo.documentos.length} documentos. Todos entram como RASCUNHO: nenhum vira público até a
-- diretoria marcar como vigente (o gatilho da 025 só deixa a diretoria fazer isso).
--
-- Idempotente. Em reaplicação NÃO toca em arquivo_url, versao, publico nem status.
-- =============================================================================

insert into public.documentos
  (codigo, titulo, categoria, pacote, pacote_nome, resumo, quando, quem, paginas, tags, publico, anexos)
values
${linhas.join(",\n")}
on conflict (titulo) do update set
  codigo      = excluded.codigo,
  categoria   = excluded.categoria,
  pacote      = excluded.pacote,
  pacote_nome = excluded.pacote_nome,
  resumo      = excluded.resumo,
  quando      = excluded.quando,
  quem        = excluded.quem,
  paginas     = excluded.paginas,
  tags        = excluded.tags,
  anexos      = excluded.anexos;

-- Os cinco títulos provisórios da 006 foram substituídos pelos documentos acima
-- (Manual da Trilha …, Manual Financeiro e de Operações, Normas de Segurança de
-- Oficina). Arquivados, e só se ainda não têm arquivo: nada anexado se perde.
update public.documentos
   set status = 'arquivado'
 where titulo in ('Manual Técnico de Competição', 'Manual Técnico de Pesquisa',
                  'Manual Técnico de Projetos', 'Manual Financeiro',
                  'Normas de Segurança do Laboratório')
   and arquivo_url is null
   and codigo is null;

-- Conferência (esperado: ${catalogo.documentos.length} com código):
--   select count(*) from public.documentos where codigo is not null;
`

writeFileSync(destino, sql)
console.log(`026_catalogo_inicial.sql: ${catalogo.documentos.length} documentos`)
