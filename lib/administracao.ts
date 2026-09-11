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

export const TIPOS_ATA = ["Geral", "Trilha", "Diretoria"] as const

export const TRILHAS = ["Competição", "Pesquisa", "Projetos"] as const

/** Um cargo em branco conta como "sem cargo". */
export function temCargo(cargo: string | null | undefined) {
  return Boolean(cargo?.trim())
}

export const campoBase =
  "w-full bg-[var(--gear-ink)] border border-white/15 px-3 py-2.5 font-sans text-sm font-light text-foreground outline-none transition-colors duration-300 focus:border-[var(--gear-amber)] disabled:opacity-50"

export const rotuloBase =
  "block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2"

/** Cargos atribuíveis pela diretoria. Vazio = sem cargo (perde o acesso admin). */
export const CARGOS = [
  "Presidente",
  "Vice-Presidente",
  "Líder de Competição",
  "Líder de Pesquisa",
  "Líder de Projetos",
  "Tesouraria",
  "Comunicação",
] as const

/** Cargos que podem alterar o cargo de outras pessoas — espelha e_diretoria(). */
export const DIRETORIA = ["Presidente", "Vice-Presidente"] as const

export function eDiretoria(cargo: string | null | undefined) {
  return DIRETORIA.includes((cargo ?? "").trim() as (typeof DIRETORIA)[number])
}
