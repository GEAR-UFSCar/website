-- =============================================================================
-- GEAR — frente travada para quem tem cargo, métricas fechadas, documentos
-- exigindo aprovação, período fechado imutável
-- Rodar no SQL Editor. Numeração segue a ordem de criação, não de dependência:
-- Depende só de 014 e 019. Não precisa de 020–022: pode rodar antes delas.
--
-- Quatro falhas achadas na revisão de 22/09/2026. Todas eram a tela prometendo
-- uma regra que o banco não aplicava.
--
--   1. FRENTE TROCADA PELO PRÓPRIO DONO
--      guardar_cargo() (014) só congela o perfil de OUTRA pessoa. No próprio,
--      `frente` era livre. Só que a escrita de sprints (013), do diário (021,
--      pode_editar_sprint) e de métricas (019) compara justamente
--      perfis.frente com a frente da linha. Qualquer cargo — Tesouraria,
--      Comunicação, Diretor de Pesquisa — trocava a própria frente pela API e
--      passava a editar e apagar os sprints de outra frente.
--
--      Regra nova: quem tem cargo não muda a própria frente; quem muda é a
--      diretoria. Quem NÃO tem cargo continua escolhendo — a tela de perfil
--      diz que a frente "é escolhida ao fim da formação", e sem cargo a frente
--      não abre escrita nenhuma. Presidente e Vice escrevem em todas as
--      frentes, então para elas a trava não protege nada e fica de fora.
--
--   2. MÉTRICAS LEGÍVEIS POR QUALQUER CONTA
--      "metricas: leitura autenticada" (019) era `using (true)` — o mesmo que
--      a 014 fechou em seis tabelas. O domínio @ufscar.br é checado só no
--      navegador, então "autenticado" é qualquer pessoa que chame signUp pela
--      API. Passa a exigir e_membro(). valor_patrimonio_atual() é security
--      definer e tinha o mesmo furo: devolve null para quem não é membro.
--      A view pública metricas_publicas não muda — ela é o recorte feito para
--      anônimo e não passa por esta policy.
--
--   3. DOCUMENTOS SEM EXIGIR APROVAÇÃO
--      As policies de escrita da 006 checam "tem cargo" inline, sem
--      `aprovado`. A 016 trocou as de patrimônio e atas por tem_cargo(), que
--      exige aprovação; documentos e o bucket ficaram para trás. Revogar a
--      aprovação não apaga o cargo, então um membro revogado continuava
--      subindo e substituindo arquivos.
--
--   4. PERÍODO FECHADO EDITÁVEL
--      lib/metricas.ts (podeEditarMetrica) diz "período fechado é histórico:
--      ninguém reescreve, nem a diretoria" e afirma espelhar a policy. A
--      policy não olhava status. Agora o USING exige 'Em andamento' — a linha
--      ANTES da mudança precisa estar aberta. O WITH CHECK não muda, porque
--      fechar o período é justamente um update que grava 'Fechado'.
-- =============================================================================


-- 1. FRENTE ------------------------------------------------------------------
/*
 * Reescrita inteira de guardar_cargo() da 014. O que muda:
 *
 *   · Em perfil alheio, `frente` sai da tupla congelada: a diretoria (única
 *     que passa pela policy de update em perfil alheio) precisa poder corrigir
 *     a frente de quem tem cargo, já que a pessoa não pode mais.
 *   · No próprio perfil, mudar `frente` com cargo ativo é recusado, a menos
 *     que quem pede seja diretoria.
 *
 * `old.cargo`, não `new.cargo`: o que vale é o cargo que a pessoa TEM. Usar
 * `new` deixaria "tirar o cargo e trocar a frente no mesmo update" — o que
 * de todo modo já barra na checagem de cargo logo abaixo, mas a regra fica
 * legível sozinha.
 */
create or replace function public.guardar_cargo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual uuid := (select auth.uid());
begin
  -- SQL Editor / service_role: sem sessão, sem trava.
  if atual is null then
    return new;
  end if;

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

  if new.aprovado is distinct from old.aprovado then
    if not public.e_diretoria() then
      raise exception 'Apenas Presidente ou Vice-Presidente podem aprovar ou revogar membros.';
    end if;
    if atual = old.id then
      raise exception 'Ninguém altera a própria aprovação.';
    end if;
  end if;

  if new.cargo is distinct from old.cargo then
    if not public.e_diretoria() then
      raise exception 'Apenas Presidente ou Vice-Presidente podem alterar cargo.';
    end if;
    new.cargo_atualizado_por := atual;
    new.cargo_atualizado_em  := now();
  else
    new.cargo_atualizado_por := old.cargo_atualizado_por;
    new.cargo_atualizado_em  := old.cargo_atualizado_em;
  end if;

  return new;
end;
$$;


-- 2. MÉTRICAS: LEITURA -------------------------------------------------------
drop policy if exists "metricas: leitura autenticada" on public.metricas_periodo;
drop policy if exists "metricas: leitura de membro aprovado" on public.metricas_periodo;
create policy "metricas: leitura de membro aprovado"
  on public.metricas_periodo for select to authenticated
  using (public.e_membro());

create or replace function public.valor_patrimonio_atual()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.e_membro() then (
    select coalesce(sum(p.quantidade * coalesce(p.valor_estimado, 0)), 0)
      from public.patrimonio p
     where p.status <> 'Baixado'
  ) end;
$$;


-- 3. DOCUMENTOS: ESCRITA EXIGE APROVAÇÃO -------------------------------------
drop policy if exists "documentos: insert com cargo" on public.documentos;
create policy "documentos: insert com cargo"
  on public.documentos for insert to authenticated
  with check (public.tem_cargo());

drop policy if exists "documentos: update com cargo" on public.documentos;
create policy "documentos: update com cargo"
  on public.documentos for update to authenticated
  using (public.tem_cargo()) with check (public.tem_cargo());

drop policy if exists "documentos storage: escrita com cargo" on storage.objects;
create policy "documentos storage: escrita com cargo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.tem_cargo());

drop policy if exists "documentos storage: substituir com cargo" on storage.objects;
create policy "documentos storage: substituir com cargo"
  on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and public.tem_cargo())
  with check (bucket_id = 'documentos' and public.tem_cargo());


-- 4. MÉTRICAS: PERÍODO FECHADO É IMUTÁVEL ------------------------------------
drop policy if exists "metricas: edição por diretoria ou cargo da frente" on public.metricas_periodo;
create policy "metricas: edição por diretoria ou cargo da frente"
  on public.metricas_periodo for update to authenticated
  using (
    metricas_periodo.status = 'Em andamento'
    and (
      public.e_diretoria()
      or (
        public.tem_cargo()
        and metricas_periodo.frente is not null
        and exists (
          select 1 from public.perfis p
          where p.id = (select auth.uid()) and p.frente = metricas_periodo.frente
        )
      )
    )
  )
  with check (
    public.e_diretoria()
    or (
      public.tem_cargo()
      and metricas_periodo.frente is not null
      and exists (
        select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.frente = metricas_periodo.frente
      )
    )
  );

notify pgrst, 'reload schema';


-- =============================================================================
-- CONFERIR
--
--   -- 1. a trava de frente está na função (esperado: t)
--   select prosrc like '%não altera a própria frente%'
--     from pg_proc where proname = 'guardar_cargo';
--
--   -- 2. nenhuma policy de metricas_periodo com using(true) (esperado: 0)
--   select count(*) from pg_policies
--    where tablename = 'metricas_periodo' and qual = 'true';
--
--   -- 3. documentos usam tem_cargo (esperado: 4)
--   select count(*) from pg_policies
--    where policyname like 'documentos%com cargo'
--      and coalesce(with_check, qual) like '%tem_cargo()%';
--
--   -- 4. o update de métricas olha status (esperado: t)
--   select qual like '%Em andamento%' from pg_policies
--    where policyname = 'metricas: edição por diretoria ou cargo da frente';
-- =============================================================================
