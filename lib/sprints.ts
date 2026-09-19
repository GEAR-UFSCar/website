/**
 * Sprints e diário de atividade: o que a tela e o banco precisam concordar.
 *
 * Os valores de `status` continuam vindo de STATUS_SPRINT em
 * lib/administracao.ts, que espelha o CHECK de 021 — aqui não há segunda
 * lista. O que este módulo acrescenta é o que só a tela precisa saber:
 * as colunas de cada consulta, a gramática visual de cada status, e a busca.
 */

import { STATUS_SPRINT, type StatusSprint } from "@/lib/administracao"

/** Perfil reduzido ao que o cartão mostra — vem do embed da FK (020/021). */
export type PessoaResumo = { id: string; nome_completo: string | null } | null

export type Sprint = {
  id: string
  frente: string
  titulo: string
  descricao: string
  status: string
  /** 0–100, declarado por quem toca o sprint. Ver 021. */
  progresso: number
  proximo_passo: string | null
  data_inicio: string | null
  data_fim: string | null
  updated_at: string
  responsavel: PessoaResumo
}

export type Atualizacao = {
  id: string
  sprint_id: string
  texto: string
  created_at: string
  autor: PessoaResumo
}

/*
 * As duas listas de colunas moram aqui pelo mesmo motivo de COLUNAS_META: a
 * consulta do painel de frente e a de /membros precisam pedir as mesmas
 * colunas, e duas cópias divergiriam na primeira coluna nova.
 *
 * O `!nome_da_fk` não é decoração: sem ele o PostgREST teria de adivinhar por
 * qual caminho chegar em `perfis`, e a consulta quebra no dia em que existir
 * uma segunda FK entre as duas tabelas.
 */
export const COLUNAS_SPRINT =
  "id, frente, titulo, descricao, status, progresso, proximo_passo, data_inicio, data_fim, updated_at, " +
  "responsavel:perfis!sprints_responsavel_id_fkey (id, nome_completo)"

export const COLUNAS_ATUALIZACAO =
  "id, sprint_id, texto, created_at, autor:perfis!sprint_atualizacoes_autor_id_fkey (id, nome_completo)"

/** Teto do textarea do diário — o mesmo CHECK de `texto` em 021. */
export const MAX_ATUALIZACAO = 2000

/**
 * A gramática visual dos quatro status, num lugar só.
 *
 * SOBRE O BLOQUEADO EM ÂMBAR CHEIO. A paleta da GEAR não tem vermelho, e
 * inventar um aqui seria abrir exceção de identidade dentro de um badge. O que
 * existe é uma cor de alarme só: âmbar. Então a diferença entre "em andamento"
 * e "bloqueado" não é de matiz, é de peso — contorno contra preenchimento
 * sólido, que é o elemento mais alto-falante que a página tem. Se um dia a
 * entidade adotar um vermelho de estado, é esta constante que muda, e só ela.
 */
const APARENCIA: Record<StatusSprint, { badge: string; barra: string }> = {
  // Não começou: o mais quieto possível sem sumir.
  Planejado: {
    badge: "border-white/20 text-muted-foreground",
    barra: "bg-white/25",
  },
  // Andando: a marca de "ativo" que o site usa em toda parte.
  "Em andamento": {
    badge: "border-[var(--gear-amber)] text-[var(--gear-amber)]",
    barra: "bg-[var(--gear-amber)]",
  },
  // Parado no meio: âmbar cheio. Ver o comentário acima.
  Bloqueado: {
    badge: "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]",
    // Barra listrada: a mesma cor, mas interrompida — progresso que não anda.
    barra:
      "bg-[repeating-linear-gradient(135deg,var(--gear-amber)_0_6px,transparent_6px_12px)]",
  },
  // Terminou: recua. Continuar gritando o que já está feito ensina a ignorar o grito.
  Concluído: {
    badge: "border-white/10 text-white/45",
    barra: "bg-white/35",
  },
}

/** Fallback para status fora da lista — só acontece se o banco tiver valor antigo. */
const NEUTRO = { badge: "border-white/20 text-muted-foreground", barra: "bg-white/25" }

export const aparenciaDoStatus = (status: string) =>
  APARENCIA[status as StatusSprint] ?? NEUTRO

/**
 * Os chips de filtro, na ordem do andamento, com "Todos" na frente.
 *
 * `null` é o valor de "Todos" — mais honesto que a string "Todos", que teria
 * de ser comparada contra os status reais em toda parte.
 */
export const FILTROS_STATUS: { rotulo: string; valor: StatusSprint | null }[] = [
  { rotulo: "Todos", valor: null },
  ...STATUS_SPRINT.map((s) => ({ rotulo: s, valor: s })),
]

/**
 * Compara ignorando acento e caixa: quem digita "competicao" ou "JOAO" está
 * procurando a mesma coisa que quem digita "Competição" ou "João", e num
 * campo de busca isso não é detalhe — é a diferença entre achar e não achar.
 *
 * O intervalo ̀–ͯ é o bloco de diacríticos combinantes, que é
 * exatamente o que o NFD separa das letras.
 */
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

/** Busca por título ou responsável. Termo vazio casa com tudo. */
export function corresponde(sprint: Sprint, termo: string) {
  const busca = normalizar(termo)
  if (!busca) return true

  const alvo = normalizar(`${sprint.titulo} ${sprint.responsavel?.nome_completo ?? ""}`)
  return alvo.includes(busca)
}
