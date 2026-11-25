/**
 * Os três instrumentos da Pesquisa de Clima (doc. 33). As respostas ficam sem
 * nome (035) e só aparecem somadas, com no mínimo cinco respondentes.
 */

export type Pergunta =
  | { id: string; texto: string; tipo: "escala" }
  | { id: string; texto: string; tipo: "aberta" }
  | { id: string; texto: string; tipo: "opcao"; opcoes: readonly string[] }

export type ModeloPesquisa = { id: string; nome: string; descricao: string; perguntas: readonly Pergunta[] }

const escala = (id: string, texto: string): Pergunta => ({ id, texto, tipo: "escala" })

export const MODELOS_PESQUISA: readonly ModeloPesquisa[] = [
  {
    id: "clima_semestral",
    nome: "Pesquisa de clima semestral",
    descricao: "De 1 (discordo totalmente) a 5 (concordo totalmente). Não há resposta certa.",
    perguntas: [
      escala("acolhido", "Eu me sinto acolhido(a) no GEAR."),
      escala("expectativa", "Sei o que se espera de mim e quais são as minhas tarefas."),
      escala("carga", "A carga de trabalho é compatível com a minha rotina acadêmica."),
      escala("aprendo", "Aprendo coisas úteis participando do Grupo."),
      escala("apoio", "Recebo apoio quando tenho dúvidas ou dificuldades."),
      escala("opinar", "Posso expressar opiniões e discordar com respeito."),
      escala("decisoes", "As decisões do Grupo são claras e transparentes."),
      escala("acessiveis", "Os líderes de trilha e a Diretoria são acessíveis."),
      escala("seguro", "Sinto-me seguro(a) nas atividades (oficina, testes, viagens)."),
      escala("canais", "Conheço e confio nos canais para relatar problemas."),
      escala("reconhecido", "Meu trabalho é reconhecido."),
      escala("reunioes", "As reuniões são úteis e bem conduzidas."),
      escala("ferramentas", "As ferramentas e a documentação me ajudam a trabalhar."),
      escala("continuar", "Pretendo continuar no GEAR no próximo semestre."),
      escala("recomendaria", "Eu recomendaria o GEAR a um colega."),
      { id: "funciona", texto: "O que mais funciona bem no GEAR?", tipo: "aberta" },
      { id: "atrapalha", texto: "O que mais atrapalha o seu trabalho ou a sua experiência?", tipo: "aberta" },
      { id: "mudaria", texto: "Se pudesse mudar uma coisa, qual seria?", tipo: "aberta" },
      { id: "contar", texto: "Há algo que você gostaria de contar, e não sabe a quem?", tipo: "aberta" },
      { id: "trilha", texto: "Trilha principal (opcional)", tipo: "opcao", opcoes: ["Academia", "Pesquisa", "Competição", "Projetos"] },
      { id: "tempo", texto: "Tempo no Grupo (opcional)", tipo: "opcao", opcoes: ["Até 3 meses", "3 a 6 meses", "Mais de 6 meses"] },
    ],
  },
  {
    id: "clima_30_dias",
    nome: "Pesquisa rápida de 30 dias",
    descricao: "Para quem entrou há um mês.",
    perguntas: [
      escala("recepcao", "Como foi a sua recepção no Grupo?"),
      escala("proximo", "Você sabe o que fazer a seguir?"),
      { id: "ajudou", texto: "O que ajudou mais na sua integração?", tipo: "aberta" },
      { id: "faltou", texto: "O que faltou?", tipo: "aberta" },
    ],
  },
  {
    id: "saida",
    nome: "Pesquisa de saída",
    descricao: "Voluntária, para quem se desliga ou se forma.",
    perguntas: [
      { id: "motivo", texto: "Principal motivo da saída", tipo: "opcao", opcoes: ["Formatura", "Carga de trabalho", "Clima", "Outras prioridades", "Perda de interesse", "Outro"] },
      { id: "valorizou", texto: "O que você mais valorizou no GEAR?", tipo: "aberta" },
      { id: "melhor", texto: "O que o Grupo poderia ter feito melhor?", tipo: "aberta" },
      { id: "colaborar", texto: "Você aceitaria colaborar como ex-membro (mentoria, indicação, palestra)?", tipo: "opcao", opcoes: ["Sim", "Talvez", "Não"] },
    ],
  },
]

export const modeloPesquisa = (id: string) => MODELOS_PESQUISA.find((m) => m.id === id)

/**
 * Leitura do doc. 33, seção 5.1: média e proporção de notas 1 e 2 por
 * afirmação; atenção a média abaixo de [3,5].
 */
export function resumirEscala(respostas: Record<string, unknown>[], id: string) {
  const notas = respostas.map((r) => Number(r[id])).filter((n) => n >= 1 && n <= 5)
  if (notas.length === 0) return null
  const media = notas.reduce((s, n) => s + n, 0) / notas.length
  const baixas = notas.filter((n) => n <= 2).length / notas.length
  return { media, baixas, n: notas.length, atencao: media < 3.5 }
}
