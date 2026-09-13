/**
 * Dados de patrocínio, fora do componente.
 *
 * Ficavam dentro de components/parceiros.tsx, que é "use client". Agora a
 * página pública e a proposta imprimível leem a MESMA fonte — o benefício de
 * um nível não pode divergir entre o que a empresa lê no site e o que recebe
 * em PDF.
 */

export type Nivel = {
  nome: string
  /** Referência a outro nível. Sai como linha própria, não como benefício. */
  herda: string | null
  beneficios: string[]
  destaque?: boolean
  /** Contribuição que não é de empresa: ex-membro, pessoa física, doação pontual. */
  apoioIndividual?: boolean
}

export const NIVEIS: Nivel[] = [
  {
    nome: "Amigos da GEAR",
    herda: null,
    beneficios: [
      "Nome na página de Parceiros, na seção de apoiadores",
      "Relatório semestral do que o apoio destravou, por projeto",
    ],
    apoioIndividual: true,
  },
  {
    nome: "Bronze",
    herda: null,
    beneficios: [
      "Logo da empresa na página de Parceiros do site",
      "Menção em posts de redes sociais sobre resultados da equipe",
    ],
  },
  {
    nome: "Prata",
    herda: "Tudo do nível Bronze",
    beneficios: ["Nome/logo na camiseta da equipe de Competição"],
  },
  {
    nome: "Ouro",
    herda: "Tudo do nível Prata",
    beneficios: [
      "Logo em posição de destaque no robô de competição",
      "Agradecimento especial em apresentações públicas da GEAR (como a Universidade Aberta UFSCar)",
    ],
    destaque: true,
  },
]

export const VALOR = [
  {
    titulo: "Visibilidade",
    texto:
      "Marca junto do trabalho, não num banner solto: nas fichas técnicas de cada projeto, no material publicado e nesta página. Quando os robôs entrarem em competição, também neles — é contrapartida do nível Ouro, e ainda não aconteceu.",
  },
  {
    titulo: "Acesso a talento técnico",
    texto:
      "Contato direto com estudantes de graduação da UFSCar Sorocaba, de qualquer curso, formados dentro de um processo que termina em projeto entregue e defendido. Hoje são onze pessoas em três frentes; a entidade está no primeiro ciclo.",
  },
  {
    titulo: "Associação institucional",
    texto:
      "O GEAR é atividade de extensão registrada na ProEx-UFSCar, com orientação docente e prestação de contas à universidade. O apoio vai para uma estrutura formal, não para um coletivo informal.",
  },
]

/*
 * Quem responde por patrocínio.
 *
 * Referência: a RoboJackets nomeia a pessoa e dá um e-mail dedicado
 * (sponsors@robojackets.org) em vez do contato genérico. Empresa quer saber
 * com quem vai falar.
 *
 * `nome` em branco faz a página e a proposta mostrarem o aviso de pendência
 * em vez de inventar alguém — a diretoria precisa designar formalmente.
 */
export const RESPONSAVEL_PATROCINIO = {
  cargo: "Tesouraria",
  nome: "",
}
