-- =============================================================================
-- GEAR — lista de quem quer ser avisado do próximo ciclo
-- Rodar no SQL Editor, DEPOIS de 036_vice_diretores.sql. Pode rodar mais de
-- uma vez. Só cria; não apaga nem muda dado.
--
-- Antes, "Quero ser avisado" em /ingressar abria um mailto: quem não tem
-- cliente de e-mail configurado no celular parava ali, e quem escrevia virava
-- uma mensagem solta na caixa do Gmail, sem lista para avisar quando o ciclo
-- abrir. Agora o visitante deixa o e-mail no próprio site.
--
-- Anônimo NÃO toca na tabela: só chama entrar_na_lista_de_espera(), que
-- insere e ignora repetido sem dizer se o e-mail já estava lá (não dá para
-- usar o formulário para descobrir quem se inscreveu). Ler e apagar é de quem
-- tem cargo, em /membros/administracao/selecao. Dado pessoal mínimo: só o
-- e-mail, e a política de privacidade diz para que serve e quando sai.
--
-- O CHECK aceita só caracteres de endereço: `?`, `&` e `=` ficam de fora porque
-- a lista vira um mailto: em Seleção, e um "e-mail" como a@b.com&body=... iria
-- injetar texto na mensagem que a diretoria envia.
-- =============================================================================

create table if not exists public.lista_de_espera (
  email text primary key
    check (email = lower(email) and length(email) <= 254 and email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  criado_em timestamptz not null default now()
);

alter table public.lista_de_espera enable row level security;

drop policy if exists "lista_de_espera: cargo lê" on public.lista_de_espera;
create policy "lista_de_espera: cargo lê" on public.lista_de_espera
  for select to authenticated using (public.tem_cargo());

drop policy if exists "lista_de_espera: cargo apaga" on public.lista_de_espera;
create policy "lista_de_espera: cargo apaga" on public.lista_de_espera
  for delete to authenticated using (public.tem_cargo());

create or replace function public.entrar_na_lista_de_espera(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.lista_de_espera (email)
  values (lower(trim(p_email)))
  on conflict (email) do nothing
$$;

revoke execute on function public.entrar_na_lista_de_espera(text) from public;
grant execute on function public.entrar_na_lista_de_espera(text) to anon, authenticated;
