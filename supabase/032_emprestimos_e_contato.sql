-- =============================================================================
-- GEAR — inventário para todo membro (com retirada e devolução) e contato
-- opcional no perfil
-- Rodar no SQL Editor, DEPOIS de 031_academia_gerenciavel.sql. Pode rodar mais
-- de uma vez.
--
-- 1. Até aqui só quem tem cargo enxergava o patrimônio (003). Quem está em
--    formação não sabia que peças existem nem a quem pedir. Agora todo membro
--    aprovado LÊ o inventário; editar e cadastrar continua com quem tem cargo.
-- 2. Retirar e devolver passam por duas funções, não por UPDATE liberado: o
--    membro só pode mexer em status/responsável, e só no próprio empréstimo.
--    Uma policy de UPDATE não sabe limitar colunas; a função sabe.
-- 3. Contato (WhatsApp, GitHub, LinkedIn) é opcional e preenchido pelo dono.
--    Só aparece para membro aprovado (mesma leitura de perfis da 009/014).
-- =============================================================================

-- 1. QUEM ESTÁ COM O ITEM ----------------------------------------------------
-- `responsavel_atual` (003) é texto livre e continua: serve para "Lab 2",
-- "Prof. Fulano". `emprestado_para` é o vínculo que a devolução confere.
alter table public.patrimonio
  add column if not exists emprestado_para uuid references public.perfis (id) on delete set null;

-- Sair de "Emprestado" por qualquer caminho (inclusive o select da Gestão)
-- limpa o vínculo, para ninguém aparecer com um item que já voltou.
create or replace function public.limpar_emprestimo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'Emprestado' then
    new.emprestado_para := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.limpar_emprestimo() from public, anon, authenticated;

drop trigger if exists limpar_emprestimo on public.patrimonio;
create trigger limpar_emprestimo
  before insert or update on public.patrimonio
  for each row execute function public.limpar_emprestimo();

-- 2. MEMBRO LÊ O INVENTÁRIO --------------------------------------------------
drop policy if exists "patrimonio: membro lê" on public.patrimonio;
create policy "patrimonio: membro lê"
  on public.patrimonio for select to authenticated
  using (public.e_membro());

-- 3. RETIRAR E DEVOLVER ------------------------------------------------------
-- ponytail: o empréstimo é do item inteiro. Um kit com 650 capacitores sai
-- inteiro; retirada parcial exigiria uma tabela de movimentações.
create or replace function public.retirar_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.e_membro() then
    raise exception 'Só membro aprovado retira item.' using errcode = '42501';
  end if;

  update public.patrimonio p
     set status = 'Emprestado',
         emprestado_para = (select auth.uid()),
         responsavel_atual = (select nome_completo from public.perfis where id = (select auth.uid()))
   where p.id = p_id and p.status = 'Disponível';

  if not found then
    raise exception 'Este item não está disponível para retirada.' using errcode = 'GE004';
  end if;
end;
$$;

create or replace function public.devolver_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- quem pegou devolve; quem tem cargo também, para resolver o item esquecido
  update public.patrimonio p
     set status = 'Disponível',
         responsavel_atual = null
   where p.id = p_id
     and p.status = 'Emprestado'
     and public.e_membro()
     and (p.emprestado_para = (select auth.uid()) or public.tem_cargo());

  if not found then
    raise exception 'Este item não está emprestado para você.' using errcode = 'GE004';
  end if;
end;
$$;

revoke execute on function public.retirar_item(uuid) from public, anon;
revoke execute on function public.devolver_item(uuid) from public, anon;
grant execute on function public.retirar_item(uuid) to authenticated;
grant execute on function public.devolver_item(uuid) to authenticated;

-- 4. CONTATO NO PERFIL -------------------------------------------------------
alter table public.perfis add column if not exists whatsapp text;
alter table public.perfis add column if not exists github text;
alter table public.perfis add column if not exists linkedin text;

-- só dígitos, com DDD e opcionalmente o 55: vira link wa.me na tela
alter table public.perfis drop constraint if exists perfis_whatsapp_formato;
alter table public.perfis add constraint perfis_whatsapp_formato
  check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$');

-- usuário do GitHub: letras, números e hífen, até 39 (regra do próprio GitHub)
alter table public.perfis drop constraint if exists perfis_github_formato;
alter table public.perfis add constraint perfis_github_formato
  check (github is null or github ~ '^[A-Za-z0-9-]{1,39}$');

-- link inteiro, só https do linkedin: vira href na tela
alter table public.perfis drop constraint if exists perfis_linkedin_formato;
alter table public.perfis add constraint perfis_linkedin_formato
  check (linkedin is null or (linkedin ~* '^https://([a-z]+\.)?linkedin\.com/' and char_length(linkedin) <= 200));

-- guardar_cargo() (023) não conhece estas colunas: sem isto a diretoria, que
-- edita perfil alheio, poderia trocar o WhatsApp de alguém.
create or replace function public.guardar_contato()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (select auth.uid()) is distinct from old.id
     and (new.whatsapp, new.github, new.linkedin) is distinct from (old.whatsapp, old.github, old.linkedin) then
    raise exception 'Contato só o próprio dono altera.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.guardar_contato() from public, anon, authenticated;

drop trigger if exists guardar_contato on public.perfis;
create trigger guardar_contato
  before update on public.perfis
  for each row execute function public.guardar_contato();
