/**
 * Teste de banco: roda as migrações de verdade e ataca o resultado.
 *
 * POR QUE ISTO EXISTE
 * `npm run test:rls` só enxerga o que um visitante SEM sessão consegue, e só no
 * projeto de produção. Quase toda a autorização da GEAR acontece depois do
 * login — cargo, aprovação, frente, autoria, trava de documento — e nada
 * verificava isso de forma repetível. A revisão de 24/10/2026 conferiu à mão;
 * este arquivo transforma aquela conferência em teste.
 *
 * COMO FUNCIONA
 * Sobe um Postgres em memória (PGlite, sem Docker e sem rede), aplica
 * supabase/001…NNN em ordem e troca de papel como o PostgREST troca: `anon`,
 * `authenticated` com um `sub` de JWT, e `supabase_auth_admin` (quem insere em
 * auth.users no cadastro). Cada verificação tenta o que uma pessoa mal
 * intencionada tentaria — e o que uma pessoa legítima precisa conseguir.
 *
 * O QUE ELE NÃO É
 *   · Não toca no projeto de produção. Para isso, `npm run test:rls`.
 *   · Não é o GoTrue: auth.users e auth.uid() são substitutos mínimos, e o
 *     Storage é uma tabela com RLS. O que se testa é o SQL do repositório,
 *     não o Supabase por trás dele.
 *   · Não prova que a migração foi aplicada em produção. Veja
 *     supabase/README.md ("Conferir o que já rodou").
 *
 * COMO RODAR
 *   npm run test:banco
 *   npm run test:banco -- --sem=028     # ver o que uma migração protege:
 *                                       # roda sem ela e mostra o que quebra
 *
 * Sai com código 1 se qualquer verificação falhar — serve em CI sem adaptação.
 */

import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { PGlite } from "@electric-sql/pglite"

import { lerPlanilha, sqlDeImportacao } from "../lib/inventario.ts"

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase")

const sem = new Set(
  process.argv
    .filter((a) => a.startsWith("--sem="))
    .flatMap((a) => a.slice("--sem=".length).split(","))
    .filter(Boolean),
)

// --- placar ------------------------------------------------------------------
let passou = 0
let falhou = 0

function checar(nome, ok, detalhe = "") {
  if (ok) {
    passou++
    console.log(`  \x1b[32m✓\x1b[0m ${nome}`)
  } else {
    falhou++
    console.log(`  \x1b[31m✗\x1b[0m ${nome}${detalhe ? ` — ${detalhe}` : ""}`)
  }
}

const secao = (titulo) => console.log(`\n${titulo}`)

// --- banco -------------------------------------------------------------------
const db = new PGlite()

// Substitutos mínimos do que o Supabase fornece e as migrações assumem.
// Em constante porque a seção 7 sobe um SEGUNDO banco, com dados antigos.
const PREAMBULO = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create role supabase_auth_admin nologin;
  -- papel que NÃO tem EXECUTE em nenhuma função: prova que gatilho dispara sem ele
  create role sem_execute nologin;

  create schema auth;
  create schema storage;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner uuid, metadata jsonb
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[]
    language sql immutable as $$ select string_to_array(name, '/') $$;

  grant usage on schema auth, storage, public to anon, authenticated, service_role;
  grant usage on schema auth to supabase_auth_admin, sem_execute;
  -- é assim que o Supabase configura: tudo que nasce em public já nasce
  -- concedido aos papéis da API. É por isso que "revoke from public" sozinho
  -- não fecha função nenhuma.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  grant all on storage.objects, storage.buckets to authenticated, anon;
  -- no Supabase quem insere em auth.users no cadastro é o GoTrue, com este papel
  grant select, insert, update on auth.users to supabase_auth_admin, sem_execute;
`
await db.exec(PREAMBULO)

// --- migrações ---------------------------------------------------------------
secao("0. MIGRAÇÕES — todas aplicam, em ordem, num banco vazio")

const arquivos = readdirSync(DIR)
  .filter((f) => /^\d{3}_.*\.sql$/.test(f))
  .sort()

const errosDeMigracao = []
for (const arquivo of arquivos) {
  if (sem.has(arquivo.slice(0, 3))) {
    console.log(`  \x1b[33m·\x1b[0m ${arquivo} — PULADA (--sem)`)
    continue
  }
  try {
    await db.exec(readFileSync(path.join(DIR, arquivo), "utf8"))
  } catch (e) {
    errosDeMigracao.push(`${arquivo}: ${String(e.message).split("\n")[0]}`)
  }
}
checar(
  `${arquivos.length} arquivos, sem erro`,
  errosDeMigracao.length === 0,
  errosDeMigracao.join(" | "),
)

// Reexecutar é prometido nos cabeçalhos; para as três mais recentes, é testado.
for (const prefixo of ["027", "028", "029"]) {
  const arquivo = arquivos.find((f) => f.startsWith(prefixo))
  if (!arquivo || sem.has(prefixo)) continue
  let erro = ""
  try {
    await db.exec(readFileSync(path.join(DIR, arquivo), "utf8"))
  } catch (e) {
    erro = String(e.message).split("\n")[0]
  }
  checar(`${arquivo} pode ser reexecutada`, erro === "", erro)
}

// --- ajudantes ---------------------------------------------------------------
const tenta = async (sql) => {
  try {
    const r = await db.query(sql)
    return { ok: true, rows: r.rows }
  } catch (e) {
    return { ok: false, rows: [], erro: String(e.message).split("\n")[0], codigo: e.code }
  }
}

/** Como o PostgREST: troca para o papel, fixa o `sub` do JWT, executa, devolve ao dono. */
async function comoPapel(papel, uid, sql) {
  await db.exec(`set role ${papel}; select set_config('request.jwt.claim.sub','${uid ?? ""}',false);`)
  const r = await tenta(sql)
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`)
  return r
}
const como = (uid, sql) => comoPapel("authenticated", uid, sql)
const anon = (sql) => comoPapel("anon", null, sql)
const gotrue = (sql) => comoPapel("supabase_auth_admin", null, sql)
const semExecute = (sql) => comoPapel("sem_execute", null, sql)

/** Bloqueado = deu erro OU não devolveu nenhuma linha. */
const bloqueado = (r) => !r.ok || r.rows.length === 0
/** Passou = executou e (se devolve linhas) devolveu alguma. */
const passa = (r) => r.ok && r.rows.length > 0

const P = "11111111-1111-4111-8111-111111111111" // Presidente
const CARGO = "22222222-2222-4222-8222-222222222222" // Tesouraria, frente Projetos
const MEMBRO = "33333333-3333-4333-8333-333333333333" // aprovado, sem cargo
const NOVO = "44444444-4444-4444-8444-444444444444" // acabou de se cadastrar, não aprovado
const PESQ = "55555555-5555-4555-8555-555555555555" // Diretor de Pesquisa
const ZERO = "00000000-0000-4000-8000-000000000000"

// --- 1. cadastro: só e-mail institucional (028) ------------------------------
secao("1. CADASTRO — o servidor recusa e-mail fora da UFSCar (M1)")

const emailNovo = (email) =>
  gotrue(`insert into auth.users (id, email) values (gen_random_uuid(), ${email === null ? "null" : `'${email}'`}) returning email`)

for (const ok of ["ana@ufscar.br", "ana@estudante.ufscar.br", "Ana@EstuDante.UFSCar.br", "ana@ufscar.br "]) {
  const r = await emailNovo(ok)
  checar(`aceita ${JSON.stringify(ok)}`, passa(r), r.erro)
}

const recusados = [
  ["gmail.com", "ana@gmail.com"],
  ["subdomínio não listado", "ana@sub.ufscar.br"],
  ["sufixo falso", "ana@ufscar.br.evil.com"],
  ["prefixo falso", "ana@evil-ufscar.br"],
  ["domínio institucional só no local", "ufscar.br@gmail.com"],
  ["dois @ (domínio é o último)", "ana@ufscar.br@gmail.com"],
  ["local entre aspas com @", '"ana@ufscar.br"@gmail.com'],
  ["sem @", "anaufscar.br"],
  ["vazio", ""],
  ["nulo (login anônimo, telefone)", null],
]
for (const [rotulo, email] of recusados) {
  const r = await emailNovo(email)
  checar(
    `recusa ${rotulo}`,
    !r.ok && r.codigo === "GE002",
    r.ok ? "CRIOU A CONTA" : `erro ${r.codigo ?? "?"}: ${r.erro}`,
  )
}

// --- sementes ----------------------------------------------------------------
for (const [id, email] of [
  [P, "presidente@ufscar.br"],
  [CARGO, "tesouraria@estudante.ufscar.br"],
  [MEMBRO, "membro@estudante.ufscar.br"],
  [NOVO, "novo@estudante.ufscar.br"],
  [PESQ, "pesquisa@estudante.ufscar.br"],
]) {
  await db.exec(`insert into auth.users (id, email) values ('${id}', '${email}')`)
}
await db.exec(`
  update public.perfis set nome_completo='Presidente', aprovado=true, cargo='Presidente' where id='${P}';
  update public.perfis set nome_completo='Tesouraria', aprovado=true, cargo='Tesouraria', frente='Projetos' where id='${CARGO}';
  update public.perfis set nome_completo='Membro', aprovado=true where id='${MEMBRO}';
  update public.perfis set nome_completo='Novo' where id='${NOVO}';
  update public.perfis set nome_completo='Dir Pesquisa', aprovado=true, cargo='Diretor de Pesquisa', frente='Pesquisa' where id='${PESQ}';
  insert into public.patrimonio (item, categoria, quantidade, status, valor_estimado) values ('Osciloscópio','${sem.has("029") ? "Ferramenta" : "Ferramentas"}',1,'Disponível', 3500);
  insert into public.atas (data_reuniao, tipo, pauta, decisoes, presentes, registrado_por) values (current_date, 'Geral', 'pauta sigilosa', 'decisão', 'todos', '${P}');
  insert into public.sprints (frente, titulo, descricao, status) values ('Pesquisa','Sprint de teste','x','Planejado');
  insert into public.eventos (titulo, tipo, data_inicio) values ('Reunião geral','Reunião', now());
  insert into public.documentos (titulo, categoria, arquivo_url, status, publico) values
    ('Doc vigente e público','Governança','vigente.pdf','vigente',true),
    ('Doc rascunho marcado público','Governança','rascunho.pdf','rascunho',true),
    ('Doc vigente interno','Governança','interno.pdf','vigente',false),
    ('Doc vigente com link externo','Governança','https://exemplo.org/doc.pdf','vigente',true);
  insert into storage.objects (bucket_id, name) values
    ('documentos','vigente.pdf'), ('documentos','rascunho.pdf'), ('documentos','interno.pdf');
`)

// --- 2. funções de gatilho fora da API (028) ---------------------------------
secao("2. FUNÇÕES DE GATILHO — fora do alcance da API e, mesmo assim, disparando (B5)")

const GATILHOS = [
  "cascatear_desconclusao",
  "guardar_cargo",
  "guardar_perfil_novo",
  "guardar_publicacao_documento",
  "handle_new_user",
  "registrar_termos_aceitos",
  "validar_ordem_progresso",
  "exigir_email_institucional",
]

for (const nome of GATILHOS) {
  const r = await tenta(`
    select has_function_privilege('anon', p.oid, 'execute') as a,
           has_function_privilege('authenticated', p.oid, 'execute') as u
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = '${nome}'`)
  const l = r.rows[0]
  checar(
    `${nome}(): sem EXECUTE para anon e authenticated`,
    Boolean(l) && l.a === false && l.u === false,
    l ? `anon=${l.a} authenticated=${l.u}` : "função não existe",
  )
}

const expostas = await tenta(`
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
     and (has_function_privilege('anon', p.oid, 'execute')
       or has_function_privilege('authenticated', p.oid, 'execute'))
   order by 1`)
checar(
  "nenhuma função de gatilho SECURITY DEFINER executável pela API (o que o advisor lista)",
  expostas.rows.length === 0,
  expostas.rows.map((x) => x.proname).join(", "),
)

// O que `anon` chama por RPC é uma lista curta, escolhida: cada uma exige token
// ou caminho e só responde sim/não (ou o feed). Entrou outra? Vai aparecer aqui.
const anonChama = await tenta(`
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
   order by 1`)
const esperadasAnon = ["calendario_token_valido", "documento_e_publico", "feed_do_calendario"]
checar(
  "SECURITY DEFINER chamável por anon = só as três escolhidas",
  JSON.stringify(anonChama.rows.map((x) => x.proname)) === JSON.stringify(esperadasAnon),
  anonChama.rows.map((x) => x.proname).join(", "),
)

const rpcGatilho = await anon(`select public.handle_new_user()`)
checar("anon chamando handle_new_user() por RPC: negado", !rpcGatilho.ok)

// Sem EXECUTE para ninguém da API, os gatilhos têm de continuar valendo. Cada
// verificação abaixo dispara um deles como o papel que, em produção, o dispara.
const semNada = await tenta(`
  select count(*)::int as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and has_function_privilege('sem_execute', p.oid, 'execute')
     and p.proname in ('handle_new_user','registrar_termos_aceitos','exigir_email_institucional')`)
checar("o papel de prova não tem EXECUTE em nenhuma função de cadastro", semNada.rows[0]?.n === 0, String(semNada.rows[0]?.n))
const cadastroSemExecute = await semExecute(`
  insert into auth.users (id, email, raw_user_meta_data)
  values ('77777777-7777-4777-8777-777777777777', 'sem.execute@ufscar.br', '{"nome_completo":"Sem Execute","termos_versao":"2026-10"}'::jsonb)
  returning id`)
checar("cadastro por papel SEM nenhum EXECUTE conclui (o privilégio não é conferido no disparo)", passa(cadastroSemExecute), cadastroSemExecute.erro)
const efeitos = await tenta(`
  select (select count(*)::int from public.perfis where id = '77777777-7777-4777-8777-777777777777') as perfil,
         (select count(*)::int from public.termos_aceitos where usuario_id = '77777777-7777-4777-8777-777777777777') as termos`)
checar("…e os dois gatilhos de cadastro agiram (perfil e aceite)", efeitos.rows[0]?.perfil === 1 && efeitos.rows[0]?.termos === 1, JSON.stringify(efeitos.rows[0]))

const cadastro = await gotrue(`
  insert into auth.users (id, email, raw_user_meta_data)
  values ('66666666-6666-4666-8666-666666666666', 'recem@estudante.ufscar.br',
          '{"nome_completo":"Recém Chegada","curso":"Eng. de Computação","termos_versao":"2026-10"}'::jsonb)
  returning id`)
checar("cadastro pelo GoTrue (supabase_auth_admin) conclui", passa(cadastro), cadastro.erro)
const perfilNovo = await tenta(
  `select nome_completo, curso, aprovado, cargo from public.perfis where id = '66666666-6666-4666-8666-666666666666'`,
)
checar(
  "handle_new_user disparou: perfil criado com nome e curso, sem aprovação nem cargo",
  perfilNovo.rows[0]?.nome_completo === "Recém Chegada" &&
    perfilNovo.rows[0]?.curso === "Eng. de Computação" &&
    perfilNovo.rows[0]?.aprovado === false &&
    perfilNovo.rows[0]?.cargo == null,
  JSON.stringify(perfilNovo.rows[0] ?? null),
)
const termos = await tenta(
  `select versao_documento from public.termos_aceitos where usuario_id = '66666666-6666-4666-8666-666666666666'`,
)
checar(
  "registrar_termos_aceitos disparou: aceite gravado com a versão do cadastro",
  termos.rows[0]?.versao_documento === "2026-10",
  JSON.stringify(termos.rows),
)

const apropria = await como(NOVO, `update public.perfis set cargo = 'Presidente' where id = '${NOVO}' returning 1`)
checar("guardar_cargo disparou: não aprovado não se dá cargo", bloqueado(apropria), apropria.erro)

await db.exec(`delete from public.perfis where id = '${NOVO}'`)
const perfilForjado = await como(
  NOVO,
  `insert into public.perfis (id, nome_completo, cargo, aprovado) values ('${NOVO}','Esperta','Presidente', true) returning cargo, aprovado`,
)
checar(
  "guardar_perfil_novo disparou: perfil criado pelo dono nunca nasce com cargo ou aprovação",
  bloqueado(perfilForjado) || (!perfilForjado.rows[0].aprovado && perfilForjado.rows[0].cargo == null),
  JSON.stringify(perfilForjado.rows[0] ?? perfilForjado.erro),
)
await db.exec(`update public.perfis set nome_completo = 'Novo' where id = '${NOVO}'`)

const modulo = async (ordem) =>
  (await db.query(`select id from public.modulos where nivel = 'Fundamental' and ordem = ${ordem}`)).rows[0]?.id
const [m1, m2] = [await modulo(1), await modulo(2)]
const fora = await como(
  MEMBRO,
  `insert into public.progresso (usuario_id, modulo_id, concluido_em) values ('${MEMBRO}','${m2}', now()) returning 1`,
)
checar("validar_ordem_progresso disparou: módulo 2 sem o 1 é recusado", !fora.ok && fora.codigo === "23514", fora.erro)
const em1 = await como(
  MEMBRO,
  `insert into public.progresso (usuario_id, modulo_id, concluido_em) values ('${MEMBRO}','${m1}', now()) returning 1`,
)
const em2 = await como(
  MEMBRO,
  `insert into public.progresso (usuario_id, modulo_id, concluido_em) values ('${MEMBRO}','${m2}', now()) returning 1`,
)
checar("…e em ordem é aceito", passa(em1) && passa(em2), em1.erro ?? em2.erro)
await como(MEMBRO, `update public.progresso set concluido_em = null where usuario_id = '${MEMBRO}' and modulo_id = '${m1}'`)
const cascata = await tenta(
  `select concluido_em from public.progresso where usuario_id = '${MEMBRO}' and modulo_id = '${m2}'`,
)
checar(
  "cascatear_desconclusao disparou: desmarcar o 1 desmarca o 2",
  cascata.rows.length === 1 && cascata.rows[0].concluido_em === null,
  JSON.stringify(cascata.rows),
)

const docCargo = await como(
  CARGO,
  `insert into public.documentos (titulo, categoria, publico) values ('Cargo publica','Técnico', true) returning 1`,
)
checar(
  "guardar_publicacao_documento disparou: cargo comum não cria documento já público",
  !docCargo.ok && /diretoria/i.test(docCargo.erro ?? ""),
  docCargo.erro,
)
const docRascunho = await como(
  CARGO,
  `insert into public.documentos (titulo, categoria) values ('Cargo cria rascunho','Técnico') returning 1`,
)
checar("…mas cria rascunho", passa(docRascunho), docRascunho.erro)
const docDiretoria = await como(
  P,
  `update public.documentos set publico = true where titulo = 'Cargo cria rascunho' returning 1`,
)
checar("…e a diretoria o publica", passa(docDiretoria), docDiretoria.erro)

// --- 3. fronteira de autorização depois do login -----------------------------
secao("3. DEPOIS DO LOGIN — conta nova, cargo sem aprovação, autoria, frente")

const sobe = await como(NOVO, `update public.perfis set aprovado = true where id = '${NOVO}' returning 1`)
checar("conta nova não se auto-aprova", bloqueado(sobe), sobe.erro)
for (const [rotulo, sql] of [
  ["o diretório de membros", `select 1 from public.perfis where id <> '${NOVO}'`],
  ["as atas", `select 1 from public.atas`],
  ["o patrimônio", `select 1 from public.patrimonio`],
  ["os eventos", `select 1 from public.eventos`],
  ["os documentos", `select 1 from public.documentos`],
  ["o valor do patrimônio (RPC)", `select public.valor_patrimonio_atual() as v where public.valor_patrimonio_atual() is not null`],
]) {
  const r = await como(NOVO, sql)
  checar(`conta não aprovada não lê ${rotulo}`, bloqueado(r), r.ok ? `${r.rows.length} linha(s)` : "")
}

await db.exec(`update public.perfis set aprovado = false where id = '${CARGO}'`)
for (const [rotulo, sql] of [
  ["atas", `select 1 from public.atas`],
  ["patrimônio", `select 1 from public.patrimonio`],
]) {
  const r = await como(CARGO, sql)
  checar(`cargo SEM aprovação não lê ${rotulo}`, bloqueado(r), `${r.rows.length} linha(s)`)
}
await db.exec(`update public.perfis set aprovado = true where id = '${CARGO}'`)

const lerAta = await como(CARGO, `select 1 from public.atas`)
checar("cargo aprovado lê atas", passa(lerAta), lerAta.erro)
const lerAtaMembro = await como(MEMBRO, `select 1 from public.atas`)
checar("membro aprovado sem cargo não lê atas", bloqueado(lerAtaMembro))

await db.exec(`insert into public.avisos (titulo, conteudo, autor_id) values ('semente','x','${P}')`)
const aviso = await como(CARGO, `insert into public.avisos (titulo, conteudo, autor_id) values ('Forjado','texto','${P}') returning autor_id`)
checar("aviso assinado como outra pessoa sai com o autor verdadeiro", passa(aviso) && aviso.rows[0].autor_id === CARGO, JSON.stringify(aviso.rows[0] ?? aviso.erro))
const evento = await como(CARGO, `insert into public.eventos (titulo, tipo, data_inicio, criado_por) values ('Forjado','Reunião', now(), '${P}') returning criado_por`)
checar("evento em nome de outra pessoa sai com o criador verdadeiro", passa(evento) && evento.rows[0].criado_por === CARGO, JSON.stringify(evento.rows[0] ?? evento.erro))
const ata = await como(CARGO, `insert into public.atas (data_reuniao, tipo, pauta, decisoes, presentes, registrado_por) values (current_date,'Geral','p','d','t','${P}') returning registrado_por`)
checar("ata em nome de outra pessoa sai com o registrador verdadeiro", passa(ata) && ata.rows[0].registrado_por === CARGO, JSON.stringify(ata.rows[0] ?? ata.erro))

const frente = await como(CARGO, `update public.perfis set frente = 'Pesquisa' where id = '${CARGO}' returning 1`)
checar("cargo não troca a própria frente", bloqueado(frente), frente.erro)
const sprintAlheio = await como(CARGO, `update public.sprints set titulo = 'alterado' where frente = 'Pesquisa' returning 1`)
checar("cargo de uma frente não edita sprint de outra", bloqueado(sprintAlheio))
const sprintProprio = await como(PESQ, `update public.sprints set titulo = 'da pesquisa' where frente = 'Pesquisa' returning 1`)
checar("…mas edita a da própria", passa(sprintProprio), sprintProprio.erro)
const politicasSprints = await db.query(
  `select cmd from pg_policies where schemaname = 'public' and tablename = 'sprints' order by cmd`,
)
checar(
  "sprints: 4 políticas (1 de leitura e 3 de escrita), sem sobra da 010 (B6)",
  politicasSprints.rows.length === 4,
  `${politicasSprints.rows.length}: ${politicasSprints.rows.map((x) => x.cmd).join(", ")}`,
)

// Controles positivos: sem eles, "bloqueado" também seria o resultado de uma
// consulta quebrada. Quem TEM direito precisa conseguir.
for (const [quem, rotulo, tabela, minimo] of [
  [MEMBRO, "membro aprovado", "perfis", 2],
  [MEMBRO, "membro aprovado", "eventos", 1],
  [MEMBRO, "membro aprovado", "documentos", 1],
  [MEMBRO, "membro aprovado", "sprints", 1],
  [MEMBRO, "membro aprovado", "avisos", 1],
  [CARGO, "cargo aprovado", "patrimonio", 1],
]) {
  const r = await como(quem, `select 1 from public.${tabela}`)
  checar(`${rotulo} lê ${tabela}`, r.ok && r.rows.length >= minimo, r.erro ?? `${r.rows.length} linha(s)`)
}
const valor = await como(CARGO, `select public.valor_patrimonio_atual() as v`)
checar("cargo aprovado vê o valor do patrimônio (RPC)", Number(valor.rows[0]?.v) === 3500, JSON.stringify(valor.rows[0] ?? valor.erro))

// Deriva: em produção as três políticas da 010 sobreviveram à 011. Recria-as
// aqui e confere que a 028 as tira — o teste acima só prova que a ordem
// 001…028 num banco vazio nunca as deixa.
if (!sem.has("028")) {
  for (const nome of ["escrita", "edição", "remoção"]) {
    const cmd = nome === "escrita" ? "insert" : nome === "edição" ? "update" : "delete"
    const clausula = cmd === "insert" ? "with check (true)" : "using (true)"
    await db.exec(`create policy "sprints: ${nome} só na própria trilha" on public.sprints for ${cmd} to authenticated ${clausula}`)
  }
  const sobrando = await db.query(`select 1 from pg_policies where schemaname='public' and tablename='sprints'`)
  await db.exec(readFileSync(path.join(DIR, arquivos.find((f) => f.startsWith("028"))), "utf8"))
  const depois = await db.query(`select 1 from pg_policies where schemaname='public' and tablename='sprints'`)
  checar(
    "028 remove as três políticas da 010 quando elas sobram (7 → 4)",
    sobrando.rows.length === 7 && depois.rows.length === 4,
    `${sobrando.rows.length} → ${depois.rows.length}`,
  )
}

// o único Presidente não pode se trancar para fora
await db.exec(`update public.perfis set cargo = null where id <> '${P}' and cargo in ('Presidente','Vice-Presidente')`)
const tranca = await como(P, `update public.perfis set cargo = null where id = '${P}' returning 1`)
checar("o último Presidente não remove o próprio cargo", bloqueado(tranca), tranca.erro)
await db.exec(`update public.perfis set cargo = 'Presidente' where id = '${P}'`)

for (const nome of ["e_membro", "e_diretoria", "tem_cargo"]) {
  const r = await anon(`select public.${nome}(${nome === "tem_cargo" ? "array['Presidente']" : ""})`)
  checar(`anon não chama ${nome}() por RPC`, !r.ok, r.ok ? "chamou" : "")
}

const bucket = (await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'documentos'`)).rows[0]
checar("bucket 'documentos' existe, é privado e limita tamanho", Boolean(bucket) && bucket.public === false && bucket.file_size_limit === 20 * 1024 * 1024, JSON.stringify(bucket))
checar("…e não aceita SVG", Boolean(bucket) && !(bucket.allowed_mime_types ?? []).some((t) => /svg/i.test(t)), JSON.stringify(bucket?.allowed_mime_types))

// --- 4. vitrine pública de documentos ----------------------------------------
secao("4. VITRINE — o que o visitante enxerga dos documentos (025)")

const tabelaDocs = await anon(`select 1 from public.documentos`)
checar("anon não lê a tabela documentos", bloqueado(tabelaDocs), tabelaDocs.ok ? `${tabelaDocs.rows.length} linha(s)` : "")
const vitrine = await anon(`select titulo, status, arquivo from public.documentos_publicos order by titulo`)
const porTitulo = Object.fromEntries(vitrine.rows.map((x) => [x.titulo, x]))
checar("vitrine lista o vigente e público, com o arquivo", porTitulo["Doc vigente e público"]?.arquivo === "vigente.pdf", JSON.stringify(porTitulo["Doc vigente e público"]))
checar("rascunho marcado público aparece SEM arquivo", porTitulo["Doc rascunho marcado público"] && porTitulo["Doc rascunho marcado público"].arquivo === null)
checar("link externo não é repassado", porTitulo["Doc vigente com link externo"] && porTitulo["Doc vigente com link externo"].arquivo === null)
checar("documento interno não aparece", porTitulo["Doc vigente interno"] === undefined)
const colunasVitrine = Object.keys(vitrine.rows[0] ?? {})
checar(
  "a vitrine não expõe colunas internas",
  !["quando", "quem", "anexos", "publico", "arquivo_url", "tags"].some((c) => colunasVitrine.includes(c)),
  colunasVitrine.join(", "),
)
const objetos = await anon(`select name from storage.objects where bucket_id = 'documentos' order by name`)
checar(
  "anon lê no bucket só o arquivo de documento vigente e público",
  JSON.stringify(objetos.rows.map((x) => x.name)) === JSON.stringify(["vigente.pdf"]),
  objetos.rows.map((x) => x.name).join(", "),
)

// --- 5. calendário (027) ------------------------------------------------------
secao("5. CALENDÁRIO — feed por token, presença e links")

const criaToken = await como(CARGO, `insert into public.calendario_assinaturas (usuario_id) values ('${CARGO}') returning token`)
const TOKEN = criaToken.rows[0]?.token
checar("membro aprovado cria o próprio token", Boolean(TOKEN), criaToken.erro)
const tokenAlheio = await como(MEMBRO, `insert into public.calendario_assinaturas (usuario_id) values ('${CARGO}') returning token`)
checar("…e não cria token em nome de outra pessoa", bloqueado(tokenAlheio), tokenAlheio.erro)
const tokenNovo = await como(NOVO, `insert into public.calendario_assinaturas (usuario_id) values ('${NOVO}') returning token`)
checar("conta não aprovada não cria token", bloqueado(tokenNovo), tokenNovo.erro)

for (const quem of [P, MEMBRO, PESQ]) {
  const r = await como(quem, `select 1 from public.calendario_assinaturas where usuario_id = '${CARGO}'`)
  checar(`ninguém lê o token de outra pessoa (${quem === P ? "nem a diretoria" : quem === MEMBRO ? "membro" : "outro cargo"})`, bloqueado(r), `${r.rows.length} linha(s)`)
}

const feed = await anon(`select titulo from public.feed_do_calendario('${TOKEN}')`)
checar("anon com token válido lê o feed", passa(feed), feed.erro)
const colunasFeed = await tenta(`
  select a.attname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join lateral unnest(p.proargnames, p.proargmodes) as a(attname, modo)
  where n.nspname = 'public' and p.proname = 'feed_do_calendario' and a.modo = 't'`)
checar(
  "o feed não devolve criado_por",
  colunasFeed.rows.length > 0 && !colunasFeed.rows.some((x) => x.attname === "criado_por"),
  colunasFeed.erro ?? colunasFeed.rows.map((x) => x.attname).join(", "),
)
const feedErrado = await anon(`select 1 from public.feed_do_calendario('${ZERO}')`)
checar("token inventado não devolve nada", bloqueado(feedErrado))
const valido = await anon(`select public.calendario_token_valido('${TOKEN}') as v`)
const invalido = await anon(`select public.calendario_token_valido('${ZERO}') as v`)
checar("calendario_token_valido: sim para o certo, não para o inventado", valido.rows[0]?.v === true && invalido.rows[0]?.v === false)

await db.exec(`update public.perfis set aprovado = false where id = '${CARGO}'`)
const semAprovacao = await anon(`select 1 from public.feed_do_calendario('${TOKEN}')`)
const semAprovacaoValido = await anon(`select public.calendario_token_valido('${TOKEN}') as v`)
checar("perder a aprovação encerra o feed na hora", bloqueado(semAprovacao) && semAprovacaoValido.rows[0]?.v === false)
await db.exec(`update public.perfis set aprovado = true where id = '${CARGO}'`)

await como(CARGO, `update public.calendario_assinaturas set token = gen_random_uuid() where usuario_id = '${CARGO}'`)
const antigo = await anon(`select 1 from public.feed_do_calendario('${TOKEN}')`)
checar("trocar o token derruba o link antigo", bloqueado(antigo))

for (const tabela of ["eventos", "calendario_assinaturas", "eventos_presencas"]) {
  const r = await anon(`select 1 from public.${tabela}`)
  checar(`anon não lê ${tabela}`, bloqueado(r), r.ok ? `${r.rows.length} linha(s)` : "")
}

const evId = (await db.query(`select id from public.eventos where titulo = 'Reunião geral'`)).rows[0].id
const minha = await como(MEMBRO, `insert into public.eventos_presencas (evento_id, usuario_id, dia, resposta) values ('${evId}','${MEMBRO}', current_date, 'vou') returning 1`)
checar("membro responde 'vou' para si", passa(minha), minha.erro)
const emNome = await como(MEMBRO, `insert into public.eventos_presencas (evento_id, usuario_id, dia, resposta) values ('${evId}','${CARGO}', current_date, 'nao') returning 1`)
checar("…e não responde por outra pessoa", bloqueado(emNome), emNome.erro)
await como(CARGO, `insert into public.eventos_presencas (evento_id, usuario_id, dia, resposta) values ('${evId}','${CARGO}', current_date, 'vou')`)
const mexe = await como(MEMBRO, `update public.eventos_presencas set resposta = 'nao' where usuario_id = '${CARGO}' returning 1`)
checar("…nem altera a resposta de outra", bloqueado(mexe))
const apaga = await como(MEMBRO, `delete from public.eventos_presencas where usuario_id = '${CARGO}' returning 1`)
checar("…nem apaga", bloqueado(apaga))

const linkRuim = await como(CARGO, `insert into public.eventos (titulo, tipo, data_inicio, link) values ('XSS','Reunião', now(), 'javascript:alert(1)') returning 1`)
checar("evento com link javascript: é recusado pelo banco", !linkRuim.ok && linkRuim.codigo === "23514", linkRuim.erro)
const linkBom = await como(CARGO, `insert into public.eventos (titulo, tipo, data_inicio, link) values ('Online','Reunião', now(), 'https://meet.exemplo.org/abc') returning 1`)
checar("…e o https é aceito", passa(linkBom), linkBom.erro)

// --- 6. inventário (029) ------------------------------------------------------
secao("6. INVENTÁRIO — colunas da planilha, código da etiqueta e listas fechadas (029)")

const lit = (v) => (v === null ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const BASE = { item: "Item de teste", categoria: "Livro", quantidade: 1, status: "Disponível" }
const insereItem = (uid, extra = {}) => {
  const campos = { ...BASE, ...extra }
  return como(
    uid,
    `insert into public.patrimonio (${Object.keys(campos).join(", ")}) values (${Object.values(campos).map(lit).join(", ")}) returning codigo`,
  )
}
const recusado23514 = (r) => !r.ok && r.codigo === "23514"

const colunasPatrimonio = (
  await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'patrimonio'`)
).rows.map((x) => x.column_name)
checar(
  "a coluna de frente se chama frente_vinculada (é o nome que a tela pede)",
  colunasPatrimonio.includes("frente_vinculada") && !colunasPatrimonio.includes("trilha_vinculada"),
  colunasPatrimonio.join(", "),
)
const NOVAS = ["codigo", "subcategoria", "fabricante", "modelo", "part_number", "descricao", "datasheet_url", "estado", "origem"]
checar(
  "as nove colunas da planilha existem",
  NOVAS.every((c) => colunasPatrimonio.includes(c)),
  NOVAS.filter((c) => !colunasPatrimonio.includes(c)).join(", "),
)

const semente = await tenta(`select codigo from public.patrimonio where item = 'Osciloscópio'`)
checar("item que já estava na tabela ganhou código", semente.rows[0]?.codigo === "GEAR-001", semente.erro ?? semente.rows[0]?.codigo)

const gerado = await insereItem(CARGO)
checar("cargo cadastra sem informar código e recebe o seguinte", gerado.rows[0]?.codigo === "GEAR-002", gerado.erro ?? gerado.rows[0]?.codigo)
const explicito = await insereItem(CARGO, { codigo: " gear-010 " })
checar("código informado é normalizado (maiúsculas, sem espaço)", explicito.rows[0]?.codigo === "GEAR-010", explicito.erro ?? explicito.rows[0]?.codigo)
const depoisDoSalto = await insereItem(CARGO)
checar(
  "o seguinte respeita o maior já gravado (não repete nem volta)",
  depoisDoSalto.rows[0]?.codigo === "GEAR-011",
  depoisDoSalto.erro ?? depoisDoSalto.rows[0]?.codigo,
)
const duplicado = await insereItem(CARGO, { codigo: "GEAR-010" })
checar("código repetido é recusado", !duplicado.ok && duplicado.codigo === "23505", duplicado.erro)
const formatoRuim = await insereItem(CARGO, { codigo: "ABC-1" })
checar(
  "código fora do formato GEAR-NNN é recusado",
  recusado23514(formatoRuim) && formatoRuim.erro.includes("patrimonio_codigo_formato"),
  formatoRuim.erro,
)

const mudaCodigo = await como(CARGO, `update public.patrimonio set codigo = 'GEAR-900' where codigo = 'GEAR-010' returning 1`)
checar("o código de um item não muda depois de gravado", !mudaCodigo.ok && mudaCodigo.codigo === "GE003", mudaCodigo.erro)
const mesmoCodigo = await como(CARGO, `update public.patrimonio set codigo = codigo, estado = 'Usado' where codigo = 'GEAR-010' returning estado`)
checar("…mas regravar o mesmo código junto com outra edição passa", passa(mesmoCodigo), mesmoCodigo.erro)
const emprestar = await como(CARGO, `update public.patrimonio set status = 'Emprestado', responsavel_atual = 'Ana' where codigo = 'GEAR-010' returning status`)
checar("cargo atualiza status e responsável", passa(emprestar), emprestar.erro)

// listas fechadas -----------------------------------------------------------
// O nome da restrição entra na conta: recusar por OUTRO motivo (coluna que não
// existe, tipo errado) não prova que a regra certa está de pé.
for (const [rotulo, extra, restricao] of [
  ["categoria da lista antiga ('Ferramenta')", { categoria: "Ferramenta" }, "patrimonio_categoria_check"],
  ["categoria inventada", { categoria: "Qualquer coisa" }, "patrimonio_categoria_check"],
  ["estado fora das cinco opções", { estado: "Quebrado" }, "patrimonio_estado_check"],
  ["frente que não existe", { frente_vinculada: "Física" }, "patrimonio_frente_check"],
  ["datasheet com javascript:", { datasheet_url: "javascript:alert(1)" }, "patrimonio_datasheet_url_check"],
  ["datasheet com ftp://", { datasheet_url: "ftp://exemplo.org/a.pdf" }, "patrimonio_datasheet_url_check"],
  ["datasheet com espaço", { datasheet_url: "https://exemplo.org/um arquivo.pdf" }, "patrimonio_datasheet_url_check"],
  ["datasheet com data:", { datasheet_url: "data:text/html,<script>1</script>" }, "patrimonio_datasheet_url_check"],
  ["modelo acima do limite", { modelo: "x".repeat(201) }, "patrimonio_campos_curtos_tam"],
  ["descrição acima do limite", { descricao: "x".repeat(5001) }, "patrimonio_descricao_tam"],
  ["quantidade negativa", { quantidade: -1 }, "patrimonio_quantidade_check"],
  ["status inventado", { status: "Perdido" }, "patrimonio_status_check"],
]) {
  const r = await insereItem(CARGO, extra)
  checar(
    `recusa ${rotulo}`,
    recusado23514(r) && r.erro.includes(restricao),
    r.ok ? "GRAVOU" : `erro ${r.codigo ?? "?"}: ${r.erro}`,
  )
}

for (const [rotulo, extra] of [
  ["categoria 'Outros'", { categoria: "Outros" }],
  ["estado 'Com defeito'", { estado: "Com defeito" }],
  ["estado em branco", { estado: null }],
  ["datasheet https", { datasheet_url: "https://exemplo.org/folha-de-dados.pdf" }],
  ["datasheet http", { datasheet_url: "http://exemplo.org/a.pdf" }],
  ["a planilha inteira numa linha", {
    subcategoria: "Motor DC", fabricante: "CHIP SCE", modelo: "RF-300CA 11440", part_number: "X1",
    descricao: "Motor DC para robótica", origem: "Fulano", localizacao: "Armário 2", frente_vinculada: "Competição",
  }],
]) {
  const r = await insereItem(CARGO, extra)
  checar(`aceita ${rotulo}`, passa(r), r.erro)
}

// quem pode o quê — não mudou ----------------------------------------------
const membroInsere = await insereItem(MEMBRO)
checar("membro sem cargo não cadastra item", !membroInsere.ok, "GRAVOU")
const novoInsere = await insereItem(NOVO)
checar("conta não aprovada não cadastra item", !novoInsere.ok, "GRAVOU")
const anonInsere = await anon(`insert into public.patrimonio (item, categoria, quantidade, status) values ('x','Livro',1,'Disponível')`)
checar("visitante não cadastra item", !anonInsere.ok, "GRAVOU")
const membroEdita = await como(MEMBRO, `update public.patrimonio set status = 'Baixado' where codigo = 'GEAR-010' returning 1`)
checar("membro sem cargo não edita item", bloqueado(membroEdita))
for (const [quem, rotulo] of [[CARGO, "cargo"], [P, "Presidente"]]) {
  const apaga = await como(quem, `delete from public.patrimonio where codigo = 'GEAR-010' returning 1`)
  checar(`ninguém apaga item (${rotulo}): baixa-se com status 'Baixado'`, bloqueado(apaga))
}
const gatilhoAberto = await tenta(`
  select has_function_privilege('anon', 'public.guardar_codigo_patrimonio()', 'execute') as a,
         has_function_privilege('authenticated', 'public.guardar_codigo_patrimonio()', 'execute') as u`)
checar(
  "a função do gatilho de código não é chamável pela API (e o gatilho dispara mesmo assim, como acima)",
  gatilhoAberto.rows[0]?.a === false && gatilhoAberto.rows[0]?.u === false,
  JSON.stringify(gatilhoAberto.rows[0]),
)

// --- 7. importação da planilha (lib/inventario.ts → SQL) ------------------------
secao("7. IMPORTAÇÃO — o SQL gerado a partir da planilha grava e não sobrescreve")

const CSV_FIXTURE = [
  "ID,Nome,Categoria,Subcategoria,Fabricante,Modelo,Part-number,Descrição,Datasheet,Quantidade,Estado,Observações,Origem,Localização,Responsável",
  `GEAR-501,Arduino Cookbook,Livro,,O'Reilly Media,Terceira Edição,,"Receitas, com ""aspas""\ne quebra de linha",,1,Seminovo,Amassado,Fulano`,
  "GEAR-502,Motor DC RF-300CA,Componentes eletromecânicos,Motor DC,CHIP SCE,RF-300CA 11440,,Motor DC para robótica,https://exemplo.org/rf300.pdf,10,Usado,,Fulano",
  "GEAR-503,LAFVIN 4WD,Robôs e kits robóticos,Carro robô,LAFVIN,V2,,Kit de carro robô,Abrir,1,,,GEAR",
].join("\n")
const importacao = lerPlanilha(CSV_FIXTURE)
checar("a planilha de teste é lida sem erro", importacao.erros.length === 0 && importacao.itens.length === 3, importacao.erros.join(" | "))
const SQL_IMPORTAR = sqlDeImportacao(importacao.itens)

const importou = await tenta(SQL_IMPORTAR)
checar("o SQL gerado executa", importou.ok, importou.erro)
const gravados = await tenta(`select codigo, item, descricao, fabricante, estado, datasheet_url, status, origem from public.patrimonio where codigo like 'GEAR-50_' order by codigo`)
checar("os três itens entraram", gravados.rows.length === 3, `${gravados.rows.length} linha(s)`)
checar(
  "aspa simples, aspas duplas e quebra de linha chegam como estavam",
  gravados.rows[0]?.fabricante === "O'Reilly Media" && gravados.rows[0]?.descricao === 'Receitas, com "aspas"\ne quebra de linha',
  JSON.stringify(gravados.rows[0]),
)
checar("estado em branco entra como nulo; status entra Disponível", gravados.rows[2]?.estado === null && gravados.rows[2]?.status === "Disponível")
checar("o datasheet 'Abrir' não virou link", gravados.rows[2]?.datasheet_url === null && gravados.rows[1]?.datasheet_url === "https://exemplo.org/rf300.pdf")

await como(CARGO, `update public.patrimonio set localizacao = 'Armário 9', status = 'Emprestado', responsavel_atual = 'Ana' where codigo = 'GEAR-501'`)
const denovo = await tenta(SQL_IMPORTAR)
const aposReimportar = await tenta(`select localizacao, status, responsavel_atual from public.patrimonio where codigo = 'GEAR-501'`)
const contagem = await tenta(`select count(*)::int as n from public.patrimonio where codigo like 'GEAR-50_'`)
checar("importar de novo não dá erro nem duplica", denovo.ok && contagem.rows[0]?.n === 3, denovo.erro ?? `${contagem.rows[0]?.n} linhas`)
checar(
  "…e não desfaz o que a diretoria editou no site",
  aposReimportar.rows[0]?.localizacao === "Armário 9" && aposReimportar.rows[0]?.status === "Emprestado" && aposReimportar.rows[0]?.responsavel_atual === "Ana",
  JSON.stringify(aposReimportar.rows[0]),
)
const aposImportacao = await insereItem(CARGO)
checar(
  "o primeiro item cadastrado depois da importação continua a numeração (GEAR-504)",
  aposImportacao.rows[0]?.codigo === "GEAR-504",
  aposImportacao.erro ?? aposImportacao.rows[0]?.codigo,
)
const importacaoDoMembro = await como(MEMBRO, SQL_IMPORTAR)
checar("quem não tem cargo não consegue importar", !importacaoDoMembro.ok, "IMPORTOU")

// --- 8. a 029 sobre um banco que já tinha itens --------------------------------
secao("8. MIGRAÇÃO SOBRE DADOS ANTIGOS — a 029 traduz o que já existia, sem perder nada")

const bancoAntigo = new PGlite()
await bancoAntigo.exec(PREAMBULO)
for (const arquivo of arquivos.filter((f) => f.slice(0, 3) < "029")) {
  await bancoAntigo.exec(readFileSync(path.join(DIR, arquivo), "utf8"))
}
await bancoAntigo.exec(`
  insert into public.patrimonio (item, categoria, quantidade, status, trilha_vinculada, localizacao, observacoes, valor_estimado, created_at) values
    ('Rover bancoAntigo',        'Robô',                       1,   'Disponível', 'Competição', 'Sala 1', 'obs do rover', 1200, '2026-01-01'),
    ('Osciloscópio bancoAntigo', 'Ferramenta',                 1,   'Emprestado', null, null, null, null, '2026-01-02'),
    ('Resistores',          'Consumível',                 500, 'Disponível', null, null, null, null, '2026-01-03'),
    ('Notebook',            'Equipamento de Informática', 1,   'Disponível', null, null, null, null, '2026-01-04'),
    ('Perfil de alumínio',  'Mecânica/Estrutura',         4,   'Disponível', null, null, null, null, '2026-01-05'),
    ('Peça solta',          'Outro',                      1,   'Baixado',    null, null, null, null, '2026-01-06'),
    ('Placa',               'Componente Eletrônico',      2,   'Disponível', null, null, null, null, '2026-01-07');
`)
let erroNoAntigo = ""
try {
  await bancoAntigo.exec(readFileSync(path.join(DIR, arquivos.find((f) => f.startsWith("029"))), "utf8"))
} catch (e) {
  erroNoAntigo = String(e.message).split("\n")[0]
}
checar("a 029 aplica sobre um banco com sete itens antigos", erroNoAntigo === "", erroNoAntigo)

const depois = await bancoAntigo.query(`select codigo, item, categoria, quantidade, frente_vinculada, localizacao, observacoes, valor_estimado::int as valor from public.patrimonio order by codigo`)
checar("nenhum item se perdeu", depois.rows.length === 7, `${depois.rows.length} linhas`)
checar("as quantidades somam o mesmo (510)", depois.rows.reduce((s, x) => s + x.quantidade, 0) === 510)
checar(
  "os códigos seguem a ordem de cadastro, de GEAR-001 a GEAR-007",
  depois.rows.map((x) => x.codigo).join() === "GEAR-001,GEAR-002,GEAR-003,GEAR-004,GEAR-005,GEAR-006,GEAR-007" &&
    depois.rows[0]?.item === "Rover bancoAntigo" && depois.rows[6]?.item === "Placa",
  depois.rows.map((x) => `${x.codigo}=${x.item}`).join(" | "),
)
checar(
  "as categorias antigas viram as da planilha",
  depois.rows.map((x) => x.categoria).join("|") ===
    "Robôs e kits robóticos|Ferramentas|Materiais|Outros|Outros|Outros|Componentes eletrônicos",
  depois.rows.map((x) => x.categoria).join("|"),
)
checar(
  "a trilha vinculada sobrevive como frente_vinculada, com localização, observação e valor",
  depois.rows[0]?.frente_vinculada === "Competição" && depois.rows[0]?.localizacao === "Sala 1" &&
    depois.rows[0]?.observacoes === "obs do rover" && depois.rows[0]?.valor === 1200,
  JSON.stringify(depois.rows[0]),
)
let erroDeNovo = ""
try {
  await bancoAntigo.exec(readFileSync(path.join(DIR, arquivos.find((f) => f.startsWith("029"))), "utf8"))
} catch (e) {
  erroDeNovo = String(e.message).split("\n")[0]
}
const depoisDeNovo = await bancoAntigo.query(`select string_agg(codigo, ',' order by codigo) as c from public.patrimonio`)
checar(
  "reexecutar a 029 não muda os códigos",
  erroDeNovo === "" && depoisDeNovo.rows[0]?.c === "GEAR-001,GEAR-002,GEAR-003,GEAR-004,GEAR-005,GEAR-006,GEAR-007",
  erroDeNovo || depoisDeNovo.rows[0]?.c,
)
await bancoAntigo.close()

// --- placar ------------------------------------------------------------------
await db.close()

console.log(`\n${"─".repeat(60)}`)
console.log(`${passou} passou · ${falhou} falhou`)

if (falhou > 0) {
  console.log("\n\x1b[31mFALHOU.\x1b[0m Cada ✗ acima é uma regra do banco que não vale mais.")
  process.exit(1)
}

console.log("\n\x1b[32mAs regras do banco valem.\x1b[0m")
