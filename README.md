# GEAR — site

Site do **GEAR** (Grupo de Extensão em Automação e Robótica), da UFSCar
Sorocaba: o que a entidade é e faz, as três frentes (Competição, Pesquisa e
Projetos), o catálogo público de documentos, a proposta para patrocinadores e,
atrás de login, a **área de membros** — mural, calendário, diretório, metas,
sprints por frente, documentação e a Academia GEAR.

No ar em <https://gearufscar.vercel.app>.

## Stack

Next.js (App Router) · React · Tailwind · Supabase (Auth, Postgres com RLS e
Storage) · Vercel · Three.js e Framer Motion na parte visual.

> **O Next.js deste repositório não é o que você conhece.** A versão instalada
> tem mudanças de API e de convenção. Antes de escrever código, leia o guia
> relevante em `node_modules/next/dist/docs/` (veja `AGENTS.md`).

## Rodar localmente

```bash
npm ci
# crie .env.local com as variáveis da tabela abaixo
npm run dev               # http://localhost:3000
```

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. Também fixa o host na CSP: precisa existir **na hora do build**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave publicável (`sb_publishable_…`). Vai para o navegador por desenho; quem protege os dados é a RLS. |
| `NEXT_PUBLIC_SITE_URL` | `https://<domínio final>`, para `og:url`, `robots.txt` e `sitemap.xml`. |
| `ERRO_WEBHOOK_URL` | opcional: webhook do Discord/Slack para erros de servidor. |

Sem as chaves do Supabase o site sobe só com as páginas públicas — o build de
CI roda assim de propósito. **Nunca** ponha a chave `service_role` em nenhuma
variável `NEXT_PUBLIC_*`: ela ignora a RLS.

## Testes

Todos rodam no CI (`.github/workflows/verificacao.yml`) em toda PR.

| Comando | O que confere | Precisa de rede? |
|---|---|---|
| `npm run lint` | ESLint | não |
| `npm run test:nav` · `test:hoje` · `test:calendario` · `test:documentos` | regras puras de cada área | não |
| `npm run test:seguranca` | cookie `Secure`, CSP presa ao host do Supabase, cabeçalhos | não |
| `npm run test:banco` | aplica `supabase/001…NNN` num Postgres em memória e ataca com os papéis reais (anon, authenticated, cadastro) | não |
| `npm run test:rls` | a fronteira anônima do projeto **real** de produção | sim, usa `.env.local` |

`test:banco` e `test:rls` se completam: o primeiro testa o SQL do repositório
inteiro, inclusive depois do login; o segundo testa o que está de fato no
banco de produção, mas só como visitante. Ver `supabase/README.md`.

## Banco de dados

Não há Supabase CLI. Cada arquivo de `supabase/` é uma migração, rodada **à
mão, na ordem, no SQL Editor** do painel. Um arquivo commitado não é uma
migração aplicada: o site não muda de aparência quando falta rodar uma. A
ordem, as dependências e as consultas para conferir o que já rodou estão em
[`supabase/README.md`](supabase/README.md).

## Mais documentação

- [`DEPLOY.md`](DEPLOY.md) — como o site vai ao ar, variáveis, o que conferir depois.
- [`SECURITY.md`](SECURITY.md) — como reportar uma falha, e os riscos que aceitamos de propósito.
- [`GEAR_identidade.html`](GEAR_identidade.html) — identidade visual (paleta, tipografia, direção estética).
- [`docs/`](docs) — guia de fotografia e o projeto (spec e plano) do redesenho da área de membros.

## Contribuir

Mudanças entram por Pull Request, e o CI precisa estar verde. Migração nova
vai junto com o teste que a prova (`scripts/testar-banco.mjs`) e com a linha
correspondente em `supabase/README.md`.
