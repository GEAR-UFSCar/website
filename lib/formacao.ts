/**
 * As seis etapas da formação — fonte única.
 *
 * Viviam copiadas literalmente em components/sobre.tsx e app/ingressar/page.tsx,
 * e já tinham divergido: "Escolha da Frente" numa página e "Escolha da frente"
 * na outra, e a primeira etapa ganhou uma frase só num dos lados. Duas cópias
 * de um texto institucional divergem sempre; a pergunta é só quando.
 *
 * `nota` é o que aparece apenas em /sobre. Em /ingressar a mesma informação já
 * está no aviso de inscrições fechadas no topo da página, e repeti-la logo
 * abaixo soava a texto gerado.
 */
export type Etapa = {
  nome: string
  texto: string
  /** Só /sobre renderiza. Ver comentário acima. */
  nota?: string
}

export const ETAPAS_FORMACAO: Etapa[] = [
  {
    nome: "Processo Seletivo",
    texto:
      "Avaliamos como a pessoa pensa diante de um problema sem resposta pronta, em vez de medir conhecimento acumulado.",
    nota: "O próximo ciclo ainda não tem data; quem quiser ser avisado pode escrever para a gente.",
  },
  {
    nome: "Bootcamp de Integração",
    texto:
      "Primeiro contato com as ferramentas, o repositório e o jeito como o grupo trabalha no dia a dia.",
  },
  {
    nome: "Academia GEAR",
    texto:
      "Fundamentos de eletrônica, programação e controle. É o vocabulário comum que todo mundo precisa ter para conversar.",
  },
  {
    nome: "Projeto de Validação",
    texto:
      "Um projeto pequeno, do início ao fim. É onde a teoria encontra o fio solto e o que estava no papel passa a existir.",
  },
  {
    nome: "Avaliação Técnica",
    texto:
      "Conversa sobre o que foi construído: o que funcionou, o que não funcionou e por quê. As duas respostas contam.",
  },
  {
    nome: "Escolha da Frente",
    texto:
      "Competição, Pesquisa ou Projetos. Quem entrou decide, já com repertório para escolher.",
  },
]
