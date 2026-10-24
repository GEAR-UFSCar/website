# Operar o deploy

O site está no ar em <https://gearufscar.vercel.app>. Este arquivo é a
sequência para **mudar** o que está no ar sem quebrá-lo — variáveis, migrações,
o deploy em si — e a lista do que ainda depende de decisão de pessoas.

Última conferência do banco de produção contra o repositório: **24/10/2026**.
Nesse dia foram aplicadas as migrações 016, 024, 025, 026, 027 e 028, e o banco
passou a refletir `supabase/001…028`. Uma exceção deliberada, na seção 2
(documentos).

---

## 0. Antes de qualquer mudança

```bash
npm ci
npm run lint
npm run test:nav && npm run test:hoje && npm run test:calendario && npm run test:documentos
npm run test:seguranca
npm run test:banco   # as migrações aplicam e as regras do banco valem
npm run build        # tem de passar sem erro
```

É o mesmo que o CI roda em toda PR. Se o build falhar, pare: deploy de build
quebrado é rollback garantido.

`npm run test:rls` confere o **projeto real** como visitante. Rode depois de
aplicar qualquer migração.

---

## 1. Variáveis de ambiente

Na Vercel, **Project Settings → Environment Variables**. As duas primeiras são
obrigatórias; sem elas a área de membros não existe e o site sobe só com as
páginas públicas.

| Variável | Valor | Ambientes | Obrigatória |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Production, Preview, Development | **sim** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave publicável (`sb_publishable_…`) | Production, Preview, Development | **sim** |
| `NEXT_PUBLIC_SITE_URL` | `https://<domínio final>` | Production | **sim** |
| `ERRO_WEBHOOK_URL` | webhook do Discord/Slack para erros de servidor | Production | não |

Sobre `NEXT_PUBLIC_SITE_URL`: `lib/site.ts` cai para
`VERCEL_PROJECT_PRODUCTION_URL` e depois para `http://localhost:3000`. Sem a
variável, `og:url`, `og:image`, `robots.txt` e `sitemap.xml` vão para produção
**apontando para localhost** — o link compartilhado no WhatsApp não mostra
imagem e o Google indexa endereços que não existem.

Sobre `NEXT_PUBLIC_SUPABASE_URL`: além de configurar o cliente, ela **fixa o
host do Supabase na CSP** (`connect-src` e `img-src`), e a CSP é montada **no
build**. Trocar a URL exige novo deploy. Sem a variável no build, a CSP cai
para `*.supabase.co`, mais larga mas funcional.

As duas `NEXT_PUBLIC_*` do Supabase vão para o navegador por definição. Isso é
correto e é o modelo do Supabase: quem protege os dados é a RLS, não o segredo
da chave. **A chave `service_role` não aparece nesta tabela e não deve aparecer
nunca** — ela ignora RLS, e no `NEXT_PUBLIC_` estaria no bundle.

---

## 2. Migrações

Não há Supabase CLI: cada arquivo de `supabase/` é rodado **à mão, na ordem
numérica, no SQL Editor**. A ordem, as dependências e as consultas para
conferir o que já rodou estão em `supabase/README.md`.

Para uma migração nova:

1. Escreva o arquivo e o teste que a prova em `scripts/testar-banco.mjs`;
   `npm run test:banco` precisa passar. Se a migração tem risco de trancar
   acesso, rode a versão **sem** ela (`npm run test:banco -- --sem=NNN`) para
   ver o que ela protege.
2. Rode o arquivo **inteiro** de uma vez no SQL Editor, fora do horário de uso.
3. Rode a conferência do rodapé do arquivo, depois `npm run test:rls`.
4. Só então faça o deploy do código que depende dela.

Migração que **renomeia** coluna em uso (como a 013 foi) exige migração e
deploy na mesma janela: entre os dois momentos, em qualquer ordem, a área de
membros quebra para quem está logado.

**Só existe em produção:** `rls_auto_enable`, o gatilho de evento
(`ensure_rls`) que o painel do Supabase cria para ligar a RLS em toda tabela
nova. Está fora das migrações porque é do Supabase; se um dia o banco for
refeito a partir de `supabase/`, ative a opção equivalente no painel (e não
apague a função em produção).

**Documentos (025 e 026).** O catálogo de 50 documentos está no banco de
produção, e **todos estão como rascunho e não públicos**. Isso é uma
divergência deliberada do arquivo 026, que marca 10 deles como públicos: em
produção, a 026 foi seguida de um `update … set publico = false`, para nenhum
título ou resumo ficar visível no site público antes de a diretoria decidir. Os
PDFs não estão no repositório (que é público): suba cada um pela tela de
documentos, que grava no bucket privado. Para `/documentos/RI` abrir o PDF, o
Regimento precisa estar `vigente`, marcado como público e com arquivo anexado —
os três. A tela de documentos da área de membros é onde a diretoria faz isso.

---

## 3. Deploy

A Vercel constrói e publica sozinha a cada merge em `main`. Para publicar:
abra uma PR, espere o CI verde (`verificar`) e faça o merge.

Duas coisas que o repositório **não** garante e que dependem de configuração:

- **`main` não tem proteção de branch.** Quem tem permissão de escrita empurra
  direto, sem PR e sem esperar o CI. Recomendado: exigir PR e os checks
  `verificar` e `Analyze`, bloquear force push.
- **Dois projetos da Vercel publicam Production a partir deste repositório**
  (`website` e `gearufscar`; o site no ar é o `gearufscar`). São dois builds por
  commit e dois conjuntos de variáveis. Escolha o projeto que serve o domínio,
  desconecte o outro do Git e confira que as variáveis da seção 1 existem só
  onde precisam.

---

## 4. Conferir no ar

```bash
# cabeçalhos de segurança — devem aparecer todos; X-Powered-By NÃO deve aparecer
curl -sI https://<domínio> | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions|cross-origin|x-powered'

# a CSP deve citar o host EXATO do projeto Supabase, e não *.supabase.co
curl -sI https://<domínio> | grep -i content-security | grep -o 'connect-src[^;]*'

# a área de membros redireciona quem não tem sessão (espera-se 307)
curl -s -o /dev/null -w '%{http_code}\n' https://<domínio>/membros

# rotas antigas continuam resolvendo (espera-se 308)
curl -s -o /dev/null -w '%{http_code}\n' https://<domínio>/trilhas

# sitemap com o domínio certo, não localhost
curl -s https://<domínio>/sitemap.xml | head -5
```

Depois, no navegador, **com o console aberto** (mudança em CSP só se prova
assim; `npm run test:seguranca` confere a política, não o navegador):

1. Abra a home, `/documentos` e `/entrar`: o console não pode mostrar
   `Refused to …` por CSP. A engrenagem 3D da home precisa aparecer.
2. Crie uma conta de teste **com um e-mail `@ufscar.br` ou
   `@estudante.ufscar.br`** e confirme que o e-mail de confirmação chega e que
   a conta cai em `/membros/aguardando`, sem enxergar diretório, documentos,
   mural nem calendário. Prova a 014 (aprovação) e a 028 (o gatilho de
   cadastro não pode ter quebrado nada). Se aparecer "Database error saving
   new user", o caminho de volta está no rodapé de `supabase/028_…sql`.
3. Entre com uma conta aprovada e navegue pela área de membros com o console
   aberto: é o único jeito de ver a CSP com nonce em ação.

---

## 5. O que continua em aberto

Nada disto se resolve por código, e por isso nenhum item foi implementado:

- **Configurações do Supabase Auth** (painel → Authentication): proteção contra
  senha vazada (exige plano Pro), mínimo de senha **no servidor** (a tela exige
  8; quem chama a API direto cai no padrão do Supabase), limites de tentativa e
  de envio, e **SMTP próprio** — o padrão tem limite baixo de e-mails por hora, o
  que pesa quando 14 pessoas confirmam o e-mail no mesmo dia. O `signIn` vai do
  navegador direto para `supabase.co`: um limitador em `proxy.ts` não o veria.
- **Chave anônima legada.** O projeto ainda aceita a chave `anon` no formato JWT
  antigo, que só se troca girando o segredo do projeto. Trocar
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` pela chave publishable, redeployar, testar o
  login e só então desativar a legada no painel de API Keys.
- **GitHub.** Proteção de `main`, *push protection* do secret scanning e
  *Dependabot security updates* (Settings do repositório). O
  `.github/dependabot.yml` já cuida das atualizações de versão.
- **Testes com sessão em produção.** `npm run test:rls` cobre só o visitante.
  O que acontece depois do login é provado em `npm run test:banco`, contra o
  SQL do repositório; provar contra o banco real exigiria contas de teste no
  projeto, decisão da diretoria.
- **Conteúdo.** Os documentos do catálogo sem arquivo anexado e sem aprovação,
  projetos sem resultado de competição, `/parceiros` com quantidades a definir.
