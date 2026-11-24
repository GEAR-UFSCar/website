-- =============================================================================
-- GEAR — a trilha de diretor e vice vem do cargo
-- Rodar no SQL Editor, DEPOIS de 040_membros_participam.sql. Pode rodar mais
-- de uma vez. Só preenche `perfis.frente` de quem tem cargo de trilha.
--
-- A revisão de 20/11/2026 achou os quadros de sprint vazios em produção por
-- um motivo de dados, não de tela: pode_editar_sprint() (021) libera cargo
-- "na mesma frente", e nenhum diretor tinha `frente` preenchida. Quem tem
-- cargo também não troca a própria frente (023). Então o Diretor de Pesquisa
-- não criava nem editava sprint de Pesquisa, e ninguém percebia o porquê.
--
-- "Diretor de Pesquisa" já diz a trilha. Guardar a mesma informação em dois
-- campos que podem divergir era o defeito: a partir daqui, cargo de trilha
-- (diretor ou vice) carimba a frente, na gravação e de uma vez nos dados atuais.
-- Os outros cargos (Presidência, Marketing...) não mexem na frente.
-- =============================================================================

create or replace function public.trilha_do_cargo(cargo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select (regexp_match(cargo, '^(?:Vice-diretor|Diretor) de (Competição|Pesquisa|Projetos)$'))[1];
$$;

comment on function public.trilha_do_cargo(text) is
  'Trilha implícita no cargo de diretor ou vice-diretor; null para os demais cargos.';

-- O nome ordena depois de perfis_guardar_cargo (gatilhos rodam em ordem alfabética): a autorização
-- da troca de cargo já foi decidida lá; aqui só se deriva a frente.
create or replace function public.perfis_frente_pelo_cargo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.trilha_do_cargo(new.cargo) is not null then
    new.frente := public.trilha_do_cargo(new.cargo);
  end if;
  return new;
end;
$$;
revoke execute on function public.perfis_frente_pelo_cargo() from public, anon, authenticated;

drop trigger if exists perfis_trilha_pelo_cargo on public.perfis;
create trigger perfis_trilha_pelo_cargo
  before insert or update of cargo, frente on public.perfis
  for each row execute function public.perfis_frente_pelo_cargo();

-- Dados atuais: sem sessão (auth.uid() nulo), guardar_cargo deixa passar.
update public.perfis
   set frente = public.trilha_do_cargo(cargo)
 where public.trilha_do_cargo(cargo) is not null
   and frente is distinct from public.trilha_do_cargo(cargo);
