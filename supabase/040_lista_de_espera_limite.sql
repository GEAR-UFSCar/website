-- =============================================================================
-- 040 — teto de inscrições anônimas na lista de espera
--
-- entrar_na_lista_de_espera() é chamável por `anon` direto em
-- /rest/v1/rpc/..., com a chave pública que está no bundle. Sem teto, um
-- script enche a tabela com milhares de endereços (falsos ou de terceiros) e
-- o mailto: que a diretoria monta em Seleção vira inutilizável.
--
-- Teto GLOBAL por hora, não por IP: PostgREST não entrega IP confiável à
-- função. Ciclo de seleção real não passa de dezenas por hora.
--
-- · O advisory lock serializa contar-e-inserir; sem ele, chamadas simultâneas
--   leem a mesma contagem e passam juntas do teto.
-- · Acima do teto a função ERRA em vez de descartar calada: o formulário cai
--   no estado "erro" e a pessoa sabe que precisa tentar de novo, em vez de
--   achar que entrou. Dizer que o teto bateu não vaza nada sobre quem está lá.
--
-- ponytail: teto global — um ataque contínuo trava inscrições legítimas
-- enquanto durar. Se acontecer, mover a chamada para Route Handler com rate
-- limit por IP (Vercel Firewall) ou captcha.
-- =============================================================================

create or replace function public.entrar_na_lista_de_espera(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('lista_de_espera'));

  if (select count(*) from public.lista_de_espera
      where criado_em > now() - interval '1 hour') >= 60 then
    raise exception 'Muitas inscrições agora. Tente de novo em uma hora.'
      using errcode = 'P0001';
  end if;

  insert into public.lista_de_espera (email)
  values (lower(trim(p_email)))
  on conflict (email) do nothing;
end
$$;
revoke execute on function public.entrar_na_lista_de_espera(text) from public;
grant execute on function public.entrar_na_lista_de_espera(text) to anon, authenticated;
