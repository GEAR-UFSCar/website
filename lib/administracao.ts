/** Valores espelhados dos CHECKs em supabase/003_administracao.sql. */
export const CATEGORIAS = [
  "Robô",
  "Componente Eletrônico",
  "Ferramenta",
  "Consumível",
  "Equipamento de Informática",
  "Mecânica/Estrutura",
  "Outro",
] as const

export const STATUS = [
  "Disponível",
  "Emprestado",
  "Em manutenção",
  "Danificado",
  "Baixado",
] as const

export const TIPOS_ATA = ["Geral", "Frente", "Diretoria"] as const

/** Valores espelhados dos CHECKs em supabase/008_eventos_avisos_sprints.sql. */
export const TIPOS_EVENTO = ["Reunião", "Sprint", "Prazo", "Outro"] as const

export const STATUS_SPRINT = ["Planejado", "Em andamento", "Concluído"] as const

/** Valores aceitos pelo CHECK da coluna `frente` em 001_perfis.sql; vazio vira null. */
export const FRENTES = ["Competição", "Pesquisa", "Projetos"] as const

/**
 * Frentes e suas rotas. O slug é o da URL (sem acento nem cedilha); o nome é
 * o valor gravado no banco. As duas formas não podem divergir, então moram
 * juntas — quem precisa de uma quase sempre precisa da outra.
 */
export const FRENTES_ROTAS = [
  { slug: "competicao", nome: "Competição" },
  { slug: "pesquisa", nome: "Pesquisa" },
  { slug: "projetos", nome: "Projetos" },
] as const

export type FrenteNome = (typeof FRENTES_ROTAS)[number]["nome"]

/** Rota da frente, ou a primeira aba quando a pessoa ainda não escolheu. */
export function rotaDaFrente(nome: string | null | undefined) {
  const achada = FRENTES_ROTAS.find((t) => t.nome === nome?.trim())
  return `/membros/frentes/${(achada ?? FRENTES_ROTAS[0]).slug}`
}

/**
 * Membro validado pela diretoria. Espelha perfis.aprovado e a função
 * e_membro() em 014 — é o que separa "tem conta" de "enxerga o interno".
 */
export function estaAprovado(aprovado: boolean | null | undefined) {
  return aprovado === true
}

/** Um cargo em branco conta como "sem cargo". */
export function temCargo(cargo: string | null | undefined) {
  return Boolean(cargo?.trim())
}

/** Cargos atribuíveis pela diretoria. Vazio = sem cargo (perde o acesso admin). */
export const CARGOS = [
  "Presidente",
  "Vice-Presidente",
  "Diretor de Competição",
  "Diretor de Pesquisa",
  "Diretor de Projetos",
  "Tesouraria",
  "Comunicação",
] as const

/** Cargos que podem alterar o cargo de outras pessoas — espelha e_diretoria(). */
export const DIRETORIA = ["Presidente", "Vice-Presidente"] as const

export function eDiretoria(cargo: string | null | undefined) {
  return DIRETORIA.includes((cargo ?? "").trim() as (typeof DIRETORIA)[number])
}
