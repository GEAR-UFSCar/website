-- =============================================================================
-- GEAR — anônimo não escreve em eventos_chamada
-- Rodar no SQL Editor, DEPOIS de 038_agenda_publica_e_ciclos.sql. Pode rodar
-- mais de uma vez. Não apaga nem muda dado.
--
-- A escrita anônima já era barrada, mas pelo motivo errado: o gatilho
-- nomear_chamada() (034) roda ANTES da RLS e respondia "Evento não
-- encontrado" (23503), porque anon não lê eventos. `npm run test:rls` exige
-- 42501 justamente para provar que quem barra é a autorização, não um acaso
-- de dados. Tirar o privilégio de tabela faz o Postgres recusar antes de
-- qualquer gatilho. Ninguém anônimo registra presença; authenticated segue
-- governado pelas policies da 033.
-- =============================================================================

revoke insert, update, delete on public.eventos_chamada from anon;
