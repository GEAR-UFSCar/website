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
