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
| 023 | `frente_travada_e_leituras_fechadas.sql` | cargo não troca a própria frente; métricas só para membro aprovado; documentos exigem aprovação; período fechado imutável | 014, 019 |
| 024 | `diretoria_minima_e_limites_do_bucket.sql` | ninguém tira o último cargo de diretoria aprovado; bucket `documentos` com 20 MB e lista de tipos (sem SVG) no próprio Storage | 006, 023 |
| 025 | `catalogo_de_documentos.sql` | `documentos` ganha resumo, pacote, tags, `publico`, `status` e `anexos`; gatilho que só deixa a diretoria publicar; view `documentos_publicos`; arquivo de documento vigente e público aberto a anônimo | 006, 014, 023, 024 |
| 026 | `catalogo_inicial.sql` | os 50 documentos do catálogo, todos como rascunho (**gerado**: `npm run catalogo:sql`) | 025 |
| 027 | `calendario_completo.sql` | `eventos` ganha local, link, dia inteiro e repetição (semanal, quinzenal, mensal); tabela `eventos_presencas` (vou/talvez/não vou por ocorrência); `calendario_assinaturas` e duas funções para o feed `.ics` por link. **Aditiva**: o site roda sem ela, só sem os recursos novos | 008, 014, 016 |
| 028 | `revisao_de_seguranca.sql` | o cadastro só aceita e-mail `@ufscar.br` ou `@estudante.ufscar.br` **no servidor** (antes só a tela conferia); `EXECUTE` das funções de gatilho `SECURITY DEFINER` fechado para `anon` e `authenticated`; remove três políticas velhas de `sprints` que sobraram em produção. Não apaga dado e não muda o que um membro consegue fazer | 001, 004, 005, 007, 012, 018, 025 |
| 029 | `inventario.sql` | `patrimonio` ganha as colunas da planilha do grupo: **código** `GEAR-NNN` (único, gerado sozinho, imutável), subcategoria, fabricante, modelo, part-number, descrição, link de datasheet (só http/https), **estado** de conservação e origem; as 7 categorias antigas viram as 9 da planilha (+ "Outros"); corrige `trilha_vinculada` → `frente_vinculada`, que a 013 esqueceu e que fazia a página de Patrimônio dar erro. Não apaga dado e não muda a RLS | 003, 015, 019 |
| 030 | `apagar_atas_e_documentos.sql` | a **diretoria** pode apagar atas e documentos (os outros cargos continuam só criando e corrigindo). O arquivo no bucket não é apagado junto | 003, 006, 013 |
| 031 | `academia_gerenciavel.sql` | quem tem cargo cria e corrige **módulos** da Academia pelo site (a diretoria apaga, o que leva junto o progresso de todos naquele módulo); quem tem cargo lê o **progresso** de todos, para o painel de Gestão; CHECKs de tamanho e link http/https em `modulos` | 002, 014, 022 |
| 032 | `emprestimos_e_contato.sql` | todo membro aprovado **lê o inventário**; `retirar_item()` e `devolver_item()` (SECURITY DEFINER) fazem o empréstimo do item inteiro, gravando `patrimonio.emprestado_para`; perfil ganha `whatsapp`, `github` e `linkedin` opcionais, com CHECK de formato e gatilho que impede outra pessoa (inclusive a diretoria) de mudá-los | 014, 029, 031 |
| 033 | `tarefas_horas_caixa_selecao.sql` | `sprint_tarefas` (o responsável sem cargo só marca feita); `emprestimos` com prazo e `retirar_item(uuid, date)` no lugar da versão da 032; `eventos_chamada` e `horas_lancadas` para as horas de extensão; `selecao` (etapa e notas da banca, só cargo lê); `e_financeiro()`, `caixa_lancamentos` e `pedidos_compra` com decisão carimbada pelo banco; `perfis` ganha `bio` e `novidades_vistas_em`, protegidos pelo `guardar_contato()`; a motivação do candidato fica em `candidaturas` (só o dono e quem tem cargo leem); ninguém registra as próprias horas; autoria das tabelas novas carimbada por `carimbar_autor()`. Só cria, não apaga dado | 021, 027, 032 |
| 034 | `horas_sobrevivem_ao_evento.sql` | `eventos_chamada` ganha `id` como chave e `atividade` (nome do evento congelado no registro por gatilho); apagar o evento deixa `evento_id` nulo em vez de apagar as horas. Não apaga dado | 033 |

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
escrita, os predicados de autorização não são chamáveis, o bucket não lista e a
vitrine de documentos só entrega arquivo de documento vigente.
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

-- 028: o gatilho de cadastro existe? (esperado: 1 linha, tgenabled = 'O')
select tgname, tgenabled from pg_trigger where tgname = 'exigir_email_institucional';

-- 028: alguma função de gatilho SECURITY DEFINER ainda executável pela API? (esperado: 0 linhas)
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
   and (has_function_privilege('anon', p.oid, 'execute')
     or has_function_privilege('authenticated', p.oid, 'execute'));

-- 029: a coluna se chama frente_vinculada e a antiga sumiu? (esperado: 1 linha, frente_vinculada)
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'patrimonio'
   and column_name in ('frente_vinculada', 'trilha_vinculada');

-- 029: o gatilho do código existe? (esperado: 1 linha, tgenabled = 'O')
select tgname, tgenabled from pg_trigger where tgname = 'guardar_codigo_patrimonio';

-- 029: total do inventário (planilha original: 66 itens, 7.260 unidades)
select count(*) as itens, sum(quantidade) as unidades from public.patrimonio;
```

## Carregar o inventário da planilha

A 029 só prepara a tabela. Os itens entram por um `insert` gerado a partir do
CSV da aba "Inventário" (Google Planilhas → Arquivo → Fazer download → Valores
separados por vírgulas):

```
npm run inventario:sql -- Inventario.csv > importar.sql
```

O resultado vai para o SQL Editor. Ele é **um comando só** (`insert … on
conflict (codigo) do nothing`):

- é atômico: entra tudo ou nada, e o gerador nem imprime SQL se alguma linha for
  recusada;
- pode ser repetido sem medo: item que já existe não é tocado, então o que a
  diretoria editou no site (local, responsável, status) sobrevive;
- só acrescenta. Para **mudar** um item existente, edite-o em
  `/membros/administracao/patrimonio`.

O CSV **não** fica no repositório, que é público: ele traz o nome de quem cedeu
cada item. O que fica é o gerador e as regras (`lib/inventario.ts`).

Limitação conhecida: o CSV do Google Planilhas perde o destino dos links
(células que mostram só "Abrir"). O gerador avisa quais linhas perderam o
datasheet; o link se cola depois, editando o item no site.

Depois de importar, o site exporta o inventário de volta em CSV (botão "Exportar
CSV" na mesma página), no formato que o próprio gerador lê.

## Testar sem tocar em produção

```
npm run test:banco
```

Sobe um Postgres em memória (PGlite — sem Docker, sem rede, sem segredo),
aplica `001…NNN` em ordem e ataca o resultado trocando de papel como o
PostgREST faz: `anon`, `authenticated` com um `sub` de JWT e
`supabase_auth_admin` (quem insere em `auth.users` no cadastro). Cobre o que o
`test:rls` não alcança por ser anônimo e por ficar em produção:

- as migrações aplicam num banco vazio, e a 027, a 028 e a 029 podem ser reexecutadas;
- o cadastro recusa e-mail fora da UFSCar (incluindo `x@ufscar.br@gmail.com`);
- as funções de gatilho não têm `EXECUTE` para a API **e continuam disparando**
  — cadastro, trava de cargo, ordem da Academia, publicação de documento;
- conta nova não se aprova, cargo sem aprovação não lê atas nem patrimônio,
  autoria não se forja, cargo não troca a própria frente, o último Presidente
  não se tranca para fora;
- o que o visitante vê dos documentos e do calendário (feed por token).
- o inventário (029): código gerado em sequência e imutável, categoria, estado e
  datasheet fora da lista recusados (inclusive `javascript:`), a importação
  repetida não duplica nem sobrescreve, e a migração sobre uma tabela **com
  dados antigos** traduz categorias e preserva o que existia.

`npm run test:inventario` cobre as regras puras do inventário (leitura do CSV,
busca, totais conferidos com a aba "Resumo" da planilha, proteção contra fórmula
em planilha) e também roda em todo PR.

Roda também no GitHub (`.github/workflows/verificacao.yml`), em todo PR.

Para ver o que uma migração protege, rode **sem** ela:

```
npm run test:banco -- --sem=028
```

Cada `✗` é uma regra que deixa de valer. (Pular uma migração no meio da cadeia
pode quebrar as seguintes; faz sentido principalmente com a última.)

**O que ele não é:** não é o GoTrue nem o Storage — `auth.users`, `auth.uid()` e
o bucket são substitutos mínimos. Testa o SQL do repositório, não prova que a
migração foi aplicada em produção; para isso, as consultas de "Conferir o que
já rodou" acima e `npm run test:rls`.

## Reaplicar

A maioria é idempotente: `create table if not exists`, `create or replace
function`, `drop policy if exists` seguido de `create policy`. Rodar duas vezes
não quebra nada.

**A exceção é a 015.** Ela usa `alter table … add constraint` sem
`if not exists`, que é o único jeito de escrever CHECK nomeado em Postgres —
uma segunda execução falha com `constraint já existe`. Isso é ruído, não
estrago: significa que ela já rodou.
