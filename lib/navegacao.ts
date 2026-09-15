/**
 * Mapa de navegação da área de membros: as abas e a migalha da barra superior.
 *
 * Fica fora do componente porque é dado, não desenho — e porque a migalha é
 * uma função pura de pathname, que dá para testar sem montar React.
 *
 * A aba de frentes aponta para /membros/sprints/*: a 013 renomeou "trilha"
 * para "frente" no banco e nas rotas, e o rótulo aqui segue o vocabulário que
 * o resto da interface usa. /membros/trilhas/* continua funcionando pelo
 * redirect permanente em next.config.mjs.
 */

export type Aba = {
  href: string
  rotulo: string
  /** Nome do ícone em lucide-react; o componente resolve. */
  icone: "LayoutDashboard" | "CalendarDays" | "GraduationCap" | "Target" | "GitBranch" | "Megaphone" | "Users" | "FileText" | "Settings"
  /** Prefixo que marca a aba como atual — cobre as subrotas. */
  prefixo: string
  /** Só para quem tem cargo. */
  exigeCargo?: boolean
}

export const ABAS: Aba[] = [
  { href: "/membros", rotulo: "Visão geral", icone: "LayoutDashboard", prefixo: "/membros" },
  { href: "/membros/calendario", rotulo: "Calendário", icone: "CalendarDays", prefixo: "/membros/calendario" },
  { href: "/membros/aprendizagem", rotulo: "Aprendizagem", icone: "GraduationCap", prefixo: "/membros/aprendizagem" },
  { href: "/membros/metas", rotulo: "Metas", icone: "Target", prefixo: "/membros/metas" },
  { href: "/membros/sprints/competicao", rotulo: "Frentes", icone: "GitBranch", prefixo: "/membros/sprints" },
  { href: "/membros/mural", rotulo: "Mural", icone: "Megaphone", prefixo: "/membros/mural" },
  { href: "/membros/diretorio", rotulo: "Diretório", icone: "Users", prefixo: "/membros/diretorio" },
  { href: "/membros/documentacao", rotulo: "Documentação", icone: "FileText", prefixo: "/membros/documentacao" },
  { href: "/membros/administracao", rotulo: "Administração", icone: "Settings", prefixo: "/membros/administracao", exigeCargo: true },
]

/**
 * Aba atual. Prefixo mais longo vence: sem isso "/membros" casaria com tudo,
 * já que toda rota daqui começa com ele.
 */
export function abaAtual(pathname: string, abas: Aba[] = ABAS) {
  return abas
    .filter((a) => pathname === a.prefixo || pathname.startsWith(`${a.prefixo}/`))
    .sort((a, b) => b.prefixo.length - a.prefixo.length)[0]
}

export type Migalha = { secao: string; titulo: string }

/*
 * Rota → o par que a barra superior mostra. Chave exata; o que não estiver
 * aqui cai na regra de prefixo abaixo, e só então no genérico.
 */
const MIGALHAS: Record<string, Migalha> = {
  "/membros": { secao: "PAINEL · VISÃO GERAL", titulo: "Visão geral" },
  "/membros/calendario": { secao: "AGENDA · VISÃO MENSAL", titulo: "Calendário" },
  "/membros/aprendizagem": { secao: "ACADEMIA · MÓDULOS", titulo: "Aprendizagem" },
  "/membros/metas": { secao: "PESSOAL · COMPROMISSOS", titulo: "Metas" },
  "/membros/mural": { secao: "COMUNICAÇÃO · AVISOS", titulo: "Mural" },
  "/membros/diretorio": { secao: "PESSOAS · MEMBROS", titulo: "Diretório" },
  "/membros/documentacao": { secao: "INSTITUCIONAL · ARQUIVOS", titulo: "Documentação" },
  "/membros/sprints/competicao": { secao: "FRENTES · SPRINTS", titulo: "Competição" },
  "/membros/sprints/pesquisa": { secao: "FRENTES · SPRINTS", titulo: "Pesquisa" },
  "/membros/sprints/projetos": { secao: "FRENTES · SPRINTS", titulo: "Projetos" },
  "/membros/administracao": { secao: "ADMINISTRAÇÃO · PAINEL", titulo: "Administração" },
  "/membros/administracao/atas": { secao: "ADMINISTRAÇÃO · REGISTROS", titulo: "Atas" },
  "/membros/administracao/cargos": { secao: "ADMINISTRAÇÃO · PESSOAS", titulo: "Cargos e aprovação" },
  "/membros/administracao/patrimonio": { secao: "ADMINISTRAÇÃO · INVENTÁRIO", titulo: "Patrimônio" },
  "/membros/completar-perfil": { secao: "CONTA · PRIMEIRO ACESSO", titulo: "Completar perfil" },
  "/membros/aguardando": { secao: "CONTA · APROVAÇÃO", titulo: "Aguardando" },
}

export function migalha(pathname: string): Migalha {
  const exata = MIGALHAS[pathname]
  if (exata) return exata

  // Subrota não mapeada herda a seção da ancestral mais próxima, para a barra
  // nunca cair no genérico só porque alguém criou uma página nova.
  const ancestral = Object.keys(MIGALHAS)
    .filter((rota) => rota !== "/membros" && pathname.startsWith(`${rota}/`))
    .sort((a, b) => b.length - a.length)[0]

  if (ancestral) return MIGALHAS[ancestral]

  return { secao: "ÁREA DE MEMBROS", titulo: "Painel" }
}
