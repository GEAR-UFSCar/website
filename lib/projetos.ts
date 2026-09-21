/**
 * Portfólio técnico.
 *
 * Fica em código, não no banco: é conteúdo editorial que muda pouco, qualquer
 * membro edita por pull request, e não depende de migração para existir — o
 * mesmo caminho de `time.tsx` e `parceiros.tsx`.
 *
 * REGRA DE CONTEÚDO: nada aqui é inventado. O texto técnico veio do Diário de
 * Bordo original da própria GEAR (commit 258c588, components/works.tsx).
 * Campos que a entidade ainda não definiu ficam `undefined`, e a página mostra
 * o estado vazio de forma explícita — omitir a seção é o que página comercial
 * faz.
 *
 * ⚠ CAMPOS A CONFERIR — derivei do texto existente, não inventei, mas quem
 * construiu precisa validar: `objetivo` (os dois), `integrantes` (mapeados
 * pelo squad da frente em components/frentes.tsx) e a `limitacao` do
 * Navegador Mecanum (deduzida da ficha e dos próximos passos — ver comentário
 * no bloco). `anoInicio` ficou fora porque não há registro: preencham.
 */

export const ETAPAS = ["Em desenvolvimento", "Em testes", "Concluído", "Pausado"] as const
export type Etapa = (typeof ETAPAS)[number]

export type Frente = "Competição" | "Pesquisa" | "Projetos"

/** Decisão com a alternativa descartada. É o núcleo do portfólio. */
export type Decisao = {
  decisao: string
  /** O caminho que não foi tomado. Sem isto, "decisão" vira só descrição. */
  descartado?: string
  porque: string
}

/** Stack em camadas. Antes hardware, software e algoritmo viviam misturados. */
export type Stack = {
  hardware: string[]
  software: string[]
  algoritmos: { nome: string; parametros?: string }[]
}

export type Projeto = {
  slug: string
  nome: string
  frente: Frente
  etapa: Etapa
  /** Ausente = não registrado. A página mostra "ano a definir". */
  anoInicio?: number
  /** Uma frase — o que aparece antes dos detalhes. */
  resumo: string
  /** Onde o projeto roda: liga, disciplina ou demanda de extensão. */
  contexto?: string
  /** Por que o projeto existe. */
  problema: string
  /** O que conta como resolvido. Distinto do problema. */
  objetivo: string
  /** Enquadramento de pesquisa. Só faz sentido na frente Pesquisa. */
  hipotese?: string
  /** As partes e a fronteira entre elas. */
  arquitetura?: string
  decisoes: Decisao[]
  stack: Stack
  /** Quem constrói. Espelha os squads de components/frentes.tsx. */
  integrantes: string[]
  /**
   * OBRIGATÓRIO, sem `?`, de propósito: o TypeScript passa a recusar projeto
   * sem limitação declarada. A identidade editorial da GEAR vira regra do
   * sistema de tipos em vez de depender da disciplina de quem escreve.
   */
  limitacao: string
  /** O que custou caro para funcionar. Distinto de limitação. */
  dificuldades?: string[]
  /** Medição real, com método. Parâmetro de projeto não é métrica. */
  metricas?: { nome: string; valor: string; metodo: string }[]
  competicoes?: { evento: string; ano: number; resultado: string }[]
  proximosPassos?: string[]
  foto?: string
  galeria?: string[]
  video?: string
  repositorio?: string
  documentacao?: string
}

export const PROJETOS: Projeto[] = [
  {
    slug: "ai-rover",
    nome: "AI Rover",
    frente: "Projetos",
    etapa: "Em desenvolvimento",
    resumo:
      "Rover autônomo com percepção por visão computacional, dividido em três unidades que falham de forma independente.",
    problema:
      "Um robô que depende de um único computador para enxergar, decidir e agir para por inteiro quando qualquer uma das três coisas falha. Em bancada isso é inconveniente; em pista é o fim da prova.",
    // Derivado do problema e da arquitetura já descritos — confirmar.
    objetivo:
      "Que a falha de qualquer uma das três unidades não derrube as outras: o robô degrada, mas não para de forma perigosa.",
    arquitetura:
      "Três unidades com responsabilidades separadas: o ESP32-S3-CAM cuida dos olhos e do rádio, o Arduino UNO dos reflexos, o notebook do raciocínio via YOLO. A fronteira é de responsabilidade, não só de hardware — se o notebook trava, o Arduino para sozinho.",
    decisoes: [
      {
        decisao: "Separar percepção, reflexo e raciocínio em três unidades independentes.",
        descartado: "Concentrar tudo num único computador de bordo.",
        porque:
          "Com uma unidade só, qualquer falha derruba o robô inteiro. Separado, nenhuma parte depende cegamente da outra.",
      },
    ],
    stack: {
      hardware: ["ESP32-S3-CAM", "Arduino UNO", "Notebook externo"],
      software: ["C++", "Python"],
      algoritmos: [{ nome: "YOLO", parametros: "detecção de objetos em tempo real" }],
    },
    // Squad da frente Projetos, em components/frentes.tsx — confirmar.
    integrantes: ["Luiza", "Julio", "Elis"],
    limitacao:
      "O AI Rover não tem encoders nas rodas. Sabemos a força que mandamos pro motor, não quanto ele andou de fato — e isso significa que mapa e rota ainda não são confiáveis. Preferimos falar isso agora do que deixar alguém descobrir sozinho depois.",
    proximosPassos: [
      "Instalar encoders nas rodas e fechar a malha de odometria",
      "Embarcar o processamento, tirando a dependência do notebook e do rádio",
    ],
    foto: "/fotos/ai-rover.jpg",
    /*
     * A tela é o registro mais direto do que o rover faz: interface do AI
     * Rover v21 rodando ao vivo na SeCoT 2026, com o feed da câmera à
     * esquerda e a telemetria da decisão da IA à direita. Mesma foto que
     * abre o bloco da SeCoT na galeria da home.
     */
    galeria: ["/fotos/universidade-aberta/foto-08.jpg"],
  },
  {
    slug: "navegador-mecanum",
    nome: "Navegador Mecanum",
    frente: "Competição",
    etapa: "Em testes",
    resumo:
      "Robô seguidor de linha com rodas mecanum e controle PID, trocando decisão binária por estimativa contínua da trajetória.",
    problema:
      "Controle de linha por regra binária — 'tem linha / não tem linha' — produz oscilação constante: o robô briga com a própria trajetória em vez de seguir.",
    // Derivado do problema e do resultado descrito na abordagem — confirmar.
    objetivo:
      "Seguir a linha com correção proporcional ao erro, eliminando a oscilação de quem só sabe virar para um lado ou para o outro.",
    arquitetura:
      "Cinco sensores de linha alimentam uma média ponderada que estima a posição da linha como número, não como booleano. Sobre essa estimativa roda o controlador, que traduz erro em correção de tração nas rodas mecanum.",
    decisoes: [
      {
        decisao: "Atribuir um peso a cada posição de sensor e trabalhar com a média ponderada.",
        descartado: "Tratar cada sensor isoladamente, como presença ou ausência de linha.",
        porque:
          "A média devolve uma estimativa numérica da posição da linha, não só 'tem linha / não tem linha' — e é isso que permite correção proporcional.",
      },
      {
        decisao: "Controlador PID sobre a estimativa contínua.",
        descartado: "Regras binárias de 'vira esquerda / vira direita'.",
        porque:
          "Erro pequeno vira correção pequena, erro grande vira correção maior. O robô parou de brigar com a própria trajetória.",
      },
      {
        decisao: "Solução determinística.",
        descartado: "Aprendizado de máquina no controle de linha.",
        porque:
          "O problema já tinha solução determinística boa. Complexidade sem necessidade real não é sofisticação, é desperdício.",
      },
    ],
    stack: {
      hardware: ["Rodas mecanum", "Sensores de linha (5 posições)"],
      software: ["C++"],
      algoritmos: [
        { nome: "Média ponderada", parametros: "pesos -200 · -100 · 0 · +100 · +200" },
        { nome: "Controlador PID", parametros: "Kp 0,30 · Kd 0,075" },
      ],
    },
    // Squad da frente Competição, em components/frentes.tsx — confirmar.
    integrantes: ["João", "Nasser", "Guilherme"],
    /*
     * ⚠ DEDUZIDA, não escrita por vocês. Base: a ficha declara Kp e Kd mas
     * nenhum Ki, e "ajuste fino do termo integral" está em próximos passos —
     * ou seja, o controlador roda hoje sem o termo integral ajustado.
     * Confirmem a redação, ou troquem pela limitação que vocês reconhecem
     * como a mais séria. O campo é obrigatório justamente para não ficar em
     * branco.
     */
    limitacao:
      "O controlador roda hoje com os termos proporcional e derivativo ajustados, mas o integral ainda não. Enquanto isso, desvio pequeno e constante não é corrigido — o robô segue a linha com um erro residual que só o termo integral elimina.",
    proximosPassos: ["Ajuste fino do termo integral", "Ensaio em pista de competição"],
    foto: "/fotos/mecanum.jpg",
    /*
     * Fotos já no repositório, hoje usadas só na galeria da home. O alt em
     * components/universidade-aberta.tsx identifica as duas como sendo deste
     * robô ("Robô Mecanum sendo demonstrado numa mesa com pista de linha" e
     * "Robô Navegador Mecanum sobre a pista de testes"). Novas fotos entram
     * aqui — a galeria da página cresce sozinha.
     */
    galeria: [
      "/fotos/universidade-aberta/foto-05.jpg",
      "/fotos/universidade-aberta/foto-04.jpg",
    ],
  },
]

