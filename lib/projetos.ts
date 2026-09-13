/**
 * Portfólio de projetos.
 *
 * Fica em código, não no banco, por três motivos: é conteúdo editorial que
 * muda pouco; qualquer membro edita por pull request, sem precisar de painel;
 * e não depende de migração para existir — o mesmo caminho que `time.tsx`,
 * `parceiros.tsx` e `works.tsx` já usam.
 *
 * REGRA DE CONTEÚDO: nada aqui é inventado. O texto técnico dos dois projetos
 * abaixo veio do Diário de Bordo original da própria GEAR (commit 258c588,
 * components/works.tsx), escrito por vocês. Campos que a entidade ainda não
 * definiu ficam ausentes de propósito e a página mostra "a definir" — o mesmo
 * tratamento que `necessidades` recebe em parceiros.tsx.
 *
 * PARA ADICIONAR UM PROJETO: copie um bloco, preencha, e ele aparece na
 * página. Nada mais precisa mudar.
 */

export const ETAPAS = ["Em desenvolvimento", "Em testes", "Concluído", "Pausado"] as const
export type Etapa = (typeof ETAPAS)[number]

/** Frentes da entidade, espelhando lib/administracao.ts. */
export type Frente = "Competição" | "Pesquisa" | "Projetos"

export type Projeto = {
  slug: string
  nome: string
  frente: Frente
  etapa: Etapa
  /** Uma frase. É o que aparece no card antes de a pessoa abrir os detalhes. */
  resumo: string
  /** O problema que o projeto ataca — não o que ele é, mas por que existe. */
  problema: string
  /** Como foi resolvido, em linguagem técnica mas legível. */
  abordagem: string[]
  /** Pares mostrados na ficha técnica. Só o que a narrativa sustenta. */
  ficha: { label: string; valor: string }[]
  tecnologias: string[]
  /**
   * Limitação conhecida e assumida. É o campo mais importante desta estrutura:
   * é o que diferencia a GEAR das referências, e some se ninguém preencher.
   */
  limitacao?: string
  /** Participações em competição. Vazio = ainda não competiu. */
  competicoes?: { evento: string; ano: number; resultado: string }[]
  proximosPassos?: string[]
  /** Caminho em public/fotos/. Ausente = o card usa o bloco tipográfico. */
  foto?: string
  repositorio?: string
}

export const PROJETOS: Projeto[] = [
  {
    slug: "ai-rover",
    nome: "AI Rover",
    frente: "Pesquisa",
    etapa: "Em desenvolvimento",
    resumo:
      "Rover autônomo com percepção por visão computacional, dividido em três unidades que falham de forma independente.",
    problema:
      "Um robô que depende de um único computador para enxergar, decidir e agir para por inteiro quando qualquer uma das três coisas falha. Em bancada isso é inconveniente; em pista é o fim da prova.",
    abordagem: [
      "Dividimos o rover em três partes: o ESP32-S3-CAM cuida dos olhos e do rádio, o Arduino UNO dos reflexos, o notebook do raciocínio via YOLO.",
      "Se o notebook trava, o Arduino para sozinho — nenhuma parte depende cegamente da outra. A separação é de responsabilidade, não só de hardware.",
    ],
    ficha: [
      { label: "Olhos e rádio", valor: "ESP32-S3-CAM" },
      { label: "Reflexos", valor: "ARDUINO UNO" },
      { label: "Raciocínio", valor: "NOTEBOOK · YOLO" },
      { label: "Odometria", valor: "MALHA ABERTA" },
    ],
    tecnologias: ["ESP32-S3", "Arduino", "YOLO", "Visão computacional", "C++", "Python"],
    limitacao:
      "O AI Rover não tem encoders nas rodas. Sabemos a força que mandamos pro motor, não quanto ele andou de fato — e isso significa que mapa e rota ainda não são confiáveis. Preferimos falar isso agora do que deixar alguém descobrir sozinho depois.",
    proximosPassos: [
      "Instalar encoders nas rodas e fechar a malha de odometria",
      "Embarcar o processamento, tirando a dependência do notebook e do rádio",
    ],
    foto: "/fotos/ai-rover.jpg",
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
    abordagem: [
      "No lugar de tratar cada sensor de linha isoladamente, demos um peso pra cada posição. O resultado é uma estimativa numérica da posição da linha, não só 'tem linha / não tem linha' — e isso mudou tudo na suavidade do movimento.",
      "Sobre essa estimativa entrou um controlador PID: erro pequeno vira correção pequena, erro grande vira correção maior. O robô parou de 'brigar' com a própria trajetória.",
      "Dava pra usar aprendizado de máquina no controle de linha. Não usamos porque o problema já tinha solução determinística boa. Complexidade sem necessidade real não é sofisticação, é desperdício.",
    ],
    ficha: [
      { label: "Mapa de pesos", valor: "-200 -100 0 +100 +200" },
      { label: "Leitura", valor: "MÉDIA PONDERADA" },
      { label: "Kp", valor: "0,30" },
      { label: "Kd", valor: "0,075" },
      { label: "Abordagem", valor: "DETERMINÍSTICA" },
    ],
    tecnologias: ["Rodas mecanum", "Controle PID", "Sensores de linha", "C++"],
    proximosPassos: ["Ajuste fino do termo integral", "Ensaio em pista de competição"],
    foto: "/fotos/mecanum.jpg",
  },
]

export const FRENTES_PROJETO: Frente[] = ["Competição", "Pesquisa", "Projetos"]
