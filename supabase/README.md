# Migrações

Não há Supabase CLI neste projeto. Cada arquivo é rodado **à mão, na ordem, no
SQL Editor do painel** — o que significa que a única garantia de que uma
migração foi aplicada é alguém ter conferido. Este arquivo existe para tornar
essa conferência rápida em vez de arqueológica.

> Um arquivo commitado **não é** uma migração aplicada. O site não muda de
> aparência quando falta rodar uma delas: quem descobre é o membro que clica e
> recebe erro, ou o atacante que encontra a política antiga ainda de pé.

## Ordem

A ordem não é sugestão. Cada dependência abaixo é uma migração que **falha** se
a anterior não rodou.

| # | Arquivo | O que faz | Depende de |
|---|---|---|---|
| 001 | `perfis.sql` | `perfis`, RLS por dono, `handle_new_user()` | — |
| 002 | `academia.sql` | `modulos`, `progresso`, os 9 módulos | 001 |
| 003 | `administracao.sql` | `patrimonio`, `atas` | 001 |
| 004 | `cargos.sql` | `e_diretoria()`, `guardar_cargo()`, auditoria de cargo | 001 |
| 005 | `ordem_progresso.sql` | trava sequencial da Academia no banco | 002 |
| 006 | `documentos.sql` | `documentos` + bucket privado | 001 |
| 007 | `correcoes.sql` | CHECK na lista de cargos | 004, 005 |
| 008 | `eventos_avisos_sprints.sql` | `eventos`, `avisos`, `sprints`, `tem_cargo()` | 001 |
| 009 | `diretorio.sql` | membros leem todos os perfis | 004 |
| 010 | `sprints_por_trilha.sql` | escrita de sprint só na própria frente | 008 |
| 011 | `sprints_diretoria.sql` | diretoria escreve em qualquer frente | 010 |
| 012 | `termos_aceitos.sql` | registro de aceite do Regimento | 001 |
| 013 | `frentes_e_diretores.sql` | renomeia `trilha`→`frente`, `Líder`→`Diretor` | 011 |
| 014 | `aprovacao_de_membros.sql` | `aprovado`, `e_membro()`, fecha 6 `using(true)` | 013 |
| 015 | `limites_de_texto.sql` | 16 CHECKs de tamanho | 014 |
| 016 | `autoria_e_predicados.sql` | autoria carimbada, predicados fechados | 014 |
| 017 | `metas.sql` | `metas` pessoais, leitura mista dono/pública | 016 |
| 018 | `perfil_do_proprio_dono.sql` | perfil que falta criado pelo dono; fecha o INSERT | 014 |
| 019 | `metricas.sql` | `metricas_periodo`, valor no patrimônio, view pública | 016 |
| 020 | `sprints_responsavel_e_proximo_passo.sql` | `sprints.responsavel_id` (FK em `perfis`) e `sprints.proximo_passo` | 011 |
| 021 | `sprints_progresso_bloqueado_e_diario.sql` | `sprints.progresso`, status `Bloqueado`, `sprint_atualizacoes`, `pode_editar_sprint()` | 020 |
| 022 | `academia_prazo_e_duracao.sql` | `modulos.prazo_conclusao` e `modulos.duracao_estimada` (minutos) | 002 |

Duas armadilhas conhecidas:

- **013 antes de 014.** `guardar_cargo()`, reescrito na 014, referencia
  `perfis.frente`. Sem a 013 a coluna ainda se chama `trilha` e a 014 falha.
- **007 antes de 013.** O CHECK da 007 usa os nomes antigos (`Líder de …`); a
  013 derruba o CHECK, converte os valores e recria com `Diretor de …`. Na
  ordem inversa, a conversão não encontra o que converter.

## Conferir o que já rodou

```
npm run test:rls
```

O teste fala com o projeto real usando a chave anônima do site e verifica a
**fronteira anônima**: nenhuma tabela interna devolve linha, nenhuma aceita
escrita, os predicados de autorização não são chamáveis e o bucket não lista.
Ele não cria, não altera e não apaga nada. Sai com código 1 se qualquer
verificação falhar, então serve em CI sem adaptação.

O que ele **não** cobre: tudo que só aparece com sessão. Um membro aprovado
lendo o que não deveria, um cargo escrevendo fora da frente, o carimbo de
autoria. Para isso é preciso sessão de teste, e a criação dela é decisão da
diretoria — está anotado como pendência em `DEPLOY.md`.

Para o resto, rode no SQL Editor:

```sql
-- tabelas que existem
select table_name from information_schema.tables
 where table_schema = 'public' order by 1;

-- 005: a trava de ordem da Academia existe?
select count(*) from pg_trigger where tgname = 'progresso_validar_ordem';

-- 007 + 013: o CHECK de cargo usa "Diretor de" e não "Líder de"?
select pg_get_constraintdef(oid) from pg_constraint where conname like '%cargo%';

-- 009: membros leem todos os perfis?
select policyname from pg_policies where tablename = 'perfis' and cmd = 'SELECT';

-- 010 + 011: sprints tem 4 policies, escrita por diretoria ou diretor da frente?
select policyname, cmd from pg_policies where tablename = 'sprints' order by cmd;

-- 013: a coluna se chama frente?
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'perfis' and column_name in ('trilha','frente');

-- 015: os 16 CHECKs de tamanho existem?
select count(*) from pg_constraint where conname like '%\_tam';
```

```sql
-- 020: o responsável do sprint aponta para perfis (e não para auth.users)?
select confrelid::regclass from pg_constraint where conname = 'sprints_responsavel_id_fkey';

-- 021: o CHECK de status já aceita 'Bloqueado'?
select pg_get_constraintdef(oid) from pg_constraint where conname = 'sprints_status_check';

-- 021: o diário existe com RLS e 2 policies (SELECT e INSERT)?
select cmd, policyname from pg_policies where tablename = 'sprint_atualizacoes' order by cmd;
```

## Reaplicar

A maioria é idempotente: `create table if not exists`, `create or replace
function`, `drop policy if exists` seguido de `create policy`. Rodar duas vezes
não quebra nada.

**A exceção é a 015.** Ela usa `alter table … add constraint` sem
`if not exists`, que é o único jeito de escrever CHECK nomeado em Postgres —
uma segunda execução falha com `constraint já existe`. Isso é ruído, não
estrago: significa que ela já rodou.
