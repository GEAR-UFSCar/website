-- =============================================================================
-- GEAR — a área de membros deixa de ser só leitura para quem não tem cargo
-- Rodar no SQL Editor, DEPOIS de 037_lista_de_espera.sql. Pode rodar mais de
-- uma vez. Só amplia e aperta regra; não apaga nem muda dado.
--
-- A revisão de 09/11/2026 achou o motivo de o quadro de sprints não ter vida:
-- só quem tem cargo NA MESMA trilha escrevia nele (021). Membro sem cargo, mesmo
-- sendo o responsável pelo sprint, não registrava o que fez nem o próximo passo
-- — e a tela Hoje pedia exatamente isso a ele.
--
--   1. PARTICIPAR DO SPRINT: o responsável e os membros da trilha escrevem no
--      diário, criam tarefa e atualizam o ANDAMENTO (progresso, próximo passo e
--      status, menos concluir). Título, descrição, datas, responsável, concluir
--      e apagar continuam com quem edita o sprint (021).
--   2. ATAS: todo membro aprovado lê (Regimento art. 35, § 1º). Escrever
--      continua com quem tem cargo.
--   3. FORMULÁRIO ENVIADO: só o autor muda o conteúdo. Quem aprova, aprova ou
--      devolve — não reescreve o que outra pessoa assinou.
--   4. CONTA NÃO APROVADA não grava metas nem progresso (ponta solta da 017/002).
--   5. LISTA DE ESPERA: teto de inscrições por hora, para o formulário público
--      não servir de torneira.
-- =============================================================================

-- 1. PARTICIPAR DO SPRINT -------------------------------------------------------
-- Sem `security definer`, pelo mesmo motivo de pode_editar_sprint (021): a
-- consulta roda sob a RLS de quem pede, que já lê `sprints` e `perfis` se for
-- membro aprovado.
create or replace function public.participa_do_sprint(sprint uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.e_membro()
     and exists (
       select 1
         from public.sprints s
         join public.perfis  p on p.id = (select auth.uid())
        where s.id = sprint
          and (s.responsavel_id = p.id or p.frente = s.frente)
     );
$$;

comment on function public.participa_do_sprint(uuid) is
  'Membro aprovado que é o responsável pelo sprint ou é da mesma trilha. Escreve diário, tarefa e andamento; não edita o sprint (isso é pode_editar_sprint).';

revoke execute on function public.participa_do_sprint(uuid) from public, anon;
grant  execute on function public.participa_do_sprint(uuid) to authenticated, service_role;

-- Diário: quem edita o sprint OU participa dele.
drop policy if exists "sprint_atualizacoes: insert de quem edita o sprint" on public.sprint_atualizacoes;
drop policy if exists "sprint_atualizacoes: insert de quem edita ou participa" on public.sprint_atualizacoes;
create policy "sprint_atualizacoes: insert de quem edita ou participa"
  on public.sprint_atualizacoes for insert to authenticated
  with check (public.pode_editar_sprint(sprint_id) or public.participa_do_sprint(sprint_id));

-- Tarefas: participante cria. Editar e apagar seguem a 033 (quem edita o
-- sprint; o responsável pela tarefa só marca `feita`).
drop policy if exists "sprint_tarefas: quem edita o sprint cria" on public.sprint_tarefas;
drop policy if exists "sprint_tarefas: quem edita ou participa cria" on public.sprint_tarefas;
create policy "sprint_tarefas: quem edita ou participa cria"
  on public.sprint_tarefas for insert to authenticated
  with check (public.pode_editar_sprint(sprint_id) or public.participa_do_sprint(sprint_id));

-- Andamento do sprint: a policy libera a linha para o participante e o gatilho
-- abaixo recusa qualquer coluna além das três de andamento. Uma policy de
-- UPDATE não sabe limitar colunas; o gatilho sabe (mesma técnica da 033).
drop policy if exists "sprints: participante atualiza andamento" on public.sprints;
create policy "sprints: participante atualiza andamento"
  on public.sprints for update to authenticated
  using (public.participa_do_sprint(id))
  with check (public.participa_do_sprint(id));

create or replace function public.guardar_andamento_sprint()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- colunas que o participante muda; as duas últimas são carimbadas por
  -- outros gatilhos (016) e por isso também ficam fora da comparação
  livres constant text[] := array['progresso', 'proximo_passo', 'status', 'updated_at', 'atualizado_por'];
begin
  if (select auth.uid()) is null or public.pode_editar_sprint(old.id) then
    return new;
  end if;

  -- compara a linha inteira menos as colunas livres: coluna nova nasce protegida
  if (to_jsonb(new) - livres) is distinct from (to_jsonb(old) - livres) then
    raise exception 'Você pode atualizar progresso, próximo passo e status. O resto do sprint é de quem tem cargo na trilha.'
      using errcode = '42501';
  end if;

  -- concluir e reabrir é decisão de quem responde pela trilha
  if new.status is distinct from old.status and 'Concluído' in (new.status, old.status) then
    raise exception 'Concluir ou reabrir um sprint é de quem tem cargo na trilha.' using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke execute on function public.guardar_andamento_sprint() from public, anon, authenticated;

-- O nome ordena o gatilho depois de `sprints_carimbar_atualizador` e antes de
-- `sprints_tocar_updated_at`; as duas colunas deles estão em `livres`.
drop trigger if exists sprints_guardar_andamento on public.sprints;
create trigger sprints_guardar_andamento
  before update on public.sprints
  for each row execute function public.guardar_andamento_sprint();

-- 2. ATAS ABERTAS AOS MEMBROS ---------------------------------------------------
-- Política somada à "select com cargo" (016): SELECT passa se qualquer uma passar.
drop policy if exists "atas: membro lê" on public.atas;
create policy "atas: membro lê"
  on public.atas for select to authenticated
  using (public.e_membro());

-- 3. FORMULÁRIO ENVIADO: SÓ O AUTOR MUDA O CONTEÚDO ------------------------------
-- A 035 deixava quem tem cargo editar `dados` de um registro alheio e, em
-- seguida, aprová-lo: a assinatura do autor ficava sob um texto que ele não
-- escreveu. O gatilho novo roda ANTES de guardar_registro (ordem alfabética) e
-- só olha conteúdo; status, numeração e decisão continuam na 035.
create or replace function public.conteudo_do_autor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and old.status <> 'rascunho'
     and (select auth.uid()) is distinct from old.autor_id
     and (new.dados, new.titulo) is distinct from (old.dados, old.titulo) then
    raise exception 'Só o autor altera o conteúdo de um registro enviado. Devolva para correção.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.conteudo_do_autor() from public, anon, authenticated;

drop trigger if exists conteudo_do_autor on public.registros;
create trigger conteudo_do_autor
  before update on public.registros
  for each row execute function public.conteudo_do_autor();

-- 4. CONTA NÃO APROVADA NÃO GRAVA METAS NEM PROGRESSO ----------------------------
-- Ler e apagar o que é próprio continua como estava; só a escrita ganha a
-- exigência de aprovação. `alter policy` mantém nome e papel.
alter policy "metas: insert do dono" on public.metas
  with check (usuario_id = (select auth.uid()) and public.e_membro());
alter policy "metas: update do dono" on public.metas
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and public.e_membro());

alter policy "progresso: criar o próprio" on public.progresso
  with check ((select auth.uid()) = usuario_id and public.e_membro());
alter policy "progresso: editar o próprio" on public.progresso
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id and public.e_membro());

-- 5. LISTA DE ESPERA COM TETO ----------------------------------------------------
-- O formulário é público e não tem como saber quem está do outro lado. O teto
-- é global e por hora: um ciclo de divulgação real não chega perto dele, e um
-- script que tente encher a tabela para em 40 linhas. O total também tem teto.
create or replace function public.entrar_na_lista_de_espera(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.lista_de_espera where criado_em > now() - interval '1 hour') >= 40
     or (select count(*) from public.lista_de_espera) >= 3000 then
    raise exception 'Muitas inscrições agora. Tente de novo mais tarde.' using errcode = 'GE007';
  end if;

  insert into public.lista_de_espera (email)
  values (lower(trim(p_email)))
  on conflict (email) do nothing;
end;
$$;

revoke execute on function public.entrar_na_lista_de_espera(text) from public;
grant execute on function public.entrar_na_lista_de_espera(text) to anon, authenticated;
