-- =============================================================================
-- GEAR — a entidade nunca fica sem diretoria; bucket de documentos com limite
-- Rodar no SQL Editor, DEPOIS de 023_frente_travada_e_leituras_fechadas.sql.
-- Depende de 006 (bucket), 014 (aprovado) e 023 (versão atual de guardar_cargo).
--
-- Duas falhas achadas na revisão de 16/10/2026.
--
--   1. A DIRETORIA PODIA SE TRANCAR PARA FORA
--      guardar_cargo() (023) impede que alguém mexa na PRÓPRIA aprovação, mas
--      não no próprio cargo. O único Presidente trocando o cargo para "sem
--      cargo" passava sem erro — e a partir daí ninguém mais aprova membro nem
--      distribui cargo, porque as duas coisas exigem e_diretoria(). Vale o
--      mesmo para Presidente e Vice se rebaixando um ao outro, ou para a
--      diretoria revogando a aprovação do último colega de diretoria.
--      A única saída era o SQL Editor.
--
--      Regra nova: nenhuma mudança de cargo ou de aprovação pode deixar a
--      entidade sem pelo menos UMA pessoa aprovada como Presidente ou Vice.
--      Para trocar a diretoria, promova a pessoa nova antes de rebaixar a
--      antiga. O SQL Editor (sem sessão) continua livre, como sempre foi.
--
--      O advisory lock serializa as mudanças de diretoria: sem ele, Presidente
--      e Vice rebaixando um ao outro AO MESMO TEMPO veriam, cada um, o outro
--      ainda no cargo — e os dois updates passariam.
--
--   2. UPLOAD SEM LIMITE NO SERVIDOR
--      O teto de 20 MB e a lista de formatos existiam só em lib/documentos.ts,
--      no navegador. O bucket da 006 foi criado sem file_size_limit e sem
--      allowed_mime_types, então qualquer cargo subia qualquer coisa chamando
--      a API do Storage direto. A lista aceitava também SVG, que pode carregar
--      script e roda quando alguém abre o link assinado.
--
--      Regra nova: o próprio Storage recusa acima de 20 MB e fora da lista.
--      SVG sai da lista — logo em vetor vai em PDF. Arquivos que já estão no
--      bucket não são afetados: o limite vale para envios novos.
-- =============================================================================

-- 1. DIRETORIA MÍNIMA --------------------------------------------------------
-- Recriada inteira a partir da 023; o único bloco novo é o passo 3.
create or replace function public.guardar_cargo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
  era_diretoria  boolean;
  sera_diretoria boolean;
begin
  -- Sem sessão = SQL Editor ou service_role, que já ignoram RLS. É também o
  -- caminho de socorro se algo der errado com a diretoria.
  if atual is null then
    return new;
  end if;

  -- 1. Em perfil de outra pessoa, só cargo, frente e aprovação podem mudar.
  --    No próprio, quem tem cargo não troca a frente (023).
  if atual is distinct from old.id then
    if (new.id, new.nome_completo, new.curso, new.created_at)
       is distinct from (old.id, old.nome_completo, old.curso, old.created_at) then
      raise exception 'Em perfil de outra pessoa, apenas cargo, frente e aprovação podem ser alterados.';
    end if;
  elsif new.frente is distinct from old.frente
        and coalesce(old.cargo, '') <> ''
        and not public.e_diretoria() then
    raise exception 'Quem tem cargo não altera a própria frente. Peça à diretoria.';
  end if;

  -- 2. Aprovação: só a diretoria, e nunca a própria.
  if new.aprovado is distinct from old.aprovado then
    if not public.e_diretoria() then
      raise exception 'Apenas Presidente ou Vice-Presidente podem aprovar ou revogar membros.';
    end if;
    if atual = old.id then
      raise exception 'Ninguém altera a própria aprovação.';
    end if;
  end if;

  -- 3. NOVO: a entidade nunca fica sem diretoria aprovada.
  -- coalesce é obrigatório: cargo null faz `in (...)` dar NULL, e `not NULL`
  -- também é NULL — o if abaixo seria pulado justamente no caso que importa,
  -- o de alguém tirando o próprio cargo.
  era_diretoria  := coalesce(old.aprovado and old.cargo in ('Presidente', 'Vice-Presidente'), false);
  sera_diretoria := coalesce(new.aprovado and new.cargo in ('Presidente', 'Vice-Presidente'), false);

  if era_diretoria and not sera_diretoria then
    perform pg_advisory_xact_lock(hashtext('gear:diretoria'));

    if not exists (
      select 1 from public.perfis p
       where p.id <> old.id
         and p.aprovado
         and p.cargo in ('Presidente', 'Vice-Presidente')
    ) then
      raise exception 'Esta é a última pessoa da diretoria. Promova outra pessoa a Presidente ou Vice antes de tirar este cargo.'
        -- código próprio: lib/erros.ts traduz GE001 para a frase da tela, em vez
        -- da genérica de CHECK que esconderia o motivo e o que fazer.
        using errcode = 'GE001';
    end if;
  end if;

  -- 4. Cargo: só a diretoria, com auditoria carimbada.
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

-- 2. LIMITES DO BUCKET -------------------------------------------------------
-- Espelha TAMANHO_MAXIMO e TIPOS_ACEITOS de lib/documentos.ts. Mudou lá, muda
-- aqui — a tela é só o aviso; quem recusa é o Storage.
update storage.buckets
   set file_size_limit    = 20 * 1024 * 1024,
       allowed_mime_types = array[
         'application/pdf',
         'image/png',
         'image/jpeg',
         'application/vnd.oasis.opendocument.text',
         'application/vnd.oasis.opendocument.spreadsheet',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
       ]
 where id = 'documentos';

-- =============================================================================
-- CONFERÊNCIA — rode logo após aplicar
--
--   -- 1. o bucket ficou com limite (esperado: 20971520 e 7 tipos, sem svg)
--   select file_size_limit, allowed_mime_types from storage.buckets where id = 'documentos';
--
--   -- 2. a diretoria atual (esperado: >= 1 linha). Se só houver UMA pessoa,
--   --    promova uma segunda a Vice antes que precise trocar.
--   select nome_completo, cargo from public.perfis
--    where aprovado and cargo in ('Presidente', 'Vice-Presidente');
-- =============================================================================
