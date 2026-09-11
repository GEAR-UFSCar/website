-- =============================================================================
-- GEAR — gestão de cargo pela diretoria (Opção B)
-- Rodar no SQL Editor, DEPOIS de 001_perfis.sql.
-- =============================================================================

-- 1. TRILHA DE AUDITORIA -----------------------------------------------------
alter table public.perfis
  add column if not exists cargo_atualizado_por uuid references auth.users (id) on delete set null,
  add column if not exists cargo_atualizado_em  timestamptz;

comment on column public.perfis.cargo_atualizado_por is 'Quem alterou o cargo pela última vez. Preenchido por trigger.';

-- 2. QUEM É DIRETORIA --------------------------------------------------------
-- security definer é OBRIGATÓRIO aqui: uma policy em `perfis` que consultasse
-- `perfis` diretamente causaria recursão infinita (42P17). A função roda fora
-- da RLS e quebra o ciclo.
create or replace function public.e_diretoria()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid())
      and p.cargo in ('Presidente', 'Vice-Presidente')
  );
$$;

-- 3. POLÍTICAS ---------------------------------------------------------------
-- Políticas permissivas se somam (OR): estas convivem com as de "o próprio".
drop policy if exists "perfis: diretoria lê todos" on public.perfis;
create policy "perfis: diretoria lê todos"
  on public.perfis for select
  to authenticated
  using (public.e_diretoria());

drop policy if exists "perfis: diretoria edita cargo" on public.perfis;
create policy "perfis: diretoria edita cargo"
  on public.perfis for update
  to authenticated
  using (public.e_diretoria())
  with check (public.e_diretoria());

-- 4. TRIGGER: o que a RLS não consegue fazer ---------------------------------
-- RLS é por LINHA, não por COLUNA. Sem este trigger, duas coisas passariam:
--   a) a diretoria poderia reescrever nome/curso/trilha de qualquer pessoa;
--   b) qualquer membro poderia se autopromover editando o próprio cargo,
--      porque a policy "perfis: editar o próprio" permite update da linha.
create or replace function public.guardar_cargo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  -- Sem sessão = SQL Editor ou service_role, que já são confiáveis e ignoram
  -- RLS. É também o que permite a promoção do primeiro Presidente.
  if atual is null then
    return new;
  end if;

  -- Em perfil de outra pessoa, só o cargo pode mudar.
  if atual is distinct from old.id then
    if (new.id, new.nome_completo, new.curso, new.trilha, new.created_at)
       is distinct from (old.id, old.nome_completo, old.curso, old.trilha, old.created_at) then
      raise exception 'Em perfil de outra pessoa, apenas o cargo pode ser alterado.';
    end if;
  end if;

  if new.cargo is distinct from old.cargo then
    if not public.e_diretoria() then
      raise exception 'Apenas Presidente ou Vice-Presidente podem alterar cargo.';
    end if;
    new.cargo_atualizado_por := atual;
    new.cargo_atualizado_em  := now();
  else
    -- ninguém reescreve a auditoria num update comum de perfil
    new.cargo_atualizado_por := old.cargo_atualizado_por;
    new.cargo_atualizado_em  := old.cargo_atualizado_em;
  end if;

  return new;
end;
$$;

drop trigger if exists perfis_guardar_cargo on public.perfis;
create trigger perfis_guardar_cargo
  before update on public.perfis
  for each row execute function public.guardar_cargo();

-- 5. PROMOÇÃO DO PRIMEIRO PRESIDENTE -----------------------------------------
-- Única promoção feita no banco. Troque o e-mail e rode; daí em diante tudo
-- acontece em /membros/administracao/cargos.
--
--   update public.perfis set cargo = 'Presidente'
--   where id = (select id from auth.users where email = 'TROQUE@ufscar.br');
--
-- Conferência:
--   select p.cargo, u.email from public.perfis p join auth.users u on u.id = p.id
--   where p.cargo is not null;
