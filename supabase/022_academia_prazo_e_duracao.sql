-- =============================================================================
-- GEAR — Academia: data-alvo de conclusão e duração estimada dos módulos
-- Rodar no SQL Editor, DEPOIS de 002_academia.sql (as outras da fila não
-- importam: este arquivo só acrescenta duas colunas ao catálogo).
--
-- NADA DE RLS AQUI. `modulos` é catálogo compartilhado: leitura para membro
-- aprovado (002 + 014) e nenhuma política de escrita, porque editar módulo é
-- tarefa de administração feita pelo painel, onde service_role ignora a RLS.
-- Coluna nova herda exatamente esse arranjo.
--
-- AS DUAS NASCEM VAZIAS. Nullable de propósito: os 9 módulos já existem, e
-- exigir prazo e duração retroativos travaria o catálogo inteiro. A tela diz
-- "sem data-alvo definida" e "duração não estimada" enquanto ninguém preencher
-- — ver os UPDATEs de exemplo no rodapé.
-- =============================================================================

-- 1. DATA-ALVO DE CONCLUSÃO --------------------------------------------------
/*
 * `date` e não `timestamptz`: prazo de formação é combinado por dia ("até 30
 * de outubro"), nunca por hora. Guardar hora convidaria a pergunta "até que
 * horas?", que ninguém quer responder — e traria o problema de fuso de volta
 * para uma coluna que não precisa dele.
 *
 * O prazo é POR MÓDULO, e o prazo do NÍVEL é derivado: a tela toma o maior
 * prazo entre os módulos daquele nível. Uma tabela de níveis só para guardar
 * três datas seria mais estrutura do que o problema pede, e prazo por módulo
 * permite o cronograma fino sem impedir o grosso.
 */
alter table public.modulos
  add column if not exists prazo_conclusao date;

comment on column public.modulos.prazo_conclusao is
  'Data-alvo de conclusão deste módulo. Null = sem prazo. O prazo do nível é o maior prazo entre seus módulos.';

-- 2. DURAÇÃO ESTIMADA --------------------------------------------------------
/*
 * INTEIRO EM MINUTOS, não o texto "2h30min" — e esta é a única decisão do
 * arquivo que diverge do pedido, então vale o parágrafo.
 *
 * Guardado como texto, o campo só serve para ser impresso: não dá para somar
 * a duração dos módulos que faltam, não dá para ordenar, e "2h30min", "2h30",
 * "150min" e "2,5h" convivem na mesma coluna até alguém reparar. Em minutos, a
 * tela formata "2h30min" na saída (formatarDuracao() em lib/academia.ts) e o
 * banco continua respondendo "quanto falta de trilha?" com um sum().
 *
 * O CHECK recusa zero e negativo: módulo de duração zero não é estimativa, é
 * campo preenchido errado.
 */
alter table public.modulos
  add column if not exists duracao_estimada integer
    check (duracao_estimada is null or duracao_estimada > 0);

comment on column public.modulos.duracao_estimada is
  'Duração estimada em MINUTOS (150 = 2h30min). Null = não estimada. A tela formata; o banco soma.';

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. as duas colunas existem (esperado: 2 linhas, ambas nullable)
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'modulos'
--      and column_name in ('prazo_conclusao', 'duracao_estimada');
--
--   -- 2. o CHECK de duração recusa zero (esperado: erro 23514)
--   --    Rode e espere a exceção; nada é gravado.
--   -- update public.modulos set duracao_estimada = 0 where ordem = 1;
--
-- PREENCHER — a tela mostra "sem data-alvo definida" e "duração não estimada"
-- até isto rodar. Os valores abaixo são EXEMPLO, não a combinação da entidade:
--
--   -- duração, módulo a módulo (em minutos)
--   update public.modulos set duracao_estimada = 150
--    where nivel = 'Fundamental' and ordem = 1;   -- 2h30min
--
--   -- prazo por nível, aplicado a todos os módulos dele
--   update public.modulos set prazo_conclusao = date '2026-10-30'
--    where nivel = 'Fundamental';
--   update public.modulos set prazo_conclusao = date '2026-12-15'
--    where nivel = 'Principal';
--   update public.modulos set prazo_conclusao = date '2027-03-31'
--    where nivel = 'Avançada';
--
--   -- conferir o que ficou
--   select nivel, ordem, titulo, duracao_estimada, prazo_conclusao
--     from public.modulos
--    order by array_position(array['Fundamental','Principal','Avançada'], nivel), ordem;
-- =============================================================================
