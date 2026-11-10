/**
 * Resumo da semana de uma trilha, em texto puro, para colar no grupo.
 * Sem imports: o teste (scripts/testar-hoje.mjs) roda em Node.
 */

type SprintResumo = {
  id: string
  titulo: string
  status: string
  progresso: number
  proximo_passo: string | null
  responsavel: { nome_completo: string | null } | null
}
type AtualizacaoResumo = { texto: string; created_at: string; autor: { nome_completo: string | null } | null }

const primeiro = (nome: string | null | undefined) => nome?.trim().split(/\s+/)[0] ?? "alguém"
const umaLinha = (texto: string, max = 160) => {
  const t = texto.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/**
 * `desde` é um instante ISO: só entra no "feito" o que foi registrado depois.
 * Sprint concluído sem registro na janela fica de fora; o resto aparece sempre,
 * porque sprint aberto e calado na semana é justamente o que o resumo mostra.
 */
export function resumoDaSemana(
  frente: string,
  sprints: SprintResumo[],
  atualizacoes: Record<string, AtualizacaoResumo[]>,
  desde: string,
): string {
  const blocos: string[] = []
  for (const s of sprints) {
    const feitas = (atualizacoes[s.id] ?? []).filter((a) => a.created_at >= desde)
    if (s.status === "Concluído" && feitas.length === 0) continue
    const linhas = [`*${s.titulo}* · ${s.status} · ${s.progresso}%${s.responsavel ? ` · ${primeiro(s.responsavel.nome_completo)}` : ""}`]
    if (feitas.length === 0) linhas.push("  sem registro na semana")
    for (const a of [...feitas].reverse()) linhas.push(`  - ${umaLinha(a.texto)} (${primeiro(a.autor?.nome_completo)})`)
    if (s.status !== "Concluído") linhas.push(`  Próximo passo: ${s.proximo_passo?.trim() || "não declarado"}`)
    blocos.push(linhas.join("\n"))
  }
  const cabeca = `GEAR · ${frente} · resumo da semana`
  return blocos.length ? `${cabeca}\n\n${blocos.join("\n\n")}` : `${cabeca}\n\nNenhum sprint aberto.`
}
