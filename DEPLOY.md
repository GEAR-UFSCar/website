# Colocar o site no ar

O site da GEAR **nunca foi publicado**. Todo o trabalho de segurança,
acessibilidade, LGPD e SEO existe em `main` local e em nenhum servidor. Este
arquivo é a sequência exata para mudar isso, e o motivo de cada passo estar na
posição em que está.

Leia inteiro antes de começar: dois passos precisam acontecer **juntos**.

---

## 0. Antes de qualquer coisa

```bash
npm ci
npm run build      # tem de passar sem erro
npm run test:rls   # fronteira anônima do banco
```

Se o build falhar, pare. Deploy de build quebrado é rollback garantido.

O `test:rls` pode acusar os três predicados abertos — é o esperado enquanto a
migração 016 não foi aplicada (passo 2).

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
imagem e o Google indexa endereços que não existem. É o erro mais fácil de
cometer e o mais caro de perceber.

As duas `NEXT_PUBLIC_*` do Supabase vão para o navegador por definição. Isso é
correto e é o modelo do Supabase: quem protege os dados é a RLS, não o segredo
da chave. **A chave `service_role` não aparece nesta tabela e não deve aparecer
nunca** — ela ignora RLS, e no `NEXT_PUBLIC_` estaria no bundle.

---

## 2. Migrações e deploy, na mesma janela

**A migração 013 renomeia colunas em uso.** O código novo pede `perfis.frente`;
o banco antigo tem `perfis.trilha`. Entre os dois momentos — em qualquer
ordem — a área de membros fica quebrada para quem estiver logado.

Ordem recomendada, fora do horário de uso:

1. Confira o que já rodou (`supabase/README.md` tem as consultas).
2. Rode as migrações pendentes no SQL Editor, **na ordem numérica**.
3. Rode a conferência no rodapé de cada migração aplicada.
4. Só então faça o deploy.

A **016** é a única com risco de trancar acesso se aplicada pela metade: ela
revoga `EXECUTE` dos predicados e devolve por `grant`. Se a revogação rodar e o
grant não, a área de membros inteira para. Rode o arquivo de uma vez, e em
seguida a consulta 3 da conferência dela — a que confirma que `authenticated`
continua executando.

---

## 3. Deploy

```bash
git push origin main
```

São **9 commits** locais que nunca foram enviados. Com o projeto ligado ao
repositório, a Vercel constrói sozinha a partir daí.

Se ainda não há projeto na Vercel: **Add New → Project → importar o
repositório**. O framework é detectado como Next.js; não altere build command
nem output directory.

---

## 4. Conferir no ar

```bash
# cabeçalhos de segurança — devem aparecer todos
curl -sI https://<domínio> | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions'

# a área de membros redireciona quem não tem sessão (espera-se 307)
curl -s -o /dev/null -w '%{http_code}\n' https://<domínio>/membros

# rotas antigas continuam resolvendo (espera-se 308)
curl -s -o /dev/null -w '%{http_code}\n' https://<domínio>/trilhas

# sitemap com o domínio certo, não localhost
curl -s https://<domínio>/sitemap.xml | head -5
```

Depois, no navegador: criar uma conta de teste, confirmar que ela cai em
`/membros/aguardando` e **não** enxerga diretório, documentos, mural nem
calendário. É o teste que prova a migração 014 no ar.

---

## 5. O que continua em aberto depois do deploy

Nenhum destes é resolvido por código, e por isso nenhum foi implementado:

- **Limite de tentativas de login.** O `signIn` do Supabase vai do navegador
  direto para `supabase.co` — não passa pelo nosso servidor. Um limitador em
  `proxy.ts` não veria essa requisição e seria proteção de fachada. O controle
  real está em **Supabase → Authentication → Rate Limits**; ajustem lá.
- **Testes com sessão.** `npm run test:rls` cobre só o visitante anônimo.
  Cobrir membro aprovado, cargo e diretoria exige três contas de teste no
  projeto — decisão da diretoria, não do código.
- **Conteúdo.** Sete documentos institucionais sem arquivo, dois projetos sem
  resultado de competição, `/parceiros` com quantidades a definir. Enquanto
  isso não mudar, o site continua sendo infraestrutura à espera de operação.
