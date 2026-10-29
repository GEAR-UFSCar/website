/**
 * Os formulários do sistema documental do GEAR (pacote de 27/10/2026), como
 * dado. Cada modelo diz de qual documento saiu, quem lê, se precisa de
 * aprovação e quais campos tem; a mesma tela preenche, mostra e imprime todos.
 *
 * Quem lê (`visibilidade`) é aplicado pelo banco (035): interno = todo membro;
 * restrito = quem tem cargo e o autor (dados pessoais, parceiros, demandas);
 * denuncia = só a diretoria. Um campo novo aqui não precisa de migração.
 */

export type Campo =
  | { id: string; rotulo: string; tipo: "texto" | "area" | "data" | "numero" | "pessoa"; ajuda?: string; obrigatorio?: boolean }
  | { id: string; rotulo: string; tipo: "opcao" | "multipla"; opcoes: readonly string[]; ajuda?: string; obrigatorio?: boolean }
  /** Lista de itens a marcar como feitos (checklists dos documentos). */
  | { id: string; rotulo: string; tipo: "checklist"; itens: readonly string[]; ajuda?: string; obrigatorio?: boolean }
  /** Tabela: linhas fixas (ex.: perigos da análise de risco) ou livres (ex.: bens). */
  | { id: string; rotulo: string; tipo: "tabela"; colunas: readonly string[]; linhas?: readonly string[]; ajuda?: string; obrigatorio?: boolean }

export type Modelo = {
  id: string
  nome: string
  grupo: Grupo
  /** De onde saiu, para quem quiser ler a regra inteira. */
  fonte: string
  descricao: string
  visibilidade: "interno" | "restrito" | "denuncia"
  /** Enviado vai para alguém com cargo aprovar (ou dar ciência) — nunca o próprio autor. */
  aprovacao?: string
  /** Linhas de assinatura na versão impressa. */
  assinaturas?: readonly string[]
  secoes: { titulo?: string; campos: readonly Campo[] }[]
}

export const GRUPOS_FORMULARIO = [
  "Projetos e pesquisa",
  "Segurança e voo",
  "Patrimônio, dinheiro e viagens",
  "Pessoas e cargos",
  "Gestão e rotina",
  "Comunicação e ofícios",
] as const
export type Grupo = (typeof GRUPOS_FORMULARIO)[number]

const TRILHAS = ["Academia", "Pesquisa", "Competição", "Projetos"] as const
const ORIENTADOR = "Professor orientador (ciência)"

export const MODELOS: readonly Modelo[] = [
  // ------------------------------------------------------------ Projetos e pesquisa
  {
    id: "ficha_projeto",
    nome: "Ficha de projeto",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 1; Regimento art. 27",
    descricao: "Todo projeto, em qualquer trilha, nasce com responsável, escopo e critério de pronto escritos.",
    visibilidade: "interno",
    aprovacao: "Área Técnica",
    assinaturas: ["Responsável do projeto", "Área Técnica"],
    secoes: [
      {
        campos: [
          { id: "trilha", rotulo: "Trilha", tipo: "opcao", opcoes: TRILHAS, obrigatorio: true },
          { id: "responsavel", rotulo: "Responsável", tipo: "pessoa", obrigatorio: true },
          { id: "suplente", rotulo: "Suplente", tipo: "pessoa", ajuda: "Quem conhece o estado do trabalho se o responsável faltar." },
          { id: "equipe", rotulo: "Equipe e papéis", tipo: "area" },
          { id: "objetivo", rotulo: "Objetivo (uma frase)", tipo: "texto", obrigatorio: true },
          { id: "problema", rotulo: "Problema e contexto", tipo: "area" },
          { id: "escopo", rotulo: "Escopo mínimo e o que fica fora", tipo: "area" },
          { id: "pronto", rotulo: "Entregas e critério de pronto", tipo: "area", obrigatorio: true },
          { id: "cronograma", rotulo: "Cronograma e marcos", tipo: "area" },
          { id: "recursos", rotulo: "Recursos e fonte", tipo: "area" },
          { id: "riscos", rotulo: "Riscos e mitigação", tipo: "area" },
          { id: "seguranca", rotulo: "Há risco físico? Há dados pessoais ou sensíveis?", tipo: "area" },
          { id: "pi", rotulo: "Propriedade intelectual e licença (parceiro, edital, código de terceiros?)", tipo: "area" },
          { id: "repositorio", rotulo: "Repositório", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "pitch",
    nome: "Pitch de projeto (5 minutos)",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 2; Manual da Trilha Projetos (doc. 19)",
    descricao: "A ideia só vira projeto oficial depois do pitch e da aprovação da Área Técnica (Regimento art. 26 § 1º).",
    visibilidade: "interno",
    aprovacao: "Área Técnica",
    secoes: [
      {
        campos: [
          { id: "problema", rotulo: "Problema (30 s): quem sofre e por quê", tipo: "area", obrigatorio: true },
          { id: "solucao", rotulo: "Solução (45 s): o que faremos, em uma frase", tipo: "area", obrigatorio: true },
          { id: "como", rotulo: "Como (60 s): tecnologias, equipe e plano", tipo: "area" },
          { id: "escopo", rotulo: "Escopo mínimo (45 s): o primeiro protótipo que prova a ideia", tipo: "area" },
          { id: "recursos", rotulo: "Recursos e riscos (60 s)", tipo: "area" },
          { id: "aprendizado", rotulo: "Aprendizado (30 s): o que o GEAR ganha", tipo: "area" },
          { id: "pedido", rotulo: "Pedido (30 s): decisão e apoio esperados", tipo: "area" },
          { id: "prazo", rotulo: "Prazo e marcos", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "demanda_externa",
    nome: "Ficha de demanda externa",
    grupo: "Projetos e pesquisa",
    fonte: "Manual da Trilha Projetos (doc. 19), seção 5",
    descricao:
      "Pedido de fora do GEAR, registrado antes de aceitar. Em tecnologia assistiva, identifique o caso por código e colete só o necessário: esta ficha é restrita.",
    visibilidade: "restrito",
    aprovacao: "Área Técnica e líder de Projetos",
    assinaturas: ["Responsável do esquadrão", "Área Técnica"],
    secoes: [
      {
        campos: [
          { id: "canal", rotulo: "Data e canal de entrada", tipo: "texto", obrigatorio: true },
          { id: "demandante", rotulo: "Demandante e contato", tipo: "texto", ajuda: "Só nesta ficha. Nos demais documentos, use o código da demanda." },
          { id: "problema", rotulo: "Descrição do problema", tipo: "area", obrigatorio: true },
          { id: "requisitos", rotulo: "Requisitos e restrições", tipo: "area" },
          { id: "dados", rotulo: "Dados pessoais necessários: quais, por quê, onde ficam", tipo: "area" },
          {
            id: "criterios",
            rotulo: "Critérios de aceitação",
            tipo: "checklist",
            itens: [
              "Problema claro e solução com utilidade real",
              "Cabe na capacidade do Grupo e tem valor de aprendizado",
              "Uso seguro; entregamos protótipo, não produto certificado",
              "Não compete com serviço comercial nem é serviço remunerado",
              "Demandante entende e aceita os limites (prazo, suporte, responsabilidade)",
            ],
          },
          { id: "decisao", rotulo: "Decisão", tipo: "opcao", opcoes: ["Em análise", "Aceita", "Recusada"] },
          { id: "esquadrao", rotulo: "Responsável e esquadrão", tipo: "texto" },
          { id: "combinados", rotulo: "Combinados: escopo, prazos, limites de responsabilidade", tipo: "area" },
          { id: "entrega", rotulo: "Entrega e aceite", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "adr",
    nome: "Registro de decisão (ADR)",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 4; Gestão do Conhecimento (doc. 22)",
    descricao: "Uma decisão técnica importante, com as opções e o porquê, para quem chegar depois.",
    visibilidade: "interno",
    secoes: [
      {
        campos: [
          { id: "projeto", rotulo: "Projeto", tipo: "texto" },
          { id: "contexto", rotulo: "Contexto: problema e restrições", tipo: "area", obrigatorio: true },
          { id: "opcoes", rotulo: "Opções consideradas, com prós e contras", tipo: "area" },
          { id: "decisao", rotulo: "Decisão: o que foi escolhido e por quê", tipo: "area", obrigatorio: true },
          { id: "consequencias", rotulo: "Consequências: riscos, custos e quando rever", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "relatorio_teste",
    nome: "Relatório de teste",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 5",
    descricao: "O que foi testado, em que condições, o esperado e o obtido.",
    visibilidade: "interno",
    secoes: [
      {
        campos: [
          { id: "data_local", rotulo: "Data, local e responsável", tipo: "texto", obrigatorio: true },
          { id: "versao", rotulo: "O que foi testado (versão do código e do hardware)", tipo: "area", obrigatorio: true },
          { id: "cenario", rotulo: "Cenário e condições", tipo: "area" },
          { id: "procedimento", rotulo: "Procedimento", tipo: "area" },
          { id: "resultado", rotulo: "Resultado esperado × obtido", tipo: "area", obrigatorio: true },
          { id: "falhas", rotulo: "Falhas e observações", tipo: "area" },
          { id: "evidencias", rotulo: "Evidências (vídeos, rosbags, fotos): onde estão", tipo: "texto" },
          { id: "proximos", rotulo: "Ações seguintes", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "design_review",
    nome: "Relatório de design review",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 6; Trilha Competição (doc. 18), seção 6",
    descricao: "Revisão em portão (conceito, preliminar, prontidão), com decisão de seguir, ajustar ou parar.",
    visibilidade: "interno",
    aprovacao: "Área Técnica",
    secoes: [
      {
        campos: [
          { id: "portao", rotulo: "Portão", tipo: "opcao", opcoes: ["Conceito", "Projeto preliminar", "Prontidão"], obrigatorio: true },
          { id: "revisores", rotulo: "Revisores", tipo: "texto" },
          { id: "apresentado", rotulo: "O que foi apresentado", tipo: "area" },
          { id: "fortes", rotulo: "Pontos fortes", tipo: "area" },
          { id: "riscos", rotulo: "Riscos e pendências", tipo: "area" },
          { id: "decisao", rotulo: "Decisão", tipo: "opcao", opcoes: ["Seguir", "Seguir com ajustes", "Parar"], obrigatorio: true },
          { id: "acoes", rotulo: "Ações e prazos", tipo: "tabela", colunas: ["Ação", "Responsável", "Prazo"] },
        ],
      },
    ],
  },
  {
    id: "post_mortem",
    nome: "Post-mortem de projeto",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 7; Gestão do Conhecimento (doc. 22)",
    descricao: "Sem culpados: o foco é o processo. Todo projeto é encerrado formalmente, mesmo o suspenso.",
    visibilidade: "interno",
    secoes: [
      {
        campos: [
          { id: "objetivo", rotulo: "Objetivo e resultado", tipo: "area", obrigatorio: true },
          { id: "linha", rotulo: "Linha do tempo resumida", tipo: "area" },
          { id: "funcionou", rotulo: "O que funcionou", tipo: "area" },
          { id: "nao", rotulo: "O que não funcionou e por quê", tipo: "area" },
          { id: "acoes", rotulo: "Ações", tipo: "tabela", colunas: ["Ação", "Responsável", "Prazo"] },
          { id: "arquivo", rotulo: "Onde estão o código, os dados e a documentação", tipo: "texto", obrigatorio: true },
        ],
      },
    ],
  },
  {
    id: "plano_pesquisa",
    nome: "Plano de projeto de pesquisa",
    grupo: "Projetos e pesquisa",
    fonte: "Manual da Trilha Pesquisa (doc. 17), seção 4; portões P0 e P1 (doc. 34)",
    descricao: "Aprovado antes de rodar o primeiro experimento.",
    visibilidade: "interno",
    aprovacao: "Líder da Pesquisa e Área Técnica",
    secoes: [
      {
        campos: [
          { id: "linha", rotulo: "Título e linha", tipo: "texto", obrigatorio: true },
          { id: "pergunta", rotulo: "Pergunta de pesquisa (uma frase)", tipo: "area", obrigatorio: true },
          { id: "justificativa", rotulo: "Justificativa e trabalhos relacionados", tipo: "area" },
          { id: "metodo", rotulo: "Método, dados, métricas, baselines e número de sementes", tipo: "area", obrigatorio: true },
          { id: "equipe", rotulo: "Responsável, membros e orientador", tipo: "area" },
          { id: "cronograma", rotulo: "Cronograma, marcos e prazo final", tipo: "area" },
          { id: "recursos", rotulo: "Recursos (computação, equipamentos, dados)", tipo: "area" },
          { id: "riscos", rotulo: "Riscos técnicos, de prazo e éticos", tipo: "area" },
          { id: "destino", rotulo: "Evento ou periódico-alvo", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "plano_experimento",
    nome: "Plano de experimento",
    grupo: "Projetos e pesquisa",
    fonte: "Caderno de Modelos (doc. 03), seção 8",
    descricao: "Escrito antes de rodar: o que se espera, como medir e quando parar.",
    visibilidade: "interno",
    secoes: [
      {
        campos: [
          { id: "hipotese", rotulo: "Pergunta e hipótese", tipo: "area", obrigatorio: true },
          { id: "ambiente", rotulo: "Ambiente, dados e cenários", tipo: "area" },
          { id: "metodos", rotulo: "Métodos e baselines", tipo: "area" },
          { id: "metricas", rotulo: "Métricas (desempenho e segurança)", tipo: "area" },
          { id: "sementes", rotulo: "Sementes e repetições", tipo: "texto" },
          { id: "computacao", rotulo: "Recursos computacionais", tipo: "texto" },
          { id: "parada", rotulo: "Critério de parada", tipo: "texto" },
          { id: "registro", rotulo: "Onde os resultados serão registrados", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "checklist_submissao",
    nome: "Checklist de submissão de artigo",
    grupo: "Projetos e pesquisa",
    fonte: "Manual da Trilha Pesquisa (doc. 17), seção 9; portão P5 (doc. 34)",
    descricao: "Antes de enviar qualquer trabalho a evento ou periódico.",
    visibilidade: "interno",
    aprovacao: "Líder da Pesquisa",
    secoes: [
      {
        campos: [
          { id: "trabalho", rotulo: "Trabalho e destino", tipo: "texto", obrigatorio: true },
          {
            id: "itens",
            rotulo: "Itens",
            tipo: "checklist",
            itens: [
              "Pergunta, contribuição e limitações claramente escritas",
              "Resultados com várias sementes e medidas de dispersão",
              "Código e dados arquivados com instruções de reprodução",
              "Referências conferidas, sem plágio, com citação correta",
              "Lista de autores e ordem acordadas por escrito",
              "Parceiros consultados, se houver cláusula de análise prévia",
              "Uso de IA declarado, se exigido",
              "Revisão interna por pessoa que não participou do texto",
              "Professor orientador informado",
            ],
          },
          { id: "autores", rotulo: "Autores, na ordem acordada", tipo: "area" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Segurança e voo
  {
    id: "incidente",
    nome: "Relatório de incidente",
    grupo: "Segurança e voo",
    fonte: "Normas de Segurança (doc. 05), Parte 2; Regimento art. 67",
    descricao:
      "Acidente, incidente ou quase-acidente, no mesmo dia. O objetivo é entender a causa e corrigir a prática, não punir. Relatar quase-acidente é conduta esperada.",
    visibilidade: "restrito",
    aprovacao: "Coordenador de segurança ou Presidente",
    assinaturas: ["Relator(a)", "Coordenador de segurança ou Presidente", ORIENTADOR],
    secoes: [
      {
        titulo: "Classificação, quando e onde",
        campos: [
          { id: "classe", rotulo: "Classificação", tipo: "opcao", opcoes: ["Quase-acidente (sem dano)", "Incidente (dano material)", "Acidente (lesão a pessoa)"], obrigatorio: true },
          { id: "atividade", rotulo: "Atividade", tipo: "opcao", opcoes: ["Bancada", "Bateria", "Voo", "Teste de robô", "Transporte", "Outra"], obrigatorio: true },
          { id: "quando", rotulo: "Data e hora", tipo: "texto", obrigatorio: true },
          { id: "local", rotulo: "Local", tipo: "texto", obrigatorio: true },
          { id: "presentes", rotulo: "Pessoas presentes (nome e função)", tipo: "area" },
        ],
      },
      {
        titulo: "O que aconteceu",
        campos: [
          { id: "fatos", rotulo: "Fatos em ordem, sem atribuir culpa", tipo: "area", obrigatorio: true },
          { id: "lesao", rotulo: "Lesão a pessoa e socorro prestado", tipo: "area" },
          { id: "dano", rotulo: "Dano a equipamento (código do inventário)", tipo: "texto" },
          { id: "acionados", rotulo: "Foram acionados", tipo: "multipla", opcoes: ["Ninguém", "SAMU 192", "Bombeiros 193", "Vigilância do Campus"] },
        ],
      },
      {
        titulo: "Causas e ações",
        campos: [
          {
            id: "causas",
            rotulo: "Causas prováveis",
            tipo: "multipla",
            opcoes: ["Falha de equipamento", "Falha de procedimento", "Falha de comunicação", "Falta de formação", "Condições do ambiente", "Pressa ou pressão de prazo", "Outra"],
          },
          { id: "analise", rotulo: "Análise: por que ocorreu", tipo: "area" },
          { id: "acoes", rotulo: "Ações corretivas ou preventivas", tipo: "tabela", colunas: ["Ação", "Responsável", "Prazo"] },
          { id: "retomada", rotulo: "As atividades afetadas podem ser retomadas?", tipo: "texto" },
          { id: "externo", rotulo: "Comunicar ProEx, parceiro ou órgão externo?", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "operacao_voo",
    nome: "Operação de voo",
    grupo: "Segurança e voo",
    fonte: "Protocolo de Voo (doc. 06), seção 5 e Anexos A a D; Regimento art. 66",
    descricao:
      "Plano de voo, análise de risco, lista pré-voo, registro e lista pós-voo, num registro só. Sem aprovação do coordenador de segurança, não há voo.",
    visibilidade: "interno",
    aprovacao: "Coordenador de segurança de voo",
    assinaturas: ["Piloto responsável", "Coordenador de segurança de voo"],
    secoes: [
      {
        titulo: "Plano de voo",
        campos: [
          { id: "objetivo", rotulo: "Objetivo", tipo: "texto", obrigatorio: true },
          { id: "local_horario", rotulo: "Local e horário", tipo: "texto", obrigatorio: true },
          { id: "aeronave", rotulo: "Aeronave (massa, tamanho, código)", tipo: "texto", obrigatorio: true },
          { id: "piloto", rotulo: "Piloto responsável", tipo: "pessoa", obrigatorio: true },
          { id: "observador", rotulo: "Observador (não pode ser o piloto)", tipo: "pessoa", obrigatorio: true },
          { id: "autorizacoes", rotulo: "Autorização do espaço aéreo (nº SARPAS) e do local", tipo: "texto" },
          { id: "limites", rotulo: "Limites da operação (altura até 120 m, área, duração)", tipo: "texto" },
        ],
      },
      {
        titulo: "Análise de risco (Anexo D)",
        campos: [
          {
            id: "riscos",
            rotulo: "Risco = gravidade × probabilidade. Até 6: aceitável com controles; 7 a 14: medida adicional aprovada; acima de 14: não voa.",
            tipo: "tabela",
            colunas: ["Gravidade (1–5)", "Probabilidade (1–5)", "Medida de controle"],
            linhas: [
              "Perda de enlace de rádio",
              "Falha de motor ou de hélice",
              "Incêndio ou ruptura de bateria",
              "Colisão com pessoa, veículo ou estrutura",
              "Vento ou mudança de tempo",
              "Comportamento errático em modo autônomo",
              "Interferência ou perda de GPS",
            ],
          },
        ],
      },
      {
        titulo: "Lista pré-voo (Anexo A)",
        campos: [
          {
            id: "pre_voo",
            rotulo: "Tudo OK antes de decolar",
            tipo: "checklist",
            obrigatorio: true,
            itens: [
              "Autorizações do espaço aéreo e do local; registros e homologações em dia",
              "Plano de voo e análise de risco assinados",
              "Vento abaixo de 8 m/s (ou do limite do fabricante), sem chuva, boa visibilidade",
              "Área de segurança demarcada (30 m) e livre de pessoas não envolvidas",
              "Pontos de pouso e de abortamento; extintor e primeiros socorros à mão",
              "Estrutura, braços, trem de pouso e fixações sem danos ou folgas",
              "Hélices íntegras, bem fixadas e no sentido correto",
              "Motores, ESC e fiação sem aquecimento ou desgaste",
              "Bateria sem inchaço, carregada, presa e balanceada",
              "Controlador, sensores e GPS operantes; firmware e parâmetros conferidos",
              "Enlace de rádio testado, com alcance e failsafe configurados",
              "Kill switch testado em solo e funcionando",
              "Funções designadas e formação de segurança de voo em dia",
              "Briefing feito: comandos, emergências e rota de fuga",
              "Todos descansados, sem álcool ou medicamentos que reduzam a atenção",
            ],
          },
        ],
      },
      {
        titulo: "Registro e pós-voo (Anexos B e C)",
        campos: [
          { id: "duracao", rotulo: "Duração e número de voos", tipo: "texto" },
          { id: "ocorrencias", rotulo: "Ocorrências", tipo: "area", ajuda: "Houve incidente ou quase-acidente? Abra também um Relatório de incidente." },
          {
            id: "pos_voo",
            rotulo: "Lista pós-voo",
            tipo: "checklist",
            itens: [
              "Aeronave desarmada e bateria desconectada antes da aproximação",
              "Estrutura, hélices e motores inspecionados",
              "Bateria resfriada, tensão verificada e guardada conforme as normas",
              "Tempo de voo, ciclos de bateria e anomalias registrados",
              "Hélices retiradas para transporte",
              "Área recolhida e sem resíduos",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "inspecao_competicao",
    nome: "Checklist de inspeção antes do evento",
    grupo: "Segurança e voo",
    fonte: "Manual da Trilha Competição (doc. 18), seção 9",
    descricao: "Conferência final da equipe antes de viajar para uma competição.",
    visibilidade: "interno",
    aprovacao: "Líder da Competição",
    secoes: [
      {
        campos: [
          { id: "evento", rotulo: "Competição e data", tipo: "texto", obrigatorio: true },
          {
            id: "itens",
            rotulo: "Itens",
            tipo: "checklist",
            itens: [
              "Regulamento do ano relido; dimensões e massas conferidas",
              "Chave de emergência testada (aeronaves acima de 200 g)",
              "Registros e autorizações em ordem (equipamentos, pilotos, capitão)",
              "TDP e vídeo submetidos e confirmados",
              "Baterias inspecionadas, carregadas e transportadas conforme as regras",
              "Sobressalentes e ferramentas, incluindo hélices e cabos",
              "Código congelado, versionado e copiado em mais de um local",
              "Equipamentos de proteção para todos da equipe",
              "Ensaio completo cronometrado, sem falhas críticas",
              "Termo de viagem e autorizações da UFSCar",
            ],
          },
          { id: "relatorio", rotulo: "Relatório pós-evento (até 30 dias depois): resultados, custos, problemas e recomendações", tipo: "area" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Patrimônio, dinheiro e viagens
  {
    id: "termo_emprestimo",
    nome: "Termo de empréstimo de patrimônio",
    grupo: "Patrimônio, dinheiro e viagens",
    fonte: "Termo de Empréstimo (doc. 04); Regimento art. 41",
    descricao:
      "Para empréstimo formal: vários itens, uso fora do laboratório ou bem de terceiro. Retiradas rápidas de um item continuam no Inventário.",
    visibilidade: "interno",
    aprovacao: "Operações e Patrimônio",
    assinaturas: ["Membro responsável", "Operações e Patrimônio"],
    secoes: [
      {
        titulo: "Saída",
        campos: [
          { id: "responsavel", rotulo: "Responsável", tipo: "pessoa", obrigatorio: true },
          { id: "finalidade", rotulo: "Finalidade (projeto, trilha ou atividade)", tipo: "texto", obrigatorio: true },
          {
            id: "bens",
            rotulo: "Bens. Titularidade: U = UFSCar, G = GEAR, T = terceiro. Estado: N, B, R ou D (com defeito, descrever).",
            tipo: "tabela",
            colunas: ["Código", "Descrição", "Qtd.", "Estado na saída", "Titularidade"],
          },
          { id: "devolucao", rotulo: "Devolução até", tipo: "data", obrigatorio: true },
          { id: "local", rotulo: "Local de uso", tipo: "opcao", opcoes: ["Laboratório", "Residência do responsável", "Outro"] },
          {
            id: "condicoes",
            rotulo: "Condições aceitas",
            tipo: "checklist",
            obrigatorio: true,
            itens: [
              "Recebi os bens em funcionamento, salvo o anotado no estado",
              "Não empresto a terceiros, não desmonto nem levo para fora do Campus sem autorização",
              "Baterias de lítio e aeronaves só com formação de segurança concluída",
              "Dano ou perda por negligência obriga à reposição ou ao reparo",
              "Devolvo no prazo, com acessórios; prorrogação só com pedido prévio",
              "Comunico defeito, acidente ou extravio no mesmo dia",
            ],
          },
        ],
      },
      {
        titulo: "Devolução",
        campos: [
          { id: "data_devolucao", rotulo: "Data da devolução", tipo: "data" },
          { id: "estado_devolucao", rotulo: "Estado na devolução", tipo: "opcao", opcoes: ["Sem alteração", "Com avaria", "Extravio parcial", "Extravio total"] },
          { id: "obs_devolucao", rotulo: "Observações", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "termo_doacao",
    nome: "Termo de doação e recibo de bens",
    grupo: "Patrimônio, dinheiro e viagens",
    fonte: "Termo de Doação (doc. 29); Regimento art. 39, parágrafo único",
    descricao:
      "Doação de bens em favor da UFSCar, destinada ao GEAR. Dinheiro não é recebido pelo Grupo. Restrito: tem CPF ou CNPJ do doador.",
    visibilidade: "restrito",
    aprovacao: "Operações e Patrimônio (Diretoria acima do limite)",
    assinaturas: ["Doador(a) ou representante", "Coordenador da atividade", "Operações e Patrimônio"],
    secoes: [
      {
        titulo: "Partes e bens",
        campos: [
          { id: "doador", rotulo: "Nome ou razão social", tipo: "texto", obrigatorio: true },
          { id: "documento", rotulo: "CPF ou CNPJ", tipo: "texto" },
          { id: "contato", rotulo: "Representante, endereço e contato", tipo: "area" },
          { id: "bens", rotulo: "Bens doados", tipo: "tabela", colunas: ["Descrição (marca, modelo, nº de série)", "Qtd.", "Estado", "Valor estimado"] },
          { id: "divulgacao", rotulo: "O doador autoriza menção de nome e marca em agradecimento?", tipo: "opcao", opcoes: ["Autoriza", "Não autoriza"] },
        ],
      },
      {
        titulo: "Aceite e recibo",
        campos: [
          {
            id: "aceite",
            rotulo: "Checklist de aceite",
            tipo: "checklist",
            itens: [
              "Origem do bem verificada; sem indício de irregularidade",
              "Utilidade confirmada pela Área Técnica",
              "Condições de segurança verificadas (baterias, tensão, peças móveis)",
              "Sem condição ou contrapartida não prevista",
              "Aceite ou procedimento da UFSCar concluído",
              "Etiqueta colocada e inventário atualizado",
              "Agradecimento enviado (se autorizado)",
            ],
          },
          { id: "etiqueta", rotulo: "Etiqueta de patrimônio e local de armazenamento", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "termo_viagem",
    nome: "Termo de viagem e participação em evento",
    grupo: "Patrimônio, dinheiro e viagens",
    fonte: "Termo de Viagem (doc. 26)",
    descricao: "Um por participante. Restrito: tem contato de emergência e informação de saúde. Menor de 18 anos precisa de autorização do responsável.",
    visibilidade: "restrito",
    aprovacao: "Responsável pelo grupo na viagem",
    assinaturas: ["Participante", "Responsável pelo grupo", "Responsável legal (menor de 18)"],
    secoes: [
      {
        campos: [
          { id: "evento", rotulo: "Evento, local e datas", tipo: "texto", obrigatorio: true },
          { id: "responsavel_grupo", rotulo: "Responsável pelo grupo (maior de idade)", tipo: "pessoa", obrigatorio: true },
          { id: "transporte", rotulo: "Transporte e hospedagem", tipo: "area" },
          { id: "emergencia", rotulo: "Contato de emergência (nome, parentesco, telefone)", tipo: "texto", obrigatorio: true },
          { id: "saude", rotulo: "Restrições de saúde ou alergias (opcional)", tipo: "area" },
          { id: "custos", rotulo: "Custos", tipo: "opcao", opcoes: ["Fonte formalizada", "Por conta própria, por decisão voluntária"] },
          { id: "imagem", rotulo: "Uso de imagem no evento", tipo: "opcao", opcoes: ["Autorizo", "Não autorizo"], obrigatorio: true },
          {
            id: "compromissos",
            rotulo: "Compromissos",
            tipo: "checklist",
            obrigatorio: true,
            itens: [
              "Li o Regimento, o Código de Conduta e as normas de segurança",
              "Sigo as orientações do responsável e do regulamento do evento",
              "Uso EPI e não opero aeronaves, baterias ou máquinas sem autorização",
              "Represento o GEAR e a UFSCar com respeito",
              "Respeito a política de álcool e drogas do Código de Conduta",
              "Cuido dos equipamentos sob minha guarda e comunico perdas na hora",
              "Não assumo compromisso financeiro ou contratual em nome do GEAR",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ficha_fornecedor",
    nome: "Ficha de fornecedor e cotações",
    grupo: "Patrimônio, dinheiro e viagens",
    fonte: "Caderno de Modelos (doc. 03), seção 9; Manual Financeiro (doc. 20), seção 3",
    descricao: "Ao menos três cotações quando possível, com a escolha justificada e conflito de interesses declarado.",
    visibilidade: "interno",
    aprovacao: "Operações e Patrimônio (Diretoria acima de R$ 1.000)",
    secoes: [
      {
        campos: [
          { id: "itens", rotulo: "Itens e especificações", tipo: "area", obrigatorio: true },
          { id: "cotacoes", rotulo: "Cotações", tipo: "tabela", colunas: ["Fornecedor e contato", "Valor", "Prazo", "Garantia"] },
          { id: "escolha", rotulo: "Escolha e justificativa", tipo: "area", obrigatorio: true },
          { id: "conflito", rotulo: "Conflito de interesses?", tipo: "opcao", opcoes: ["Não", "Sim (declarado em ata)"], obrigatorio: true },
          { id: "recebimento", rotulo: "Recebimento conferido por (pessoa diferente de quem pediu)", tipo: "pessoa" },
        ],
      },
    ],
  },
  {
    id: "ficha_parceria",
    nome: "Ficha de parceria ou patrocínio",
    grupo: "Patrimônio, dinheiro e viagens",
    fonte: "Política de Parcerias e Patrocínio (doc. 07), Anexos A e B; Regimento arts. 50 a 53",
    descricao: "Do primeiro contato ao encerramento. Nenhum compromisso vale antes da formalização pela UFSCar.",
    visibilidade: "restrito",
    aprovacao: "Diretoria (estratégica: Assembleia)",
    secoes: [
      {
        campos: [
          { id: "parceiro", rotulo: "Empresa ou instituição e contato", tipo: "texto", obrigatorio: true },
          { id: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: ["Patrocínio", "Doação", "Cooperação técnica", "Apoio a competição", "Outro"] },
          { id: "proposta", rotulo: "O que se propõe e contrapartidas", tipo: "area", obrigatorio: true },
          {
            id: "avaliacao",
            rotulo: "Avaliação do potencial parceiro",
            tipo: "checklist",
            itens: [
              "Origem lícita e identificada",
              "Não é partido, candidato ou campanha",
              "Não é tabaco, bebida alcoólica, jogos ou apostas",
              "Sem finalidade bélica ofensiva ou incompatível com o GEAR",
              "Sem exclusividade, sigilo permanente ou restrição de publicação",
              "Conflitos de interesse de membros declarados",
            ],
          },
          { id: "responsavel", rotulo: "Responsável pela parceria", tipo: "pessoa" },
          { id: "instrumento", rotulo: "Instrumento da UFSCar e situação da formalização", tipo: "texto" },
          { id: "contrapartidas", rotulo: "Contrapartidas e entregas", tipo: "tabela", colunas: ["Contrapartida", "Prazo", "Entregue em"] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Pessoas e cargos
  {
    id: "termo_compromisso",
    nome: "Termo de compromisso do membro",
    grupo: "Pessoas e cargos",
    fonte: "Termo de Compromisso (doc. 02); Regimento art. 33",
    descricao: "Condição para participar das atividades. Inclui a declaração de conhecimentos preexistentes e a autorização de imagem.",
    visibilidade: "restrito",
    aprovacao: "Presidente",
    assinaturas: ["Membro", "Presidente do GEAR", ORIENTADOR],
    secoes: [
      {
        titulo: "Identificação",
        campos: [
          { id: "ra", rotulo: "RA", tipo: "texto", obrigatorio: true },
          { id: "semestre", rotulo: "Semestre", tipo: "texto" },
          { id: "telefone", rotulo: "Telefone", tipo: "texto" },
          { id: "categoria", rotulo: "Categoria", tipo: "opcao", opcoes: ["Fundador", "Em formação", "Efetivo"], obrigatorio: true },
        ],
      },
      {
        titulo: "Declarações",
        campos: [
          {
            id: "clausulas",
            rotulo: "Li e concordo com as cláusulas do Termo",
            tipo: "checklist",
            obrigatorio: true,
            itens: [
              "Li o Regimento Interno e o cumprirei, com as normas da UFSCar",
              "Participação voluntária, sem remuneração nem vínculo empregatício",
              "Compareço ou aviso antes; documento o que faço; trato todos com respeito",
              "Uso de equipamento só com termo de empréstimo; respondo por dano por negligência",
              "Segurança acima de prazos; posso interromper atividade insegura sem penalidade",
              "Só voo após a formação de segurança de voo",
              "Comunico acidente, incidente e quase-acidente no mesmo dia",
              "Guardo sigilo do que for reservado, mesmo depois de sair",
              "Respeito a política de PI e licenças de terceiros",
              "Ciência do tratamento de dados pessoais (LGPD)",
              "Comunico interesse em empresa ligada a patrocínio, doação ou parceria",
            ],
          },
          {
            id: "preexistentes",
            rotulo: "Anexo A: conhecimentos e materiais preexistentes que posso incorporar (se não houver, deixe vazio)",
            tipo: "tabela",
            colunas: ["Item", "Descrição", "Licença ou condição de uso"],
          },
          {
            id: "imagem",
            rotulo: "Anexo B: uso de imagem e voz (a recusa não prejudica a participação)",
            tipo: "opcao",
            opcoes: ["Autorizo, para divulgação institucional sem fins comerciais", "Não autorizo, exceto registros internos de frequência e segurança"],
            obrigatorio: true,
          },
        ],
      },
    ],
  },
  {
    id: "termo_sigilo",
    nome: "Termo de sigilo",
    grupo: "Pessoas e cargos",
    fonte: "Termo de Sigilo (doc. 09)",
    descricao: "Para quem acessa informação reservada de parceiro ou do Grupo. Vale por [2] anos após o fim do projeto ou do vínculo.",
    visibilidade: "restrito",
    aprovacao: "Presidente",
    assinaturas: ["Membro", "Presidente do GEAR"],
    secoes: [
      {
        campos: [
          { id: "projeto", rotulo: "Projeto ou parceria a que se refere", tipo: "texto", obrigatorio: true },
          {
            id: "compromissos",
            rotulo: "Compromissos",
            tipo: "checklist",
            obrigatorio: true,
            itens: [
              "Uso a informação reservada só para o projeto",
              "Não divulgo nem compartilho sem autorização",
              "Devolvo ou elimino as informações ao fim do projeto ou do vínculo",
              "Publicação científica passa antes pela Diretoria e pelo orientador",
              "Dados pessoais encontrados seguem a LGPD",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "declaracao_conflito",
    nome: "Declaração de ciência e de conflito de interesses",
    grupo: "Pessoas e cargos",
    fonte: "Código de Conduta (doc. 24), Anexo; Regimento art. 52",
    descricao: "Assinada na entrada e sempre que surgir um conflito. Quem tem conflito se abstém de deliberar e votar.",
    visibilidade: "restrito",
    secoes: [
      {
        campos: [
          { id: "ciencia", rotulo: "Declarações", tipo: "checklist", obrigatorio: true, itens: ["Li o Código de Conduta e Ética do GEAR"] },
          { id: "conflito", rotulo: "Conflito de interesses", tipo: "opcao", opcoes: ["Não tenho conflito de interesses", "Tenho a situação abaixo a declarar"], obrigatorio: true },
          { id: "situacao", rotulo: "Situação declarada e decisões de que me abstenho", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "onboarding",
    nome: "Primeiros 30 dias e conversa com o padrinho",
    grupo: "Pessoas e cargos",
    fonte: "Kit de Boas-Vindas (doc. 32), seções 2 e 4",
    descricao: "Acompanhamento de quem acabou de entrar, preenchido pelo padrinho ou madrinha.",
    visibilidade: "restrito",
    secoes: [
      {
        campos: [
          { id: "membro", rotulo: "Membro novo", tipo: "pessoa", obrigatorio: true },
          { id: "padrinho", rotulo: "Padrinho ou madrinha", tipo: "pessoa", obrigatorio: true },
          {
            id: "etapas",
            rotulo: "Etapas",
            tipo: "checklist",
            itens: [
              "Dia 1–2: Guia de Bolso lido; Termo de Compromisso e Declaração de Conflito assinados",
              "Dia 3–7: formação de segurança; ambiente técnico configurado",
              "Semana 2: primeira tarefa pequena; uma reunião de trilha",
              "Semana 3: conversa com os líderes das trilhas; caminho na Academia definido",
              "Semana 4: apresentação de 3 minutos; pesquisa de clima rápida respondida",
            ],
          },
          { id: "conversa", rotulo: "Conversa de 30 dias: como está, o que está claro, carga, o que melhorar", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "candidatura",
    nome: "Candidatura a cargo",
    grupo: "Pessoas e cargos",
    fonte: "Processo Eleitoral (doc. 28), Modelo 2; Regimento art. 69",
    descricao: "Fundador ou efetivo com 6 meses de atuação, em dia com a frequência e sem sanção vigente. Uma pessoa, um cargo.",
    visibilidade: "interno",
    aprovacao: "Comissão Eleitoral",
    secoes: [
      {
        campos: [
          { id: "cargo", rotulo: "Cargo pretendido", tipo: "texto", obrigatorio: true },
          { id: "tempo", rotulo: "Categoria no Grupo e tempo de atuação", tipo: "texto", obrigatorio: true },
          {
            id: "declaracoes",
            rotulo: "Declarações",
            tipo: "checklist",
            obrigatorio: true,
            itens: [
              "Atendo aos requisitos do Regimento",
              "Li o Código de Conduta e o Manual de Funções do cargo",
              "Não tenho impedimento nem conflito de interesses",
            ],
          },
          { id: "proposta", rotulo: "Proposta (até uma página)", tipo: "area", obrigatorio: true },
        ],
      },
    ],
  },
  {
    id: "passagem_cargo",
    nome: "Relatório de passagem de cargo",
    grupo: "Pessoas e cargos",
    fonte: "Manual de Funções (doc. 13), Anexo; Regimento art. 73",
    descricao: "Começa no mínimo 30 dias antes do fim do mandato.",
    visibilidade: "restrito",
    aprovacao: "Presidente",
    assinaturas: ["Ocupante cessante", "Sucessor"],
    secoes: [
      {
        campos: [
          { id: "cargo", rotulo: "Cargo", tipo: "texto", obrigatorio: true },
          { id: "sucessor", rotulo: "Sucessor", tipo: "pessoa", obrigatorio: true },
          {
            id: "itens",
            rotulo: "Itens",
            tipo: "checklist",
            itens: [
              "Relatório de gestão (pendências, contatos e decisões em curso) entregue",
              "Acesso a contas, repositórios, arquivos e documentos transferido",
              "Acessos do cessante revogados, com dois responsáveis por conta",
              "Inventário dos bens sob responsabilidade conferido",
              "Manual da função atualizado",
              "Calendário de prazos da UFSCar e de parcerias repassado",
              "Reunião de transição feita (30 dias antes do fim do mandato)",
            ],
          },
          { id: "pendencias", rotulo: "Pendências e recomendações", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "desligamento",
    nome: "Desligamento de membro",
    grupo: "Pessoas e cargos",
    fonte: "Gestão do Conhecimento (doc. 22), seção 8; Regimento art. 14",
    descricao: "Quando alguém sai ou se forma: trabalho entregue, bens devolvidos, acessos removidos e contribuição reconhecida.",
    visibilidade: "restrito",
    aprovacao: "Documentação",
    secoes: [
      {
        campos: [
          { id: "membro", rotulo: "Membro", tipo: "pessoa", obrigatorio: true },
          { id: "motivo", rotulo: "Motivo", tipo: "opcao", opcoes: ["Pedido do membro", "Formatura", "Perda de vínculo", "Faltas", "Decisão disciplinar"], obrigatorio: true },
          {
            id: "itens",
            rotulo: "Itens",
            tipo: "checklist",
            itens: [
              "Trabalho em andamento e estado dos projetos entregues (README atualizado)",
              "Bens, chaves e equipamentos devolvidos",
              "Acessos transferidos ou removidos (repositórios, contas, arquivos)",
              "Saída registrada; declaração ou certificado de horas emitido, se devido",
              "Contribuição reconhecida (créditos, agradecimento)",
              "Convite à pesquisa de saída",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "direitos_titular",
    nome: "Pedido sobre meus dados pessoais",
    grupo: "Pessoas e cargos",
    fonte: "Privacidade e Segurança da Informação (doc. 25), Parte 1, arts. 3º e 4º",
    descricao: "Acesso, correção ou eliminação dos seus dados. O Grupo responde em até [15] dias ou encaminha ao encarregado da UFSCar.",
    visibilidade: "restrito",
    aprovacao: "Diretoria",
    secoes: [
      {
        campos: [
          { id: "pedido", rotulo: "Pedido", tipo: "opcao", opcoes: ["Acesso", "Correção", "Eliminação", "Revogar autorização de imagem", "Outro"], obrigatorio: true },
          { id: "detalhes", rotulo: "Detalhes", tipo: "area", obrigatorio: true },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Gestão e rotina
  {
    id: "relato_mensal",
    nome: "Relato mensal da frente ou área",
    grupo: "Gestão e rotina",
    fonte: "Guia das Frentes (doc. 34), seção 7; Manual de Funções (doc. 13), Parte 2",
    descricao: "Uma página à Diretoria até o dia [5] de cada mês.",
    visibilidade: "interno",
    aprovacao: "Diretoria (ciência)",
    secoes: [
      {
        campos: [
          { id: "frente", rotulo: "Frente ou área", tipo: "texto", obrigatorio: true },
          { id: "mes", rotulo: "Mês", tipo: "texto", obrigatorio: true },
          { id: "entregues", rotulo: "O que entregamos", tipo: "area", obrigatorio: true },
          { id: "proximo", rotulo: "O que vamos entregar no próximo mês", tipo: "area" },
          { id: "semaforo", rotulo: "Metas do trimestre (semáforo)", tipo: "opcao", opcoes: ["Verde: no ritmo", "Amarelo: atraso recuperável", "Vermelho: precisa de decisão da Diretoria"] },
          { id: "riscos", rotulo: "Riscos e bloqueios (com dono)", tipo: "area" },
          { id: "pedidos", rotulo: "Pedidos à Diretoria ou a outras áreas", tipo: "area" },
          { id: "frequencia", rotulo: "Frequência e horas registradas", tipo: "texto" },
          { id: "patrimonio", rotulo: "Patrimônio em uso e pendências", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "okrs",
    nome: "OKRs do trimestre",
    grupo: "Gestão e rotina",
    fonte: "Metodologia de Gestão (doc. 23), seção 6; Guia das Frentes (doc. 34), seção 6",
    descricao: "No máximo dois objetivos e três resultados-chave por objetivo. Nota de 0 a 1 ao fim do trimestre; 0,6–0,7 é saudável.",
    visibilidade: "interno",
    secoes: [
      {
        campos: [
          { id: "frente", rotulo: "Frente, área ou Grupo", tipo: "texto", obrigatorio: true },
          { id: "trimestre", rotulo: "Trimestre", tipo: "texto", obrigatorio: true },
          { id: "objetivos", rotulo: "Objetivos (qualitativos, uma frase cada)", tipo: "area", obrigatorio: true },
          { id: "krs", rotulo: "Resultados-chave", tipo: "tabela", colunas: ["Resultado-chave (número, data ou entrega)", "Indicador", "Nota (0 a 1)"] },
          { id: "licoes", rotulo: "Lições do trimestre", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "retrospectiva",
    nome: "Retrospectiva",
    grupo: "Gestão e rotina",
    fonte: "Metodologia de Gestão (doc. 23), seção 13",
    descricao: "Sem culpados: fala-se do processo, não das pessoas.",
    visibilidade: "interno",
    secoes: [
      {
        campos: [
          { id: "ciclo", rotulo: "Ciclo ou sprint", tipo: "texto", obrigatorio: true },
          { id: "funcionou", rotulo: "O que funcionou", tipo: "area" },
          { id: "nao", rotulo: "O que não funcionou", tipo: "area" },
          { id: "tentar", rotulo: "O que vamos tentar", tipo: "area" },
          { id: "acoes", rotulo: "Ações", tipo: "tabela", colunas: ["Ação", "Responsável", "Prazo"] },
        ],
      },
    ],
  },
  {
    id: "checklist_semestral",
    nome: "Checklist semestral",
    grupo: "Gestão e rotina",
    fonte: "Gestão do Conhecimento (doc. 22), seção 10; Regimento art. 40",
    descricao: "Conferência que a Documentação e Operações fazem a cada semestre.",
    visibilidade: "interno",
    aprovacao: "Diretoria",
    secoes: [
      {
        campos: [
          { id: "semestre", rotulo: "Semestre", tipo: "texto", obrigatorio: true },
          {
            id: "itens",
            rotulo: "Itens",
            tipo: "checklist",
            itens: [
              "Atas arquivadas e índice atualizado",
              "Repositórios com README e licença",
              "Projetos encerrados com post-mortem arquivado",
              "Acessos revisados; contas com dois responsáveis",
              "Backup testado",
              "Manuais de função revisados",
              "Calendário de prazos da UFSCar atualizado",
              "Inventário conferido; divergências comunicadas à Diretoria e ao orientador",
            ],
          },
          { id: "divergencias", rotulo: "Divergências encontradas", tipo: "area" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Comunicação e ofícios
  {
    id: "oficio",
    nome: "Ofício",
    grupo: "Comunicação e ofícios",
    fonte: "Caderno de Modelos (doc. 03), Partes 3 e 4",
    descricao: "Um assunto por ofício, pedido no primeiro parágrafo. A numeração é automática (Ofício GEAR nº 001/ano). Guarde a resposta junto.",
    visibilidade: "interno",
    aprovacao: "Presidente",
    assinaturas: ["Presidente do GEAR", "Professor orientador"],
    secoes: [
      {
        campos: [
          {
            id: "tipo",
            rotulo: "Modelo",
            tipo: "opcao",
            opcoes: ["Encaminhamento à ProEx", "A — Uso de espaço", "B — Teste de aeronaves", "C — Convite a parceiro", "D — Agradecimento e resultados", "Outro"],
            obrigatorio: true,
          },
          { id: "destinatario", rotulo: "Destinatário (nome, cargo, setor)", tipo: "texto", obrigatorio: true },
          { id: "assunto", rotulo: "Assunto", tipo: "texto", obrigatorio: true },
          { id: "corpo", rotulo: "Texto", tipo: "area", obrigatorio: true, ajuda: "Cite o processo nº 23112.029016/2026-80 e o professor orientador." },
          { id: "anexos", rotulo: "Anexos", tipo: "texto" },
          { id: "resposta", rotulo: "Resposta recebida e data", tipo: "area" },
        ],
      },
    ],
  },
  {
    id: "circular",
    nome: "Circular interna de decisão",
    grupo: "Comunicação e ofícios",
    fonte: "Caderno de Modelos (doc. 03), Modelo E; Guia de Governança (doc. 31), seção 7",
    descricao: "Decisões relevantes são comunicadas aos membros em até sete dias.",
    visibilidade: "interno",
    aprovacao: "Presidente",
    secoes: [
      {
        campos: [
          { id: "reuniao", rotulo: "Decidido em reunião de", tipo: "data", obrigatorio: true },
          { id: "decisao", rotulo: "O que foi decidido", tipo: "area", obrigatorio: true },
          { id: "vigencia", rotulo: "Vigência a partir de", tipo: "data" },
          { id: "duvidas", rotulo: "Dúvidas com", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "pedido_marketing",
    nome: "Pedido a Marketing",
    grupo: "Comunicação e ofícios",
    fonte: "Manual de Funções (doc. 13), Parte 2, seção 4; Comunicação e Marketing (doc. 21), seção 5",
    descricao: "Com antecedência mínima de [7] dias. Resultado científico, marca de terceiro ou pessoa identificável só sai com aprovação.",
    visibilidade: "interno",
    aprovacao: "Marketing",
    secoes: [
      {
        campos: [
          { id: "peca", rotulo: "Peça e canal", tipo: "texto", obrigatorio: true },
          { id: "data", rotulo: "Data desejada de publicação", tipo: "data", obrigatorio: true },
          { id: "conteudo", rotulo: "Conteúdo e mensagem", tipo: "area", obrigatorio: true },
          {
            id: "contem",
            rotulo: "A peça contém",
            tipo: "multipla",
            opcoes: ["Pessoas identificáveis (autorização de imagem)", "Marca de parceiro ou símbolo da UFSCar", "Resultado científico ou informação de parceiro", "Voo de drone"],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Canal de denúncia
  {
    id: "denuncia",
    nome: "Canal de denúncia",
    grupo: "Pessoas e cargos",
    fonte: "Código de Conduta (doc. 24), seção 8",
    descricao:
      "Identificada ou anônima. Só a Presidência e a Vice leem. Se a denúncia envolver uma delas, procure o professor orientador. Em risco imediato, procure primeiro socorro: 192, 193.",
    visibilidade: "denuncia",
    secoes: [
      {
        campos: [
          { id: "natureza", rotulo: "Natureza", tipo: "opcao", opcoes: ["Conduta", "Assédio ou discriminação", "Segurança", "Patrimônio ou dinheiro", "Dados e privacidade", "Outro"], obrigatorio: true },
          { id: "fatos", rotulo: "O que aconteceu, quando e onde", tipo: "area", obrigatorio: true },
          { id: "envolvidos", rotulo: "Pessoas envolvidas ou testemunhas (opcional)", tipo: "area" },
          { id: "provas", rotulo: "Provas ou onde encontrá-las (opcional)", tipo: "area" },
        ],
      },
    ],
  },
]

export const modeloPorId = (id: string) => MODELOS.find((m) => m.id === id)

/** "OFICIO nº 007/2026": a forma de citar um registro em ata ou em outro documento. */
export function numeroRegistro(modelo: Modelo | undefined, ano: number, numero: number | null) {
  return `${modelo?.nome ?? "Registro"} nº ${String(numero ?? 0).padStart(3, "0")}/${ano}`
}

/** Campos obrigatórios sem resposta, pelo rótulo. Vazio = pode enviar. */
export function faltando(modelo: Modelo, dados: Record<string, unknown>): string[] {
  return modelo.secoes
    .flatMap((s) => s.campos)
    .filter((c) => c.obrigatorio)
    .filter((c) => {
      const v = dados[c.id]
      if (c.tipo === "checklist") return !Array.isArray(v) || v.length < c.itens.length
      if (c.tipo === "multipla" || c.tipo === "tabela") return !Array.isArray(v) || v.length === 0
      return typeof v !== "string" || !v.trim()
    })
    .map((c) => c.rotulo)
}

/** Risco da análise de voo: gravidade × probabilidade (doc. 06, Anexo D). */
export function nivelDeRisco(gravidade: string, probabilidade: string) {
  const g = Number(gravidade)
  const p = Number(probabilidade)
  if (!g || !p) return null
  const r = g * p
  return { valor: r, faixa: r <= 6 ? "aceitável com controles" : r <= 14 ? "exige medida adicional" : "não voa" }
}
