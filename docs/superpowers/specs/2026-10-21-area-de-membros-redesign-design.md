# Área de membros: redesign e reorganização

Data: 2026-10-21. Escopo: `/membros/*`. Fora do escopo: site público, esquema do banco, RLS, portões de acesso.

## Objetivo

Fazer da área de membros um ambiente de trabalho: a primeira tela responde "o que eu faço hoje?", tudo fica a no máximo 2 cliques (ou `Ctrl+K`), e a navegação deixa de ser uma fileira de 10 abas.

Pedido original: "vou querer mudar tudo da área de membros", "o melhor ambiente de trabalho e organização possível". Problemas citados: navegação e estrutura, visual, funcionalidades. Centro escolhido: rotina de trabalho. Navegação escolhida: barra superior enxuta (opção B).

## Restrições

- Nenhuma URL existente muda (evita redirect e link quebrado). Só `/membros/frente` é nova.
- Nenhuma migração nova na fase 1. Usa `sprints`, `sprint_atualizacoes`, `metas`, `eventos`, `avisos`, `modulos`/`progresso`, `perfis`, `atas`, `patrimonio`, `documentos`, `metricas_periodo`.
- Os portões de `app/membros/layout.tsx` e `app/membros/page.tsx` (perfil completo, aprovação, `erro` de tabela ausente) mantêm a mesma lógica. Quem não passa continua na moldura pública.
- Permissões inalteradas: Métricas segue visível a todo membro aprovado; Administração segue exigindo cargo (`temCargo`).
- Paleta e fontes da GEAR (navy, ink, âmbar; Chakra Petch e Space Mono). Âmbar só para ação e estado. Raio de borda único (reto, como no resto do site).
- Texto em português, tom direto, sem travessões, sem numeração de seção, sem "SEÇÃO · SUBTÍTULO".

## Princípios visuais

- Ferramenta de trabalho, não vitrine: sem `CustomCursor`, sem `SmoothScroll`, sem animação de entrada (`Surge`), sem `Footer` público na moldura completa.
- Títulos em peso normal, sem itálico. Fonte mono só para dado (datas, contagens, códigos).
- Densidade média: listas e quadros em vez de cartões grandes. Estados vazios que dizem como preencher.
- `prefers-reduced-motion` respeitado em qualquer transição que sobrar.

## 1. Estrutura de navegação

Barra única fixa (altura 56px) com logo, 5 grupos, busca `Ctrl+K` e menu do usuário. Segunda linha de abas só quando o grupo tem mais de uma.

| Grupo | Abas internas | Rotas (inalteradas) |
|---|---|---|
| Hoje | nenhuma | `/membros` |
| Minha frente | Sprints, Metas | `/membros/frente` (nova, redireciona), `/membros/sprints/{competicao,pesquisa,projetos}`, `/membros/metas` |
| Aprender | nenhuma | `/membros/aprendizagem` |
| Equipe | Mural, Calendário, Pessoas, Documentos, Métricas | `/membros/mural`, `/calendario`, `/diretorio`, `/documentacao`, `/metricas` |
| Gestão (só com cargo) | Visão geral, Atas, Cargos, Patrimônio | `/membros/administracao/*` |

Regras:

- `lib/navegacao.ts` continua sendo dado puro: `GRUPOS` com `abas`, `grupoAtual(pathname)`, `abaAtual(pathname)`, `titulo(pathname)`. Substitui `ABAS` e `migalha`. O h1 de cada página passa a ser do `PageHeader`; a barra não mostra mais "SEÇÃO · TÍTULO".
- Em "Minha frente", a aba Sprints aponta para a frente do próprio membro. O grupo também fica ativo nas outras duas frentes (regra de prefixo `/membros/sprints`).
- Menu do usuário: Editar perfil, Site principal, Sair (Server Action `sair()` já existente no layout).
- Mobile: grupos em linha rolável horizontalmente; abas internas como chips abaixo. Sem barra inferior.

### Rota `/membros/frente`

Server Component. Lê `perfis.frente` via `getPerfil()` (memoizado por request). Frente definida: `redirect(rotaDaFrente(frente))` (helper que já existe em `app/membros/page.tsx`; mover para `lib/navegacao.ts`). Sem frente: mostra as três frentes como lista de links.

## 2. Hoje (`/membros`)

Reescrita de `app/membros/page.tsx` (536 linhas hoje). Mantém os dois portões de redirect (`completar-perfil`, `aguardando`) e o tratamento de `erro` do banco (componente `ErroDados` existente).

Blocos, nesta ordem:

1. **Agora**: sprints em que o usuário é `responsavel` e `status` ≠ Concluído. Cada linha: título, frente, pílula de status (reuso de `sprint-status`), barra de progresso (`sprint-progresso`), próximo passo, link "atualizar" para o sprint. Bloqueado vem primeiro. Vazio: "Você não é responsável por nenhum sprint" + link para a frente.
2. **Prazos**: linha do tempo única, ordenada por data, dos próximos 7 dias e atrasados: `eventos` (da frente do usuário ou sem frente) e `metas` não concluídas do usuário (`COLUNAS_META` de `lib/metas.ts`). Atrasadas no topo com marca de estado.
3. **Avisos**: fixados primeiro, depois os 3 mais recentes, título e primeira linha, link para o Mural.
4. **Academia**: módulo atual, prazo e progresso, reaproveitando as regras de `lib/academia.ts`/`lib/formacao.ts` e o cálculo que já existe em `aprendizagem/page.tsx`. Se concluída, o bloco some.
5. **Pendências** (só `comCargo`): contagem de `perfis` com `aprovado = false` e perfil completo (link para Cargos) e de sprints Bloqueado na entidade.

Removidos: grade de 9 atalhos, cartão "Seu perfil", faixa de avatares, cartão "pulso".

Consultas em paralelo (`Promise.all`), uma por bloco, com `head: true` onde só importa a contagem, como já é feito hoje. Falha numa consulta degrada só o bloco dela (aviso inline), não a página.

## 3. Minha frente

**Sprints** (`FrentePainel`, `SprintsQuadro`, `SprintCartao`):

- Desktop: quadro em 4 colunas (Planejado, Em andamento, Bloqueado, Concluído). Mobile: lista agrupada por status.
- Filtro padrão "Meus"; alterna para "Todos". Busca por título/responsável continua no cliente (comentário em `sprints-quadro.tsx` explica o porquê).
- O cartão resume (título, responsável, progresso, próximo passo); clicar expande o painel com descrição e diário (`SprintDiario`, regras de escrita existentes: `podeEscrever`).
- Cabeçalho da frente com abas Competição / Pesquisa / Projetos (`FrenteAbas` existente), destacando a do membro.

**Metas** (`/membros/metas`): agrupadas em Atrasadas, Esta semana, Depois, Concluídas. Formulário e visibilidade (Privada/Pública) inalterados (`MetaForm`, `MetaCartao`).

## 4. Equipe

Mural: feed cronológico, fixados no topo (regra atual). Calendário: visão mensal existente mais uma lista "Agenda" dos próximos 30 dias (alternância). Pessoas (`/diretorio`): filtro por frente e busca. Documentos e Métricas: sem mudança funcional; passam a usar `PageHeader`, `Secao` e `EstadoVazio`.

## 5. Gestão

`/membros/administracao` abre numa fila de pendências (aprovações aguardando, sprints bloqueados) com ação direta, e só abaixo os cadastros (Atas, Cargos, Patrimônio como abas). Guarda de cargo em `administracao/layout.tsx` inalterada.

## 6. Kit de componentes

Novo, em `components/membros/`: `PageHeader` (h1, descrição, ações), `Secao` (título h2 + conteúdo), `EstadoVazio` (mensagem + ação), `Pilula` (estado). Reuso: `sprint-status`, `sprint-progresso`, `aviso`, `erro-dados`, `carregando`. As telas deixam de repetir eyebrow + h2 itálico.

## 7. Paleta de comandos (`Ctrl+K`)

Cliente, sem dependência nova. Lista estática derivada de `GRUPOS` (todas as telas visíveis ao usuário) mais ações: "Nova meta" (`/membros/metas`), "Novo aviso" (`/membros/mural`, só com cargo), "Editar perfil". Filtra por texto, setas e Enter, Esc fecha, foco preso no diálogo (`role="dialog"`, `aria-modal`). Busca de pessoas e sprints fica para depois.

## 8. Casca (`MembrosShell` e layout)

`app/membros/layout.tsx`: a moldura completa deixa de usar `SmoothScroll`, `CustomCursor` e `Footer`. A moldura pública (quem não passou nos portões) fica exatamente como está. `MembrosShell` é reescrito sobre `GRUPOS`. Mantém `nao-imprimir` na casca (a aba ProEx de Métricas imprime). `BadgeAmbiente` permanece.

## Acessibilidade

`nav` com `aria-label`, `aria-current="page"` na aba e no grupo ativos, foco visível (âmbar, já global), alvos de toque ≥ 44px, contraste mínimo AA, menu do usuário e paleta fecham com Esc e devolvem o foco.

## Verificação

- `npx tsc --noEmit`, `npx eslint .` e `npx next build` sem erros a cada etapa.
- `lib/navegacao.ts` com um script de asserts (`scripts/testar-navegacao.mjs`, no estilo de `testar-rls.mjs`) cobrindo: grupo ativo para cada rota, aba de Gestão ausente sem cargo, `/membros` não casando com tudo.
- Passada manual no `npm run dev` em 1440px e 390px por etapa (o Playwright do ambiente não abre; fica a cargo de quem rodar).

## Etapas (cada uma publicável)

1. Casca nova, `lib/navegacao.ts`, `/membros/frente`, kit de componentes.
2. Hoje.
3. Minha frente e Equipe.
4. Gestão e `Ctrl+K`.

## Fora do escopo (exige migração, fase 2)

Checklist de tarefas dentro do sprint, comentários, "lido/não lido" em avisos, menções, notificações. As migrações 016 e 023 seguem pendentes no banco do projeto e não devem ser empilhadas com novas até serem aplicadas.

## Riscos

- Mudar a casca afeta todas as rotas de uma vez: a etapa 1 precisa manter cada página funcionando antes de mexer no conteúdo.
- Colunas ou tabelas ausentes no banco real (016/023 pendentes): cada bloco de Hoje trata seu próprio erro para não derrubar a página.
- `/membros/frente` depende de `perfis.frente`; sem ela, cai na lista de três frentes.
