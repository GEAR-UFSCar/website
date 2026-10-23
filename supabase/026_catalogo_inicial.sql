-- =============================================================================
-- GEAR — catálogo inicial de documentos (GERADO — não edite à mão)
-- Rodar no SQL Editor, DEPOIS de 025_catalogo_de_documentos.sql.
--
-- Gerado por scripts/gerar-sql-catalogo.mjs a partir de supabase/seed/documentos.json
-- (catálogo versão 2026.10.2, atualizado em 2026-10-23).
-- 50 documentos. Todos entram como RASCUNHO: nenhum vira público até a
-- diretoria marcar como vigente (o gatilho da 025 só deixa a diretoria fazer isso).
--
-- Idempotente. Em reaplicação NÃO toca em arquivo_url, versao, publico nem status.
-- =============================================================================

insert into public.documentos
  (codigo, titulo, categoria, pacote, pacote_nome, resumo, quando, quem, paginas, tags, publico, anexos)
values
  ('RI', 'Regimento Interno', 'Governança', 0, 'Base', 'A norma máxima do Grupo: áreas, Diretoria, mandatos, quóruns, medidas disciplinares, patrimônio, propriedade intelectual e extinção.', 'Sempre que houver dúvida sobre quem decide, como se decide ou o que vale em caso de conflito entre documentos.', 'Todos', 19, array['governanca']::text[], true, '[]'::jsonb),
  ('01', 'Edital de Convocação', 'Governança', 1, 'Constituição', 'Convoca a Assembleia de fundação, com data, pauta e antecedência de 7 dias.', 'Antes da Assembleia de fundação.', 'Presidente', 3, array['governanca']::text[], false, '[]'::jsonb),
  ('02', 'Ata de Fundação', 'Governança', 1, 'Constituição', 'Registra a criação do Grupo, a aprovação do Regimento e a eleição da primeira Diretoria.', 'Na Assembleia de fundação; é assinada pelos fundadores.', 'Presidente, Documentação', 5, array['governanca']::text[], false, '[]'::jsonb),
  ('03', 'Termo de Compromisso', 'Governança', 1, 'Constituição', 'O vínculo individual de cada membro: direitos, deveres, conduta, imagem e dados.', 'Quando uma pessoa entra no Grupo.', 'Administração', 5, array['pessoas']::text[], false, '[]'::jsonb),
  ('04', 'Modelo de Ata', 'Governança', 1, 'Constituição', 'Molde para registrar qualquer reunião: quórum, pauta, deliberações e ações.', 'Em toda reunião de Assembleia, Diretoria ou trilha.', 'Documentação', 3, array['governanca']::text[], false, '[{"nome":"Modelo de Ata de Reuniao","caminho":"formularios/Modelo-de-Ata-de-Reuniao.docx"}]'::jsonb),
  ('05', 'Ofício à ProEx', 'Governança', 1, 'Constituição', 'Comunica o Grupo e o Regimento à UFSCar.', 'Depois que o Regimento for aprovado.', 'Presidente, professor orientador', 2, array['governanca']::text[], false, '[]'::jsonb),
  ('06', 'Termo de Empréstimo', 'Segurança', 2, 'Operação e segurança', 'Controla quem retirou qual equipamento, em que estado e até quando.', 'Toda vez que alguém levar um item do Grupo.', 'Operações e Patrimônio', 3, array['patrimonio']::text[], false, '[{"nome":"Termo de Emprestimo","caminho":"formularios/Termo-de-Emprestimo.docx"}]'::jsonb),
  ('07', 'Normas de Segurança de Oficina', 'Segurança', 2, 'Operação e segurança', 'Regras de bancada, ferramentas e baterias de lítio.', 'Antes de qualquer trabalho na oficina; leitura obrigatória para novos membros.', 'Todos', 4, array['seguranca']::text[], false, '[]'::jsonb),
  ('08', 'Protocolo de Voo', 'Segurança', 2, 'Operação e segurança', 'Condições, checagens, papéis, área de segurança e chave de emergência para aeronaves não tripuladas.', 'Antes de qualquer voo de drone.', 'Competição, coordenador de segurança de voo', 9, array['seguranca', 'competicao']::text[], false, '[]'::jsonb),
  ('09', 'Relatório de Incidente', 'Segurança', 2, 'Operação e segurança', 'Registro de acidente, incidente ou quase-acidente, para corrigir a causa e não para punir.', 'No mesmo dia de qualquer acidente ou quase-acidente.', 'Todos', 3, array['seguranca']::text[], false, '[{"nome":"Relatorio de Incidente","caminho":"formularios/Relatorio-de-Incidente.docx"}]'::jsonb),
  ('10', 'Política de Parcerias e Patrocínio', 'Financeiro', 3, 'Parcerias e propriedade intelectual', 'Quais apoios o Grupo aceita, quais recusa e quem decide.', 'Ao receber uma proposta de apoio de empresa ou pessoa.', 'Diretoria, Marketing', 6, array['parcerias']::text[], true, '[]'::jsonb),
  ('11', 'Plano de Patrocínio', 'Financeiro', 3, 'Parcerias e propriedade intelectual', 'Cotas de apoio e contrapartidas que o Grupo oferece.', 'Ao conversar com possíveis apoiadores.', 'Marketing', 3, array['parcerias']::text[], true, '[]'::jsonb),
  ('12', 'Carta de Intenções', 'Financeiro', 3, 'Parcerias e propriedade intelectual', 'Primeiro documento com um parceiro. Não vincula ninguém.', 'Depois da primeira conversa, antes de qualquer acordo formal.', 'Presidente, professor orientador', 3, array['parcerias']::text[], false, '[]'::jsonb),
  ('13', 'Pontos do Acordo de Cooperação', 'Financeiro', 3, 'Parcerias e propriedade intelectual', 'Lista do que o acordo formal precisa conter. Quem assina é a UFSCar.', 'Ao preparar o pedido de acordo à UFSCar.', 'Presidente, professor orientador', 3, array['parcerias']::text[], false, '[]'::jsonb),
  ('14', 'Política de Propriedade Intelectual', 'Governança', 3, 'Parcerias e propriedade intelectual', 'De quem é o código, o artigo e o robô, e sob quais licenças.', 'Ao iniciar projeto com parceiro, edital ou código de terceiros.', 'Todos', 5, array['parcerias', 'pesquisa']::text[], true, '[]'::jsonb),
  ('15', 'Termo de Sigilo', 'Financeiro', 3, 'Parcerias e propriedade intelectual', 'Confidencialidade para quem acessa informação de parceiro.', 'Antes de receber informação confidencial.', 'Diretoria', 3, array['parcerias']::text[], false, '[]'::jsonb),
  ('16', 'Manual do Membro', 'Governança', 4, 'Dia a dia', 'Guia de quem entra: direitos, deveres e como o Grupo funciona.', 'Na entrada e sempre que houver dúvida sobre direitos e deveres.', 'Todos', 6, array['pessoas']::text[], true, '[]'::jsonb),
  ('17', 'Edital do Processo Seletivo', 'Governança', 4, 'Dia a dia', 'Seleção pública com vagas, etapas, critérios e recursos.', 'A cada abertura de processo seletivo.', 'Administração', 4, array['pessoas']::text[], true, '[]'::jsonb),
  ('18', 'Manual de Marca', 'Marca', 4, 'Dia a dia', 'Identidade visual e verbal: cores, tipografia, logo e tom.', 'Ao criar qualquer peça de comunicação.', 'Marketing', 5, array['comunicacao']::text[], true, '[]'::jsonb),
  ('19', 'Manual de Funções', 'Governança', 4, 'Dia a dia', 'Atribuições de cada cargo, com o relatório de passagem de cargo no anexo.', 'Ao assumir ou deixar um cargo.', 'Diretoria, áreas', 5, array['governanca']::text[], false, '[]'::jsonb),
  ('20', 'Plano Anual e Relatório ProEx', 'Governança', 4, 'Dia a dia', 'Planejamento do ano e prestação de contas à UFSCar.', 'No início e no fim de cada período de atividade.', 'Documentação, professor orientador', 6, array['governanca']::text[], false, '[]'::jsonb),
  ('21', 'Manual de Onboarding Técnico', 'Técnico', 5, 'Manuais técnicos e administrativos', 'Ambiente de trabalho, Git, ROS 2 e padrões de código.', 'Na primeira semana de quem vai programar ou montar robôs.', 'Todos', 7, array['academia']::text[], false, '[]'::jsonb),
  ('22', 'Grade da Academia GEAR', 'Técnico', 5, 'Manuais técnicos e administrativos', 'Níveis, módulos, projetos finais e critérios de avaliação.', 'Ao planejar ou cursar a Academia.', 'Área Técnica, membros', 6, array['academia']::text[], false, '[]'::jsonb),
  ('23', 'Manual da Trilha Pesquisa', 'Técnico', 5, 'Manuais técnicos e administrativos', 'Do problema à publicação: método, reprodutibilidade, ética e uso de IA.', 'Ao abrir, conduzir ou submeter um projeto de pesquisa.', 'Pesquisa', 5, array['pesquisa']::text[], false, '[{"nome":"Plano de Projeto de Pesquisa","caminho":"formularios/Plano-de-Projeto-de-Pesquisa.docx"},{"nome":"Checklist de Submissao","caminho":"formularios/Checklist-de-Submissao.docx"}]'::jsonb),
  ('24', 'Manual da Trilha Competição', 'Técnico', 5, 'Manuais técnicos e administrativos', 'Competições-alvo, equipe, calendário reverso e checklist de inspeção.', 'Ao preparar uma campanha de competição.', 'Competição', 5, array['competicao']::text[], false, '[]'::jsonb),
  ('25', 'Manual da Trilha Projetos', 'Técnico', 5, 'Manuais técnicos e administrativos', 'Pitch, esquadrões, sprints e como aceitar demandas externas.', 'Ao propor um projeto ou receber um pedido externo.', 'Projetos', 5, array['projetos']::text[], false, '[{"nome":"Ficha de Demanda Externa","caminho":"formularios/Ficha-de-Demanda-Externa.docx"}]'::jsonb),
  ('26', 'Manual Financeiro e de Operações', 'Financeiro', 5, 'Manuais técnicos e administrativos', 'Compras, patrimônio e contas, sempre pela UFSCar.', 'Ao comprar, receber doação ou prestar contas.', 'Operações e Patrimônio, Diretoria', 5, array['patrimonio']::text[], false, '[]'::jsonb),
  ('27', 'Manual de Comunicação e Marketing', 'Marca', 5, 'Manuais técnicos e administrativos', 'Canais, aprovação de peças e gestão de crise.', 'Antes de publicar qualquer coisa em nome do Grupo.', 'Marketing', 5, array['comunicacao']::text[], false, '[]'::jsonb),
  ('28', 'Manual de Gestão do Conhecimento', 'Técnico', 5, 'Manuais técnicos e administrativos', 'Memória do Grupo, sucessão e desligamento de membros.', 'Ao documentar um projeto ou quando alguém sair.', 'Documentação', 5, array['governanca']::text[], false, '[]'::jsonb),
  ('29', 'Manual de Metodologia de Gestão', 'Governança', 6, 'Gestão, conduta e organização', 'Kanban, Scrum leve, OKRs, rituais e calendário de reuniões.', 'Ao organizar o trabalho de uma frente ou área.', 'Todos', 7, array['governanca']::text[], false, '[]'::jsonb),
  ('30', 'Código de Conduta e Ética', 'Governança', 6, 'Gestão, conduta e organização', 'Princípios, vedações e canal de denúncia.', 'Sempre; e ao fazer ou receber uma denúncia.', 'Todos', 6, array['pessoas']::text[], true, '[]'::jsonb),
  ('31', 'Procedimento Disciplinar', 'Governança', 6, 'Gestão, conduta e organização', 'Passo a passo para apurar uma falta, com defesa e recurso.', 'Quando houver denúncia ou falta a apurar.', 'Diretoria', 5, array['pessoas']::text[], false, '[]'::jsonb),
  ('32', 'Política de Privacidade e LGPD', 'Governança', 6, 'Gestão, conduta e organização', 'Que dados o Grupo trata, por quê, por quanto tempo, e o aviso de privacidade.', 'Ao coletar qualquer dado pessoal ou atender demandas assistivas.', 'Todos', 5, array['dados']::text[], true, '[]'::jsonb),
  ('33', 'Política de Contas e Segurança da Informação', 'Segurança', 6, 'Gestão, conduta e organização', 'Acessos, senhas, backups e resposta a incidentes digitais.', 'Ao criar conta, dar acesso ou perder um acesso.', 'Todos, Área Técnica', 4, array['dados']::text[], false, '[]'::jsonb),
  ('34', 'Termo de Viagem', 'Governança', 6, 'Gestão, conduta e organização', 'Autorização e checklist para eventos, com trecho para menores de 18 anos.', 'Antes de qualquer viagem a evento ou competição.', 'Operações e Patrimônio', 4, array['patrimonio', 'competicao']::text[], false, '[{"nome":"Termo de Viagem","caminho":"formularios/Termo-de-Viagem.docx"}]'::jsonb),
  ('35', 'Ofícios e Comunicações-Modelo', 'Governança', 6, 'Gestão, conduta e organização', 'Cartas prontas para pedir espaço, autorizar voo, escrever a parceiros e enviar circulares.', 'Ao precisar de um ofício ou circular.', 'Documentação, Presidente', 5, array['governanca']::text[], false, '[]'::jsonb),
  ('36', 'Frequência, Horas e Certificados', 'Governança', 6, 'Gestão, conduta e organização', 'Como registrar presença e emitir comprovantes.', 'No fechamento mensal e ao pedir certificado.', 'Administração, Documentação', 4, array['pessoas']::text[], false, '[]'::jsonb),
  ('37', 'Caderno de Modelos de Trabalho', 'Governança', 6, 'Gestão, conduta e organização', 'Fichas de projeto, pitch, ata enxuta, decisão (ADR), teste, design review, post-mortem, experimento e fornecedor.', 'Ao abrir, revisar ou encerrar um projeto.', 'Frentes', 6, array['projetos', 'pesquisa', 'competicao']::text[], false, '[{"nome":"Modelo Ficha de Projeto","caminho":"formularios/Modelo-Ficha-de-Projeto.docx"},{"nome":"Modelo Roteiro de Pitch 5 Minutos","caminho":"formularios/Modelo-Roteiro-de-Pitch-5-Minutos.docx"},{"nome":"Modelo Pauta e Ata de Reuniao Modelo Enxuto","caminho":"formularios/Modelo-Pauta-e-Ata-de-Reuniao-Modelo-Enxuto.docx"},{"nome":"Modelo Registro de Decisao ADR","caminho":"formularios/Modelo-Registro-de-Decisao-ADR.docx"},{"nome":"Modelo Relatorio de Teste","caminho":"formularios/Modelo-Relatorio-de-Teste.docx"},{"nome":"Modelo Relatorio de Design Review","caminho":"formularios/Modelo-Relatorio-de-Design-Review.docx"},{"nome":"Modelo Post Mortem de Projeto","caminho":"formularios/Modelo-Post-Mortem-de-Projeto.docx"},{"nome":"Modelo Plano de Experimento Pesquisa","caminho":"formularios/Modelo-Plano-de-Experimento-Pesquisa.docx"},{"nome":"Modelo Ficha de Provedor ou Fornecedor","caminho":"formularios/Modelo-Ficha-de-Provedor-ou-Fornecedor.docx"}]'::jsonb),
  ('38', 'Processo Eleitoral', 'Governança', 6, 'Gestão, conduta e organização', 'Edital, comissão, votação e apuração, detalhando o que o Regimento prevê.', 'Cerca de 30 dias antes do fim do mandato.', 'Diretoria, comissão eleitoral', 6, array['governanca']::text[], false, '[]'::jsonb),
  ('39', 'Termo de Doação e Recibo', 'Financeiro', 6, 'Gestão, conduta e organização', 'Aceite de bens doados por pessoas ou empresas.', 'Ao receber uma doação.', 'Operações e Patrimônio', 3, array['patrimonio', 'parcerias']::text[], false, '[{"nome":"Termo de Doacao e Recibo","caminho":"formularios/Termo-de-Doacao-e-Recibo.docx"}]'::jsonb),
  ('40', 'Plano Estratégico e OKRs', 'Governança', 6, 'Gestão, conduta e organização', 'Missão, visão, diagnóstico (SWOT) e metas do primeiro semestre.', 'Na revisão semestral de metas.', 'Diretoria', 6, array['governanca']::text[], false, '[]'::jsonb),
  ('41', 'Guia de Governança', 'Governança', 6, 'Gestão, conduta e organização', 'Organograma, quem decide o quê, alçadas e sistema de documentos.', 'Quando não souber quem decide ou aprova algo.', 'Todos', 7, array['governanca']::text[], false, '[]'::jsonb),
  ('42', 'Plano de 90 Dias', 'Governança', 7, 'Ativação e crescimento', 'Semanas 1 a 12 para tirar o Grupo do papel, com marcos, riscos e critérios de sucesso.', 'Nos primeiros três meses depois da aprovação.', 'Diretoria', 5, array['governanca']::text[], false, '[]'::jsonb),
  ('43', 'Guia de Bolso', 'Governança', 7, 'Ativação e crescimento', 'Regras essenciais e a tabela "qual documento usar quando".', 'Para qualquer membro, a qualquer hora, antes de abrir os outros documentos.', 'Todos', 4, array['pessoas']::text[], false, '[]'::jsonb),
  ('44', 'One-Pager Institucional', 'Marca', 7, 'Ativação e crescimento', 'Apresentação de duas páginas do Grupo para parceiros.', 'Em conversas com empresas e docentes.', 'Presidente, Marketing', 2, array['parcerias', 'comunicacao']::text[], true, '[]'::jsonb),
  ('45', 'Kit de Boas-Vindas', 'Governança', 7, 'Ativação e crescimento', 'Carta, primeiros 30 dias, guia do padrinho, glossário e FAQ.', 'Quando um membro novo chega.', 'Administração, padrinhos', 4, array['pessoas']::text[], false, '[]'::jsonb),
  ('46', 'Pesquisa de Clima', 'Governança', 7, 'Ativação e crescimento', 'Questionários anônimos e como transformar respostas em plano de ação.', 'A cada semestre e na saída de membros.', 'Administração', 4, array['pessoas']::text[], false, '[]'::jsonb),
  ('47', 'Guia das Frentes', 'Governança', 7, 'Ativação e crescimento', 'Rotina, portões de qualidade, práticas e metas de Pesquisa, Competição e Projetos.', 'Ao planejar o trimestre de uma frente.', 'Líderes de frente', 15, array['pesquisa', 'competicao', 'projetos']::text[], false, '[{"nome":"Relato Mensal da Frente ou Area","caminho":"formularios/Relato-Mensal-da-Frente-ou-Area.docx"}]'::jsonb),
  ('48', 'Tabela de Parâmetros', 'Governança', 7, 'Ativação e crescimento', 'Prazos, quóruns, limites e valores num só lugar.', 'Antes de citar um número em qualquer documento.', 'Documentação, Diretoria', 7, array['governanca']::text[], false, '[]'::jsonb),
  ('49', 'Guia das Áreas Administrativas', 'Governança', 7, 'Ativação e crescimento', 'Rotina, entregas e metas de Administração, Marketing, Documentação e Operações e Patrimônio.', 'Ao planejar o trimestre de uma área.', 'Responsáveis de área', 9, array['governanca']::text[], false, '[{"nome":"Relato Mensal da Frente ou Area","caminho":"formularios/Relato-Mensal-da-Frente-ou-Area.docx"}]'::jsonb)
on conflict (titulo) do update set
  codigo      = excluded.codigo,
  categoria   = excluded.categoria,
  pacote      = excluded.pacote,
  pacote_nome = excluded.pacote_nome,
  resumo      = excluded.resumo,
  quando      = excluded.quando,
  quem        = excluded.quem,
  paginas     = excluded.paginas,
  tags        = excluded.tags,
  anexos      = excluded.anexos;

-- Os cinco títulos provisórios da 006 foram substituídos pelos documentos acima
-- (Manual da Trilha …, Manual Financeiro e de Operações, Normas de Segurança de
-- Oficina). Arquivados, e só se ainda não têm arquivo: nada anexado se perde.
update public.documentos
   set status = 'arquivado'
 where titulo in ('Manual Técnico de Competição', 'Manual Técnico de Pesquisa',
                  'Manual Técnico de Projetos', 'Manual Financeiro',
                  'Normas de Segurança do Laboratório')
   and arquivo_url is null
   and codigo is null;

-- Conferência (esperado: 50 com código):
--   select count(*) from public.documentos where codigo is not null;
