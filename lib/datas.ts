/**
 * Formatação de data em pt-BR, num lugar só. Estava copiada em cada página
 * que mostra data — mural, documentação e calendário usavam exatamente as
 * mesmas opções de toLocaleString.
 *
 * Roda no servidor, então usa o fuso do servidor, não o de quem lê. Para o
 * uso atual (datas da entidade, precisão de dia) isso não muda nada; se um
 * dia a hora exata importar por fuso, o lugar de resolver é aqui.
 */

/** 11 de setembro de 2026 */
export const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

/** 11 de setembro de 2026, 14:30 */
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

/**
 * Corte para "próximos eventos": meia-noite de hoje, não o instante atual —
 * um evento que começou às 9h ainda é do dia de hoje às 15h.
 */
export function inicioDeHoje() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje.toISOString()
}

/*
 * As duas abaixo são para colunas `date` (sem hora), como metas.prazo. Elas
 * NÃO podem passar por `new Date(iso)`: "2026-09-20" é interpretado como
 * meia-noite em UTC, que no fuso de Sorocaba (UTC-3) é dia 19 às 21h. O prazo
 * apareceria um dia antes do que a pessoa digitou — e uma meta para hoje
 * nasceria vencida.
 */

/** "2026-09-20" → "20 de setembro de 2026", sem o recuo de fuso. */
export function dataDoDia(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Hoje como "YYYY-MM-DD" local, para comparar com coluna `date` — no banco,
 * no filtro do PostgREST e na tela, sempre a mesma string.
 */
export function hojeISO() {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${hoje.getFullYear()}-${mes}-${dia}`
}
