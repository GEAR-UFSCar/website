/**
 * Mapa de navegação da área de membros: 5 grupos, cada um com suas abas.
 *
 * É dado puro e não importa nada, para o teste (scripts/testar-navegacao.mjs)
 * rodar em Node sem montar React. As URLs são as que já existiam; só o
 * agrupamento mudou. A aba Sprints aponta para /membros/frente, que redireciona
 * à frente do próprio membro.
 */

export type Aba = {
  href: string
  rotulo: string
  /** Rotas que marcam a aba como atual (a própria e as subrotas). */
  prefixos: string[]
  /** Casa só com a rota exata, sem subrotas. */
  exato?: boolean
}

export type Grupo = {
  id: string
  rotulo: string
  href: string
  prefixos: string[]
  exato?: boolean
  /** Só para quem tem cargo. */
  exigeCargo?: boolean
  abas: Aba[]
}

export const GRUPOS: Grupo[] = [
  { id: "hoje", rotulo: "Hoje", href: "/membros", prefixos: ["/membros"], exato: true, abas: [] },
  {
    id: "frente",
    rotulo: "Minha frente",
    href: "/membros/frente",
    prefixos: ["/membros/frente", "/membros/sprints", "/membros/metas", "/membros/horas"],
    abas: [
      { href: "/membros/frente", rotulo: "Sprints", prefixos: ["/membros/frente", "/membros/sprints"] },
      { href: "/membros/metas", rotulo: "Metas", prefixos: ["/membros/metas"] },
      { href: "/membros/horas", rotulo: "Horas", prefixos: ["/membros/horas"] },
    ],
  },
  {
    id: "aprender",
    rotulo: "Aprender",
    href: "/membros/aprendizagem",
    prefixos: ["/membros/aprendizagem"],
    abas: [],
  },
  {
    id: "equipe",
    rotulo: "Equipe",
    href: "/membros/mural",
    prefixos: [
      "/membros/mural",
      "/membros/calendario",
      "/membros/diretorio",
      "/membros/documentacao",
      "/membros/inventario",
      "/membros/compras",
      "/membros/novidades",
      "/membros/metricas",
    ],
    abas: [
      { href: "/membros/mural", rotulo: "Mural", prefixos: ["/membros/mural"] },
      { href: "/membros/calendario", rotulo: "Calendário", prefixos: ["/membros/calendario"] },
      { href: "/membros/diretorio", rotulo: "Pessoas", prefixos: ["/membros/diretorio"] },
      { href: "/membros/documentacao", rotulo: "Documentos", prefixos: ["/membros/documentacao"] },
      { href: "/membros/inventario", rotulo: "Inventário", prefixos: ["/membros/inventario"] },
      { href: "/membros/compras", rotulo: "Compras", prefixos: ["/membros/compras"] },
      { href: "/membros/metricas", rotulo: "Métricas", prefixos: ["/membros/metricas"] },
    ],
  },
  {
    id: "gestao",
    rotulo: "Gestão",
    href: "/membros/administracao",
    prefixos: ["/membros/administracao"],
    exigeCargo: true,
    abas: [
      { href: "/membros/administracao", rotulo: "Visão geral", prefixos: ["/membros/administracao"], exato: true },
      { href: "/membros/administracao/atas", rotulo: "Atas", prefixos: ["/membros/administracao/atas"] },
      { href: "/membros/administracao/cargos", rotulo: "Cargos", prefixos: ["/membros/administracao/cargos"] },
      { href: "/membros/administracao/patrimonio", rotulo: "Patrimônio", prefixos: ["/membros/administracao/patrimonio"] },
      { href: "/membros/administracao/horas", rotulo: "Horas", prefixos: ["/membros/administracao/horas"] },
      { href: "/membros/administracao/selecao", rotulo: "Seleção", prefixos: ["/membros/administracao/selecao"] },
      { href: "/membros/administracao/caixa", rotulo: "Caixa", prefixos: ["/membros/administracao/caixa"] },
      { href: "/membros/administracao/atividade", rotulo: "Atividade", prefixos: ["/membros/administracao/atividade"] },
    ],
  },
]

export function gruposVisiveis(comCargo: boolean): Grupo[] {
  return GRUPOS.filter((g) => !g.exigeCargo || comCargo)
}

export type Destino = { rotulo: string; detalhe: string; href: string }

/** Destinos de Ctrl+K: as telas do usuário (por cargo) mais atalhos de criação. */
export function destinosDaPaleta(comCargo: boolean): Destino[] {
  const telas = gruposVisiveis(comCargo).flatMap((g) =>
    g.abas.length > 0
      ? g.abas.map((a) => ({ rotulo: a.rotulo, detalhe: g.rotulo, href: a.href }))
      : [{ rotulo: g.rotulo, detalhe: "Tela", href: g.href }],
  )
  return [
    ...telas,
    /*
     * Ações levam um parâmetro que a página de destino lê para abrir o
     * formulário (que nasce recolhido) e, no diretório, focar a busca. Sem o
     * parâmetro o atalho chegaria a uma tela sem formulário à vista.
     */
    { rotulo: "Nova meta", detalhe: "Ação", href: "/membros/metas?nova=1" },
    { rotulo: "Pedir compra", detalhe: "Ação", href: "/membros/compras" },
    { rotulo: "Novidades", detalhe: "Tela", href: "/membros/novidades" },
    ...(comCargo
      ? [
          { rotulo: "Novo aviso", detalhe: "Ação", href: "/membros/mural?novo=1" },
          { rotulo: "Novo evento", detalhe: "Ação", href: "/membros/calendario?novo=1" },
        ]
      : []),
    { rotulo: "Buscar pessoa", detalhe: "Ação", href: "/membros/diretorio?busca=1" },
    { rotulo: "Editar perfil", detalhe: "Conta", href: "/membros/completar-perfil" },
  ]
}

const casa = (pathname: string, prefixo: string, exato?: boolean) =>
  pathname === prefixo || (!exato && pathname.startsWith(`${prefixo}/`))

/** Grupo da rota. Prefixo mais longo vence; rota fora do mapa devolve undefined. */
export function grupoAtual(pathname: string, grupos: Grupo[] = GRUPOS): Grupo | undefined {
  let melhor: { grupo: Grupo; tamanho: number } | undefined
  for (const grupo of grupos) {
    for (const prefixo of grupo.prefixos) {
      if (casa(pathname, prefixo, grupo.exato) && (!melhor || prefixo.length > melhor.tamanho)) {
        melhor = { grupo, tamanho: prefixo.length }
      }
    }
  }
  return melhor?.grupo
}

export function abaAtual(pathname: string, grupo: Grupo | undefined): Aba | undefined {
  if (!grupo) return undefined
  let melhor: { aba: Aba; tamanho: number } | undefined
  for (const aba of grupo.abas) {
    for (const prefixo of aba.prefixos) {
      if (casa(pathname, prefixo, aba.exato) && (!melhor || prefixo.length > melhor.tamanho)) {
        melhor = { aba, tamanho: prefixo.length }
      }
    }
  }
  return melhor?.aba
}

const TITULOS: Record<string, string> = {
  "/membros": "Hoje",
  "/membros/frente": "Minha frente",
  "/membros/sprints/competicao": "Competição",
  "/membros/sprints/pesquisa": "Pesquisa",
  "/membros/sprints/projetos": "Projetos",
  "/membros/metas": "Metas",
  "/membros/aprendizagem": "Aprendizagem",
  "/membros/mural": "Mural",
  "/membros/calendario": "Calendário",
  "/membros/diretorio": "Pessoas",
  "/membros/documentacao": "Documentos",
  "/membros/inventario": "Inventário",
  "/membros/compras": "Compras",
  "/membros/novidades": "Novidades",
  "/membros/horas": "Minhas horas",
  "/membros/administracao/horas": "Horas e presença",
  "/membros/administracao/selecao": "Processo seletivo",
  "/membros/administracao/caixa": "Caixa",
  "/membros/administracao/atividade": "Atividade",
  "/membros/metricas": "Métricas",
  "/membros/administracao": "Gestão",
  "/membros/administracao/atas": "Atas",
  "/membros/administracao/cargos": "Cargos e aprovação",
  "/membros/administracao/patrimonio": "Patrimônio",
  "/membros/completar-perfil": "Completar perfil",
  "/membros/aguardando": "Aguardando aprovação",
}

export function titulo(pathname: string): string {
  return TITULOS[pathname] ?? "Área de membros"
}
