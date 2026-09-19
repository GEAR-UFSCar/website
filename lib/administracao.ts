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

/*
 * Ordem do andamento, e é ela que a tela usa para enfileirar filtros e seções.
 * 'Bloqueado' entra ENTRE "em andamento" e "concluído" (021): bloqueio é
 * trabalho começado que parou, não trabalho que nunca saiu do papel — pô-lo no
 * fim da fila o esconderia justamente do olhar que precisa encontrá-lo.
 *
 * Espelha o CHECK de sprints.status, reescrito em 021.
 */
export const STATUS_SPRINT = ["Planejado", "Em andamento", "Bloqueado", "Concluído"] as const

export type StatusSprint = (typeof STATUS_SPRINT)[number]

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
  return `/membros/sprints/${(achada ?? FRENTES_ROTAS[0]).slug}`
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

/**
 * Primeiro nome, para tratamento direto na segunda pessoa ("Bom dia, Marina.").
 *
 * `split(/\s+/)` e não `split(" ")`: nome digitado à mão vem com espaço duplo
 * mais vezes do que se imagina, e `split(" ")` devolveria string vazia nesse
 * caso. O `trim()` antes cobre o espaço à esquerda.
 *
 * Quem não tem nome preenchido recebe o reserva — a saudação nunca deve sair
 * pela metade, e /membros já barra quem está sem `nome_completo`. Um e-mail
 * chega aqui inteiro de propósito: cortá-lo no "@" produziria um apelido que a
 * pessoa não escolheu.
 */
export function primeiroNome(nome: string | null | undefined, reserva = "Membro") {
  return nome?.trim().split(/\s+/)[0] || reserva
}

/**
 * Iniciais para o avatar circular do painel: primeira e última palavra do
 * nome, no máximo duas letras.
 *
 * Primeira e ÚLTIMA, não as duas primeiras: em pt-BR o segundo termo costuma
 * ser preposição ou nome do meio, e "Maria de Souza" viraria "MD". Com a
 * última, vira "MS" — que é como a pessoa assina.
 *
 * Nome de uma palavra só devolve uma letra, e é isso mesmo: inventar a segunda
 * a partir do sobrenome que não foi informado seria pior que a inicial sozinha.
 * Sem nome, devolve "?" — o mesmo reserva de components/membros-shell.tsx.
 */
export function iniciais(nome: string | null | undefined) {
  const partes = nome?.trim().split(/\s+/).filter(Boolean) ?? []
  if (partes.length === 0) return "?"
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
  return `${primeira}${ultima}`.toUpperCase()
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
