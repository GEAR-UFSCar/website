/**
 * Ementa da Academia GEAR.
 *
 * Os títulos são os reais, iguais aos que a migração 002 grava na tabela
 * `modulos` — nada aqui é inventado. Existem em código para que a página
 * PÚBLICA (/academia) possa mostrar a ementa sem depender do banco nem de
 * sessão; a área de membros continua lendo de `modulos`, porque lá o que
 * importa é o progresso individual, não a lista.
 *
 * Se a ementa mudar, mude nos dois: aqui e num UPDATE na tabela. É duplicação
 * consciente — o alternativo seria expor `modulos` a visitante anônimo, o que
 * abriria uma superfície de leitura que a migração 014 acabou de fechar.
 */

export const NIVEIS_ACADEMIA = ["Fundamental", "Principal", "Avançada"] as const
export type NivelAcademia = (typeof NIVEIS_ACADEMIA)[number]

export type ModuloPublico = {
  nivel: NivelAcademia
  ordem: number
  titulo: string
}

export const MODULOS: ModuloPublico[] = [
  { nivel: "Fundamental", ordem: 1, titulo: "Fundamentos de robótica e programação" },
  { nivel: "Fundamental", ordem: 2, titulo: "Introdução à Programação de Robôs usando ROS 2" },
  { nivel: "Fundamental", ordem: 3, titulo: "Atividades práticas introdutórias com os kits (LAFVIN, OSOYOO)" },
  { nivel: "Principal", ordem: 1, titulo: "Programação e simulação de robôs" },
  { nivel: "Principal", ordem: 2, titulo: "Arquiteturas de agentes inteligentes" },
  {
    nivel: "Principal",
    ordem: 3,
    titulo:
      "Introdução à Tomada de Decisão de Robôs Móveis Autônomos usando Aprendizado por Reforço",
  },
  { nivel: "Avançada", ordem: 1, titulo: "Aprofundamento na frente escolhida" },
  { nivel: "Avançada", ordem: 2, titulo: "Projeto de Validação" },
  { nivel: "Avançada", ordem: 3, titulo: "Avaliação Técnica final" },
]

/** O que cada nível entrega. Descreve a estrutura, não promete resultado. */
export const DESCRICAO_NIVEL: Record<NivelAcademia, string> = {
  Fundamental:
    "O vocabulário comum. Sai daqui quem consegue ler o código do grupo e entender do que a conversa trata — eletrônica, programação e o primeiro contato com ROS 2, sobre kits físicos.",
  Principal:
    "Simulação, arquitetura de agentes e aprendizado por reforço. É onde o repertório técnico deixa de ser introdutório e passa a sustentar decisão de projeto.",
  Avançada:
    "Aprofundamento na frente escolhida, um projeto do início ao fim e a avaliação técnica. A conversa final cobre o que funcionou e o que não funcionou — as duas respostas contam.",
}

/*
 * A formação é sequencial: o módulo seguinte só abre quando o anterior é
 * concluído. A regra vale no banco, não só na tela — trigger
 * validar_ordem_progresso() em supabase/005_ordem_progresso.sql.
 */
export const REGRA_SEQUENCIAL =
  "Os módulos abrem em ordem: o seguinte só libera quando o anterior é concluído. Não é burocracia — cada um assume o vocabulário do anterior."
