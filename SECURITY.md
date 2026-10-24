# Segurança

Este é o site da GEAR (Grupo de Extensão em Automação e Robótica, UFSCar
Sorocaba), com uma área de membros que guarda dados pessoais de estudantes.
Levamos falha de segurança a sério e agradecemos quem avisa.

## Como reportar

Mande um e-mail para **gearufscar@gmail.com** com o assunto
`[SEGURANÇA] <resumo curto>`. Se puder, inclua:

- o que você encontrou e onde (página, rota ou tabela);
- os passos para reproduzir;
- o que alguém conseguiria fazer explorando a falha.

**Não abra issue pública** para falha de segurança: ela fica visível para
todo mundo antes de estar corrigida. Pelo mesmo motivo, não teste a falha
com dados de outras pessoas nem tente acessar mais do que o necessário para
demonstrá-la.

## O que esperar

- Resposta em até **7 dias** confirmando o recebimento. Somos uma entidade
  estudantil, sem plantão — mas o e-mail é lido.
- Depois de confirmada, avisamos quando a correção for publicada.
- Se você quiser, damos crédito pela descoberta na descrição da correção.

## Versão coberta

Só a versão em produção (o ramo `main`). Não há versões antigas mantidas.

## Riscos aceitos de propósito

Estes itens aparecem como alerta no advisor do Supabase ou em varreduras, e
foram decididos, não esquecidos. Se algum deixar de valer, aqui é o lugar de
mudar.

- **Views `metricas_publicas` e `documentos_publicos` são `SECURITY DEFINER`**
  (alerta de ERRO no advisor, lint 0010). É a forma de a página pública
  mostrar um recorte sem abrir a tabela por baixo. `metricas_publicas` expõe,
  do período em andamento, só: período, frente, projetos concluídos,
  competições disputadas, publicações aceitas e submetidas, parcerias,
  colocações e a data de atualização. `documentos_publicos` expõe só os
  documentos marcados como públicos e não arquivados — código, título,
  resumo, categoria, pacote, versão, páginas e status — e o caminho do arquivo **apenas** de
  documento vigente guardado no bucket (link externo nunca é repassado). A
  tabela por baixo continua fechada ao visitante (`npm run test:rls` e
  `npm run test:banco` conferem). Todo campo novo nessas views é decisão de
  publicação, não hábito.
- **Três funções `SECURITY DEFINER` chamáveis sem login**:
  `feed_do_calendario(uuid)`, `calendario_token_valido(uuid)` e
  `documento_e_publico(text)`. Cada uma exige um segredo (token de assinatura
  do calendário, de 122 bits) ou um caminho exato, e só devolve o que o feed ou
  o arquivo público precisam. `test:banco` falha se aparecer uma quarta.
- **Predicados de autorização executáveis por quem está logado**:
  `e_membro()`, `e_diretoria()` e `tem_cargo()`, mais `valor_patrimonio_atual()`.
  A RLS os chama no papel de quem consulta, então precisam de `EXECUTE`. Só
  respondem sobre a própria sessão.
- **`script-src 'unsafe-inline'` nas rotas públicas.** Nonce exigiria
  renderização dinâmica e tiraria o cache de CDN de páginas que não mostram
  nada escrito por usuário. A área de membros, onde há conteúdo de terceiros,
  usa nonce com `strict-dynamic`.
- **Cookie de sessão sem `HttpOnly`.** O cliente de navegador do Supabase
  precisa ler o cookie. Ele sai com `Secure` e `SameSite=Lax`, e a CSP da
  área de membros é o que protege contra script injetado.
- **A recusa de e-mail fora da UFSCar, no cadastro, volta como erro genérico.**
  O gatilho do banco é a barreira; a mensagem útil é a da tela, que confere
  antes. Trocar o e-mail depois de criada a conta não passa pelo gatilho — a
  barreira real é a aprovação da diretoria.

## Para quem mantém o site

As regras de acesso ficam no banco (RLS), em `supabase/`. Uma correção de
segurança no banco só vale depois de a migração ser **rodada** no SQL Editor.
`npm run test:banco` prova as regras no SQL do repositório (inclusive depois do
login) e `npm run test:rls` confere a fronteira anônima do banco de produção.
Ver `supabase/README.md`.
