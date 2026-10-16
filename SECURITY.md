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

## Para quem mantém o site

As regras de acesso ficam no banco (RLS), em `supabase/`. Uma correção de
segurança no banco só vale depois de a migração ser **rodada** no SQL Editor;
`npm run test:rls` confere a fronteira anônima. Ver `supabase/README.md`.
