-- =============================================================================
-- 040 — teto de inscrições anônimas na lista de espera
--
-- entrar_na_lista_de_espera() é chamável por `anon` direto em
-- /rest/v1/rpc/..., com a chave pública que está no bundle. Sem teto, um
-- script enche a tabela com milhares de endereços (falsos ou de terceiros) e
-- o mailto: que a diretoria monta em Seleção vira inutilizável.
--
-- Teto GLOBAL por hora, não por IP: PostgREST não entrega IP confiável à
-- função. Ciclo de seleção real não passa de dezenas por hora; acima disso a
-- inscrição some calada, igual a um repetido (não vaza que bateu no teto).
-- ponytail: teto global; se um ataque travar inscrições legítimas, mover a
-- chamada para Route Handler com rate limit por IP (Vercel Firewall) ou captcha.
-- =============================================================================

create or replace function public.entrar_na_lista_de_espera(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.lista_de_espera (email)
  select lower(trim(p_email))
  where (select count(*) from public.lista_de_espera
         where criado_em > now() - interval '1 hour') < 60
  on conflict (email) do nothing
$$;
revoke execute on function public.entrar_na_lista_de_espera(text) from public;
grant execute on function public.entrar_na_lista_de_espera(text) to anon, authenticated;
