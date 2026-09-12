-- =============================================================================
-- GEAR — duas correções encontradas em revisão
-- Rodar no SQL Editor, DEPOIS de 004_cargos.sql e 005_ordem_progresso.sql.
-- =============================================================================

-- 1. CARGO SEM LISTA FECHADA -------------------------------------------------
-- `cargo` era text livre. Como a aplicação trata QUALQUER cargo não vazio como
-- "tem acesso ao painel" (lib/administracao.ts: temCargo), um valor digitado
-- errado — 'Presdiente' — dava acesso de administração e, ao mesmo tempo,
-- falhava em e_diretoria(), que compara com a grafia certa. O CHECK põe a
-- lista no banco, como já é feito com trilha, categoria e status.
--
-- Normaliza antes de validar: espaço sobrando quebraria o CHECK.
update public.perfis set cargo = nullif(btrim(cargo), '') where cargo is distinct from nullif(btrim(cargo), '');

-- Qualquer cargo fora da lista vira null em vez de travar a migração: é uma
-- perda de acesso visível e corrigível na tela, não uma migração que não roda.
update public.perfis set cargo = null
 where cargo is not null
   and cargo not in ('Presidente', 'Vice-Presidente', 'Líder de Competição',
                     'Líder de Pesquisa', 'Líder de Projetos', 'Tesouraria', 'Comunicação');

alter table public.perfis drop constraint if exists perfis_cargo_check;
alter table public.perfis add constraint perfis_cargo_check
  check (cargo in ('Presidente', 'Vice-Presidente', 'Líder de Competição',
                   'Líder de Pesquisa', 'Líder de Projetos', 'Tesouraria', 'Comunicação'));

comment on column public.perfis.cargo is 'Lista fechada, espelhada em CARGOS (lib/administracao.ts). Null = sem cargo.';

-- 2. DESMARCAR MÓDULO DEIXAVA A TRILHA INCONSISTENTE -------------------------
-- 005 impede CONCLUIR fora de ordem, mas não impedia DESCONCLUIR um módulo
-- que já tinha módulos posteriores concluídos: desmarcar o 1 deixava o 2 e o
-- 3 marcados, um estado que o próprio trigger de 005 nunca teria permitido
-- criar. Aqui, desmarcar um módulo desmarca também os seguintes do mesmo
-- nível — é a leitura sequencial levada até o fim.
create or replace function public.cascatear_desconclusao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nivel_alvo text;
  ordem_alvo integer;
begin
  select m.nivel, m.ordem into nivel_alvo, ordem_alvo
  from public.modulos m
  where m.id = new.modulo_id;

  if not found then
    return null;
  end if;

  /*
   * Sem recursão infinita: as linhas atingidas ficam com concluido_em null,
   * e este trigger só age quando concluido_em passou de preenchido para null.
   */
  update public.progresso p
     set concluido_em = null
    from public.modulos m
   where m.id = p.modulo_id
     and p.usuario_id = new.usuario_id
     and m.nivel = nivel_alvo
     and m.ordem > ordem_alvo
     and p.concluido_em is not null;

  return null;
end;
$$;

drop trigger if exists progresso_cascatear_desconclusao on public.progresso;
create trigger progresso_cascatear_desconclusao
  after update of concluido_em on public.progresso
  for each row
  when (old.concluido_em is not null and new.concluido_em is null)
  execute function public.cascatear_desconclusao();

-- Conferência:
-- select p.cargo, count(*) from public.perfis p group by 1;
-- select m.nivel, m.ordem, pr.concluido_em from public.progresso pr
--   join public.modulos m on m.id = pr.modulo_id
--  where pr.usuario_id = 'UUID' order by m.nivel, m.ordem;
