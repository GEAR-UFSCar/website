/**
 * Apuração das votações (035), com as regras do Regimento:
 *   · quórum de instalação: metade mais um dos membros com voto (art. 16 § 3º);
 *   · deliberação comum: maioria simples dos votos válidos;
 *   · alteração do Regimento e destituição: dois terços dos membros com voto;
 *   · abstenção, branco e nulo não entram nos válidos (doc. 28, art. 11).
 * Empate não é resolvido aqui: o Regimento dá o voto de qualidade ao Presidente
 * (art. 37) e a eleição faz segundo turno (doc. 28, art. 10).
 */

export type Linha = { opcao: string; votos: number }
export type Regra = "simples" | "dois_tercos"

const NAO_VALIDOS = new Set(["Abstenção", "Branco", "Nulo"])

export function apurar(linhas: Linha[], votantes: number, aptos: number, regra: Regra) {
  const quorum = aptos > 0 && votantes >= Math.floor(aptos / 2) + 1
  const validos = linhas.filter((l) => !NAO_VALIDOS.has(l.opcao))
  const ordenadas = [...validos].sort((a, b) => b.votos - a.votos)
  const [primeiro, segundo] = ordenadas
  const empate = Boolean(primeiro && segundo && primeiro.votos === segundo.votos && primeiro.votos > 0)

  let resultado: string
  if (!quorum) resultado = "Sem quórum: a votação não produz decisão."
  else if (!primeiro || primeiro.votos === 0) resultado = "Nenhum voto válido."
  else if (regra === "dois_tercos") {
    const favoraveis = linhas.find((l) => l.opcao === "Favorável")?.votos ?? primeiro.votos
    const exigido = Math.ceil((2 * aptos) / 3)
    resultado = favoraveis >= exigido ? `Aprovada: ${favoraveis} de ${exigido} exigidos (2/3 dos membros com voto).` : `Rejeitada: ${favoraveis} de ${exigido} exigidos (2/3 dos membros com voto).`
  } else if (empate) resultado = "Empate: decide o voto de qualidade do Presidente (deliberação) ou segundo turno (eleição)."
  else resultado = `${primeiro.opcao}, por maioria simples dos votos válidos.`

  return { quorum, resultado, empate }
}
