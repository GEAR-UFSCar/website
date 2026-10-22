# Área de membros: redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a casca e a navegação de `/membros/*` por 5 grupos com sub-abas, reescrever a home como painel "Hoje", reorganizar sprints/metas por "Minha frente", agrupar o resto em Equipe e Gestão, e adicionar `Ctrl+K`.

**Architecture:** `lib/navegacao.ts` vira dado puro (grupos, abas, funções de pathname) testado por script Node. Um kit mínimo em `components/membros/` padroniza cabeçalho, seção, estado vazio e pílula. `MembrosShell` é reescrito sobre os grupos. A lógica de "Hoje" que não é consulta (ordenar sprints, juntar prazos) vive em `lib/hoje.ts`, pura e testada. Nenhuma URL muda e não há migração.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Tailwind 4, framer-motion (já instalado), Supabase (`@supabase/ssr`), TypeScript. Testes: scripts Node com `node:assert` rodados por `node --experimental-strip-types` (Node 22).

**Spec:** `docs/superpowers/specs/2026-10-21-area-de-membros-redesign-design.md`

## Global Constraints

- Nenhuma URL existente muda; só `/membros/frente` é nova.
- Nenhuma migração nova; usar só `sprints`, `sprint_atualizacoes`, `metas`, `eventos`, `avisos`, `modulos`/`progresso`, `perfis`, `atas`, `patrimonio`, `documentos`, `metricas_periodo`.
- Portões de acesso (perfil completo, aprovação, `erro` de tabela ausente) mantêm a mesma lógica; quem não passa continua na moldura pública (Navbar + Footer públicos).
- Permissões inalteradas: Métricas visível a todo membro aprovado; Administração exige `temCargo`.
- Paleta e fontes da GEAR (navy `#0B2138`, ink `#081726`, âmbar `#FF7A2F`; Chakra Petch e Space Mono). Âmbar só para ação e estado. Raio de borda reto.
- Texto em português, tom direto, sem travessões (`—`), sem numeração de seção, sem "SEÇÃO · SUBTÍTULO".
- Sem `CustomCursor`, sem `SmoothScroll`, sem `Footer` público na moldura completa de membros. Movimento de entrada neutralizado por `MotionConfig reducedMotion="always"` (sobra só fade de opacidade).
- Títulos em peso normal (`font-normal`), sem `italic`. Mono só para dado.
- Alvos de toque ≥ 44px (`min-h-11`), foco visível (já global), `aria-current="page"` em grupo e aba ativos.
- Cada etapa termina com `npx tsc --noEmit`, `npx eslint .` e `npx next build` sem erro.
- Cada tarefa termina em commit com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Membro sem frente (`perfis.frente` nulo), cargo nulo ou nome vazio: `/membros/frente`, "Hoje" e o menu do usuário não podem quebrar nem mostrar "null". Tarefas 3, 6.
2. Tabela ou coluna ausente no banco real (migrações 016/023 pendentes): cada bloco de "Hoje" degrada sozinho, a página não cai. Tarefa 6.
3. Fuso: prazos de "Hoje" usam `hojeISO()`/`diaGear()` (Brasília), nunca o relógio UTC do servidor. Tarefas 5, 6.
4. Rota desconhecida ou subrota nova sob `/membros`: `grupoAtual` nunca devolve o grupo errado nem lança. Tarefa 1.
5. Quem tem cargo vs quem não tem: a aba Gestão não aparece nem na barra nem em `Ctrl+K` sem cargo. Tarefas 1, 10.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/navegacao.ts` (reescrito) | Grupos, abas, `grupoAtual`, `abaAtual`, `titulo`. Sem imports. |
| `scripts/testar-navegacao.mjs` (novo) | Asserts de `lib/navegacao.ts`. |
| `lib/hoje.ts` (novo) | `maisDias`, `ordenarSprints`, `prazosDaSemana`, `agruparMetas`. Sem imports. |
| `scripts/testar-hoje.mjs` (novo) | Asserts de `lib/hoje.ts`. |
| `components/membros/page-header.tsx` (novo) | h1 + descrição + ações. |
| `components/membros/secao.tsx` (novo) | h2 + conteúdo. |
| `components/membros/estado-vazio.tsx` (novo) | Mensagem + ação opcional. |
| `components/membros/pilula.tsx` (novo) | Etiqueta de estado. |
| `components/membros-shell.tsx` (reescrito) | Barra de grupos, sub-abas, menu do usuário, gatilho da paleta. |
| `components/membros/paleta.tsx` (novo) | Diálogo `Ctrl+K`. |
| `app/membros/layout.tsx` (editado) | Moldura completa sem cursor/scroll suave/footer. |
| `app/membros/frente/page.tsx` (novo) | Redireciona à frente do membro ou lista as três. |
| `app/membros/page.tsx` (reescrito) | "Hoje". |
| `components/membros/hoje.tsx` (novo) | Blocos de "Hoje". |
| `components/sprints-quadro.tsx`, `components/sprint-cartao.tsx`, `components/frente-painel.tsx` (editados) | Quadro por status e filtro "Meus". |
| `app/membros/metas/page.tsx` (editado) | Metas agrupadas. |
| `app/membros/calendario/page.tsx`, `components/membros/agenda-lista.tsx` (novo) | Lista "Agenda". |
| `app/membros/administracao/*` (editados) | Fila de pendências e abas. |

---

## ETAPA 1: Casca, navegação e kit

### Task 1: `lib/navegacao.ts` com teste

**Files:**
- Modify: `lib/navegacao.ts` (reescrita completa)
- Create: `scripts/testar-navegacao.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces:
  ```ts
  export type Aba = { href: string; rotulo: string; prefixos: string[]; exato?: boolean }
  export type Grupo = { id: string; rotulo: string; href: string; prefixos: string[]; exato?: boolean; exigeCargo?: boolean; abas: Aba[] }
  export const GRUPOS: Grupo[]
  export function gruposVisiveis(comCargo: boolean): Grupo[]
  export function grupoAtual(pathname: string, grupos?: Grupo[]): Grupo | undefined
  export function abaAtual(pathname: string, grupo: Grupo | undefined): Aba | undefined
  export function titulo(pathname: string): string
  ```
- Consumes: nada (arquivo sem imports, para rodar em `node --experimental-strip-types`).

- [ ] **Step 1: Escrever o teste que falha**

Criar `scripts/testar-navegacao.mjs`:

```js
import assert from "node:assert/strict"
import { GRUPOS, abaAtual, grupoAtual, gruposVisiveis, titulo } from "../lib/navegacao.ts"

const id = (p, g = GRUPOS) => grupoAtual(p, g)?.id

// Hoje só casa com /membros exato: não engole as outras rotas.
assert.equal(id("/membros"), "hoje")
assert.equal(id("/membros/mural"), "equipe")

// Minha frente cobre as três frentes, a rota de redirecionamento e as metas.
assert.equal(id("/membros/frente"), "frente")
assert.equal(id("/membros/sprints/competicao"), "frente")
assert.equal(id("/membros/sprints/pesquisa"), "frente")
assert.equal(id("/membros/metas"), "frente")

assert.equal(id("/membros/aprendizagem"), "aprender")
assert.equal(id("/membros/calendario"), "equipe")
assert.equal(id("/membros/diretorio"), "equipe")
assert.equal(id("/membros/documentacao"), "equipe")
assert.equal(id("/membros/metricas"), "equipe")
assert.equal(id("/membros/administracao"), "gestao")
assert.equal(id("/membros/administracao/atas"), "gestao")

// Rota desconhecida sob /membros não devolve grupo errado nem lança.
assert.equal(id("/membros/algo-novo"), undefined)
assert.equal(id("/outro"), undefined)

// Sem cargo, Gestão não existe; com cargo, existe.
assert.ok(!gruposVisiveis(false).some((g) => g.id === "gestao"))
assert.ok(gruposVisiveis(true).some((g) => g.id === "gestao"))
// Sem cargo, a rota de gestão não resolve para grupo nenhum.
assert.equal(id("/membros/administracao/atas", gruposVisiveis(false)), undefined)

// Aba ativa: Sprints cobre as três frentes; Visão geral de Gestão é exata.
const frente = grupoAtual("/membros/sprints/projetos")
assert.equal(abaAtual("/membros/sprints/projetos", frente)?.rotulo, "Sprints")
assert.equal(abaAtual("/membros/metas", frente)?.rotulo, "Metas")
const gestao = grupoAtual("/membros/administracao")
assert.equal(abaAtual("/membros/administracao", gestao)?.rotulo, "Visão geral")
assert.equal(abaAtual("/membros/administracao/cargos", gestao)?.rotulo, "Cargos")

// Grupo sem abas devolve undefined, sem lançar.
assert.equal(abaAtual("/membros", grupoAtual("/membros")), undefined)

// Títulos.
assert.equal(titulo("/membros"), "Hoje")
assert.equal(titulo("/membros/diretorio"), "Pessoas")
assert.equal(titulo("/membros/administracao/cargos"), "Cargos e aprovação")
assert.equal(titulo("/membros/sprints/pesquisa"), "Pesquisa")
assert.equal(titulo("/membros/rota-nova"), "Área de membros")

console.log("navegacao: ok")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types scripts/testar-navegacao.mjs`
Expected: FAIL (`GRUPOS` não é exportado pelo arquivo atual).

- [ ] **Step 3: Reescrever `lib/navegacao.ts`**

```ts
/**
 * Mapa de navegação da área de membros: 5 grupos, cada um com suas abas.
 *
 * É dado puro e não importa nada, para o teste (scripts/testar-navegacao.mjs)
 * rodar em Node sem montar React. As URLs são as que já existiam; só o
 * agrupamento mudou. A aba Sprints aponta para /membros/frente, que redireciona
 * à frente do próprio membro.
 */

export type Aba = {
  href: string
  rotulo: string
  /** Rotas que marcam a aba como atual (a própria e as subrotas). */
  prefixos: string[]
  /** Casa só com a rota exata, sem subrotas. */
  exato?: boolean
}

export type Grupo = {
  id: string
  rotulo: string
  href: string
  prefixos: string[]
  exato?: boolean
  /** Só para quem tem cargo. */
  exigeCargo?: boolean
  abas: Aba[]
}

export const GRUPOS: Grupo[] = [
  { id: "hoje", rotulo: "Hoje", href: "/membros", prefixos: ["/membros"], exato: true, abas: [] },
  {
    id: "frente",
    rotulo: "Minha frente",
    href: "/membros/frente",
    prefixos: ["/membros/frente", "/membros/sprints", "/membros/metas"],
    abas: [
      { href: "/membros/frente", rotulo: "Sprints", prefixos: ["/membros/frente", "/membros/sprints"] },
      { href: "/membros/metas", rotulo: "Metas", prefixos: ["/membros/metas"] },
    ],
  },
  {
    id: "aprender",
    rotulo: "Aprender",
    href: "/membros/aprendizagem",
    prefixos: ["/membros/aprendizagem"],
    abas: [],
  },
  {
    id: "equipe",
    rotulo: "Equipe",
    href: "/membros/mural",
    prefixos: [
      "/membros/mural",
      "/membros/calendario",
      "/membros/diretorio",
      "/membros/documentacao",
      "/membros/metricas",
    ],
    abas: [
      { href: "/membros/mural", rotulo: "Mural", prefixos: ["/membros/mural"] },
      { href: "/membros/calendario", rotulo: "Calendário", prefixos: ["/membros/calendario"] },
      { href: "/membros/diretorio", rotulo: "Pessoas", prefixos: ["/membros/diretorio"] },
      { href: "/membros/documentacao", rotulo: "Documentos", prefixos: ["/membros/documentacao"] },
      { href: "/membros/metricas", rotulo: "Métricas", prefixos: ["/membros/metricas"] },
    ],
  },
  {
    id: "gestao",
    rotulo: "Gestão",
    href: "/membros/administracao",
    prefixos: ["/membros/administracao"],
    exigeCargo: true,
    abas: [
      { href: "/membros/administracao", rotulo: "Visão geral", prefixos: ["/membros/administracao"], exato: true },
      { href: "/membros/administracao/atas", rotulo: "Atas", prefixos: ["/membros/administracao/atas"] },
      { href: "/membros/administracao/cargos", rotulo: "Cargos", prefixos: ["/membros/administracao/cargos"] },
      { href: "/membros/administracao/patrimonio", rotulo: "Patrimônio", prefixos: ["/membros/administracao/patrimonio"] },
    ],
  },
]

export function gruposVisiveis(comCargo: boolean): Grupo[] {
  return GRUPOS.filter((g) => !g.exigeCargo || comCargo)
}

const casa = (pathname: string, prefixo: string, exato?: boolean) =>
  pathname === prefixo || (!exato && pathname.startsWith(`${prefixo}/`))

/** Grupo da rota. Prefixo mais longo vence; rota fora do mapa devolve undefined. */
export function grupoAtual(pathname: string, grupos: Grupo[] = GRUPOS): Grupo | undefined {
  let melhor: { grupo: Grupo; tamanho: number } | undefined
  for (const grupo of grupos) {
    for (const prefixo of grupo.prefixos) {
      if (casa(pathname, prefixo, grupo.exato) && (!melhor || prefixo.length > melhor.tamanho)) {
        melhor = { grupo, tamanho: prefixo.length }
      }
    }
  }
  return melhor?.grupo
}

export function abaAtual(pathname: string, grupo: Grupo | undefined): Aba | undefined {
  if (!grupo) return undefined
  let melhor: { aba: Aba; tamanho: number } | undefined
  for (const aba of grupo.abas) {
    for (const prefixo of aba.prefixos) {
      if (casa(pathname, prefixo, aba.exato) && (!melhor || prefixo.length > melhor.tamanho)) {
        melhor = { aba, tamanho: prefixo.length }
      }
    }
  }
  return melhor?.aba
}

const TITULOS: Record<string, string> = {
  "/membros": "Hoje",
  "/membros/frente": "Minha frente",
  "/membros/sprints/competicao": "Competição",
  "/membros/sprints/pesquisa": "Pesquisa",
  "/membros/sprints/projetos": "Projetos",
  "/membros/metas": "Metas",
  "/membros/aprendizagem": "Aprendizagem",
  "/membros/mural": "Mural",
  "/membros/calendario": "Calendário",
  "/membros/diretorio": "Pessoas",
  "/membros/documentacao": "Documentos",
  "/membros/metricas": "Métricas",
  "/membros/administracao": "Gestão",
  "/membros/administracao/atas": "Atas",
  "/membros/administracao/cargos": "Cargos e aprovação",
  "/membros/administracao/patrimonio": "Patrimônio",
  "/membros/completar-perfil": "Completar perfil",
  "/membros/aguardando": "Aguardando aprovação",
}

export function titulo(pathname: string): string {
  return TITULOS[pathname] ?? "Área de membros"
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types scripts/testar-navegacao.mjs`
Expected: `navegacao: ok`

- [ ] **Step 5: Script no package.json e commit**

Em `package.json`, em `"scripts"`, acrescentar `"test:nav": "node --experimental-strip-types scripts/testar-navegacao.mjs"` depois de `"test:rls"`.

`components/membros-shell.tsx` ainda importa `ABAS`/`abaAtual`/`migalha` antigos, então `tsc` quebra até a Task 3. Não rodar `tsc` aqui.

```bash
git add lib/navegacao.ts scripts/testar-navegacao.mjs package.json
git commit -m "feat(membros): navegação em 5 grupos como dado puro, com teste" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Kit `components/membros/`

**Files:**
- Create: `components/membros/page-header.tsx`, `components/membros/secao.tsx`, `components/membros/estado-vazio.tsx`, `components/membros/pilula.tsx`

**Interfaces:**
- Produces:
  ```ts
  PageHeader({ titulo: string; children?: ReactNode; acoes?: ReactNode }): JSX
  Secao({ titulo: string; id?: string; acoes?: ReactNode; children: ReactNode; className?: string }): JSX
  EstadoVazio({ children: ReactNode; href?: string; acao?: string }): JSX
  Pilula({ children: ReactNode; tom?: "neutro" | "ativo" | "alerta" }): JSX
  ```

- [ ] **Step 1: `page-header.tsx`**

```tsx
import type { ReactNode } from "react"

/**
 * Cabeçalho de página da área de membros: o h1 e, se houver, uma frase de
 * apoio. É o único h1 de cada tela; a barra superior não repete o título.
 */
export function PageHeader({
  titulo,
  children,
  acoes,
}: {
  titulo: string
  children?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        <h1 className="font-sans text-3xl font-normal tracking-tight text-balance md:text-4xl">{titulo}</h1>
        {children && (
          <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
            {children}
          </p>
        )}
      </div>
      {acoes && <div className="flex flex-wrap gap-3">{acoes}</div>}
    </header>
  )
}
```

- [ ] **Step 2: `secao.tsx`**

```tsx
import type { ReactNode } from "react"

/** Bloco com título h2. Substitui eyebrow + h2 itálico. */
export function Secao({
  titulo,
  id,
  acoes,
  children,
  className = "mt-12",
}: {
  titulo: string
  id?: string
  acoes?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={className}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-white/10 pt-5">
        <h2 className="font-sans text-xl font-normal tracking-tight md:text-2xl">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  )
}
```

`className` substitui o padrão `mt-12` em vez de somar. Quem quiser a primeira seção colada ao cabeçalho passa `className="mt-0"`; quem quiser largura máxima passa `className="mt-12 max-w-4xl"`.

- [ ] **Step 3: `estado-vazio.tsx`**

```tsx
import Link from "next/link"
import type { ReactNode } from "react"

/** Estado vazio: diz o que falta e, quando há, aonde ir para preencher. */
export function EstadoVazio({ children, href, acao }: { children: ReactNode; href?: string; acao?: string }) {
  return (
    <div className="border border-dashed border-white/15 p-6">
      <p className="max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">{children}</p>
      {href && acao && (
        <Link
          href={href}
          className="mt-4 inline-flex min-h-11 items-center font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--gear-amber)] hover:underline"
        >
          {acao} →
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 4: `pilula.tsx`**

```tsx
import type { ReactNode } from "react"

const TONS = {
  neutro: "border-white/20 text-muted-foreground",
  ativo: "border-[var(--gear-amber)] text-[var(--gear-amber)]",
  alerta: "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]",
} as const

/** Etiqueta de estado. Âmbar cheio (alerta) só para o que exige ação. */
export function Pilula({ children, tom = "neutro" }: { children: ReactNode; tom?: keyof typeof TONS }) {
  return (
    <span className={`inline-block border px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase ${TONS[tom]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 5: Commit** (sem `tsc` completo ainda; os arquivos novos são independentes)

```bash
git add components/membros
git commit -m "feat(membros): kit PageHeader, Secao, EstadoVazio e Pilula" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Casca nova, layout e `/membros/frente`

**Files:**
- Modify: `components/membros-shell.tsx` (reescrita), `app/membros/layout.tsx`, `app/membros/loading.tsx`
- Create: `app/membros/frente/page.tsx`

**Interfaces:**
- Consumes: `gruposVisiveis`, `grupoAtual`, `abaAtual` (Task 1); `sair` Server Action e props `nome`, `cargo`, `comCargo` (já existentes no layout).
- Produces: `MembrosShell` mantém as mesmas props (`nome`, `cargo`, `comCargo`, `sair`); nenhuma outra tarefa muda a assinatura.

- [ ] **Step 1: Reescrever `components/membros-shell.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut } from "lucide-react"

import { abaAtual, grupoAtual, gruposVisiveis } from "@/lib/navegacao"

type Props = {
  nome: string
  /** Cargo do perfil; vazio vira "Membro" na etiqueta. */
  cargo: string | null
  comCargo: boolean
  /** Server Action de logout, definida no layout. */
  sair: () => Promise<void>
}

/**
 * Casca de navegação da área de membros: uma barra de 56px com os grupos e,
 * quando o grupo tem mais de uma aba, uma segunda linha com elas.
 *
 * `sticky` e não `fixed`: a barra ocupa altura real no fluxo, então nenhuma
 * página precisa compensar com padding-top. `nao-imprimir` porque a aba ProEx
 * de Métricas é feita para virar papel.
 */
export function MembrosShell({ nome, cargo, comCargo, sair }: Props) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const menu = useRef<HTMLDivElement>(null)

  const grupos = gruposVisiveis(comCargo)
  const grupo = grupoAtual(pathname, grupos)
  const aba = abaAtual(pathname, grupo)

  // Fecha ao clicar fora e no Esc.
  useEffect(() => {
    if (!aberto) return
    const clique = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("mousedown", clique)
    document.addEventListener("keydown", tecla)
    return () => {
      document.removeEventListener("mousedown", clique)
      document.removeEventListener("keydown", tecla)
    }
  }, [aberto])

  // Fecha ao navegar, durante o render (um efeito pintaria o menu aberto por um frame).
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname)
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname)
    setAberto(false)
  }

  const inicial = nome.trim().charAt(0).toUpperCase() || "?"
  const etiquetaCargo = cargo?.trim() || "Membro"

  return (
    <div className="nao-imprimir sticky top-0 z-50 border-b border-white/10 bg-[var(--gear-navy)]/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4 md:gap-6 md:px-8">
        <Link href="/membros" className="flex shrink-0 items-center gap-2" aria-label="GEAR, início da área de membros">
          <Image src="/gear-icon-g.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="hidden font-sans text-base font-semibold tracking-tight sm:block">GEAR</span>
        </Link>

        <nav aria-label="Grupos da área de membros" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex min-w-max items-stretch">
            {grupos.map((g) => {
              const ativo = grupo?.id === g.id
              return (
                <li key={g.id}>
                  <Link
                    href={g.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex h-14 items-center border-b-2 px-3 font-sans text-sm transition-colors duration-200 md:px-4 ${
                      ativo
                        ? "border-[var(--gear-amber)] text-[var(--gear-amber)]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.rotulo}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("membros:paleta"))}
          className="hidden min-h-11 items-center gap-2 border border-white/15 px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:border-white/40 hover:text-foreground md:inline-flex"
          aria-label="Abrir busca de telas (Ctrl+K)"
        >
          Ir para…
          <kbd className="border border-white/15 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>

        <div ref={menu} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-haspopup="menu"
            className="flex min-h-11 items-center gap-2 px-1"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gear-amber)] font-sans text-sm font-semibold text-[var(--gear-ink)]"
            >
              {inicial}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
            />
          </button>

          {aberto && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 border border-white/15 bg-[var(--gear-ink)] p-2 shadow-2xl"
            >
              <div className="border-b border-white/10 px-3 pb-3 pt-2">
                <p className="truncate font-sans text-sm">{nome}</p>
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{etiquetaCargo}</p>
              </div>
              <Link
                href="/membros/completar-perfil"
                role="menuitem"
                className="flex min-h-11 items-center px-3 font-sans text-sm text-muted-foreground hover:text-[var(--gear-amber)]"
              >
                Editar perfil
              </Link>
              <Link
                href="/"
                role="menuitem"
                className="flex min-h-11 items-center px-3 font-sans text-sm text-muted-foreground hover:text-[var(--gear-amber)]"
              >
                Site principal
              </Link>
              {/* Server Action: o logout limpa o cookie de sessão no servidor. */}
              <form action={sair} className="border-t border-white/10 pt-1">
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center gap-2 px-3 font-sans text-sm text-muted-foreground hover:text-[var(--gear-amber)]"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {grupo && grupo.abas.length > 1 && (
        <nav aria-label={`Seções de ${grupo.rotulo}`} className="overflow-x-auto border-t border-white/10">
          <ul className="flex min-w-max items-stretch px-4 md:px-8">
            {grupo.abas.map((a) => {
              const ativa = aba?.href === a.href
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    aria-current={ativa ? "page" : undefined}
                    className={`flex min-h-11 items-center border-b-2 px-3 font-sans text-sm transition-colors duration-200 ${
                      ativa
                        ? "border-[var(--gear-amber)] text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.rotulo}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Editar `app/membros/layout.tsx`**

Acrescentar no topo `import { MotionConfig } from "framer-motion"`. Substituir o segundo `return` (a moldura completa) por:

```tsx
  return (
    <MotionConfig reducedMotion="always">
      <MembrosShell
        nome={perfil?.nome_completo?.trim() || user.email || "Membro"}
        cargo={perfil?.cargo ?? null}
        comCargo={temCargo(perfil?.cargo)}
        sair={sair}
      />
      <main>
        <BadgeAmbiente />
        {children}
      </main>
    </MotionConfig>
  )
```

O ramo público (primeiro `return`, quando `!dentro`) não muda: continua com `SmoothScroll`, `CustomCursor`, `Navbar` e `Footer`. `MembrosLayout` é Server Component; `MotionConfig` é Client Component e aceita `children` do servidor. `reducedMotion="always"` remove o movimento (transform) das animações e deixa só o fade de opacidade do `Surge`.

Trocar o comentário grande acima de `MembrosLayout` que fala de "onze páginas montavam a própria moldura" por: `/* Moldura de /membros. Duas versões, escolhidas pelo estado da conta: a completa (barra de grupos, sem cursor, sem rolagem suave e sem rodapé público) e a pública, para quem ainda não completou o perfil ou não foi aprovado. */`

- [ ] **Step 3: Atualizar `app/membros/loading.tsx`**

```tsx
import { Carregando } from "@/components/carregando"

/*
 * Um loading.tsx só, no topo do segmento /membros: o Next o usa em todas as
 * rotas aninhadas.
 */
export default function MembrosLoading() {
  return <Carregando />
}
```

- [ ] **Step 4: Criar `app/membros/frente/page.tsx`**

```tsx
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/membros/page-header"
import { FRENTES_ROTAS, rotaDaFrente } from "@/lib/administracao"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"

export const metadata: Metadata = {
  title: "Minha frente | GEAR",
  robots: { index: false, follow: false },
}

/**
 * Atalho para os sprints da frente de quem está logado. Sem frente definida
 * (diretoria, por exemplo), lista as três para escolher.
 */
export default async function MinhaFrentePage() {
  const { perfil } = await exigirMembroAprovado()
  const frente = perfil?.frente?.trim()

  if (frente && FRENTES_ROTAS.some((f) => f.nome === frente)) {
    redirect(rotaDaFrente(frente))
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
      <PageHeader titulo="Minha frente">
        Você ainda não tem uma frente definida. Escolha qual acompanhar.
      </PageHeader>
      <ul className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
        {FRENTES_ROTAS.map((f) => (
          <li key={f.slug} className="bg-[var(--gear-ink)]">
            <Link
              href={`/membros/sprints/${f.slug}`}
              className="block p-6 font-sans text-xl hover:bg-[var(--gear-navy)] hover:text-[var(--gear-amber)]"
            >
              {f.nome}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`FRENTES_ROTAS` (`{ slug, nome }`) e `rotaDaFrente(nome)` (devolve `/membros/sprints/{slug}`) já existem em `lib/administracao.ts:45-62`.

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npx eslint . && node --experimental-strip-types scripts/testar-navegacao.mjs`
Expected: sem saída de erro e `navegacao: ok`.

Se o `tsc` acusar outro arquivo importando `ABAS` ou `migalha` de `lib/navegacao`: `grep -rn "ABAS\|migalha" app components lib` e substituir pelo equivalente novo (`GRUPOS`/`titulo`).

- [ ] **Step 6: Commit**

```bash
git add components/membros-shell.tsx app/membros/layout.tsx app/membros/loading.tsx app/membros/frente
git commit -m "feat(membros): casca com grupos e sub-abas, sem cursor/scroll suave/footer; rota /membros/frente" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cabeçalho único nas páginas existentes

Hoje o h1 vinha da barra; sem ele, as páginas ficam sem h1. Esta tarefa troca o parágrafo de abertura de cada página por `PageHeader`, remove os botões "Voltar para membros" (a barra já navega) e tira o `italic` dos h2.

**Files:**
- Modify: `app/membros/{mural,calendario,diretorio,documentacao,metricas,metas,aprendizagem}/page.tsx`, `app/membros/administracao/{page,layout}.tsx`, `app/membros/administracao/{atas,cargos,patrimonio}/page.tsx`, `components/frente-painel.tsx`
- Create (temporário, apagado ao fim): `scripts/codemod-cabecalho.mjs`

**Interfaces:**
- Consumes: `PageHeader` (Task 2).
- Produces: cada página tem exatamente um `<PageHeader>` com o título da tabela do Step 1.

- [ ] **Step 1: Tabela de títulos (fonte de verdade desta tarefa)**

| Arquivo | `titulo` |
|---|---|
| `mural/page.tsx` | Mural |
| `calendario/page.tsx` | Calendário |
| `diretorio/page.tsx` | Pessoas |
| `documentacao/page.tsx` | Documentos |
| `metricas/page.tsx` | Métricas |
| `metas/page.tsx` | Metas |
| `aprendizagem/page.tsx` | Aprendizagem |
| `administracao/page.tsx` | Gestão |
| `administracao/atas/page.tsx` | Atas |
| `administracao/cargos/page.tsx` | Cargos e aprovação |
| `administracao/patrimonio/page.tsx` | Patrimônio |

- [ ] **Step 2: Rodar o codemod**

Criar `scripts/codemod-cabecalho.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs"

const alvos = {
  "app/membros/mural/page.tsx": "Mural",
  "app/membros/calendario/page.tsx": "Calendário",
  "app/membros/diretorio/page.tsx": "Pessoas",
  "app/membros/documentacao/page.tsx": "Documentos",
  "app/membros/metricas/page.tsx": "Métricas",
  "app/membros/metas/page.tsx": "Metas",
  "app/membros/administracao/page.tsx": "Gestão",
}

const lead =
  /<Surge>\s*<p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">([\s\S]*?)<\/p>\s*<\/Surge>/
const voltar = /\s*<Link\s+href="\/membros"[^>]*>\s*Voltar para membros\s*<\/Link>/g
const divVazia = /\s*<div className="[^"]*">\s*<\/div>/g

for (const [arquivo, titulo] of Object.entries(alvos)) {
  let s = readFileSync(arquivo, "utf8")
  const antes = s
  s = s.replace(lead, (_, texto) => `<PageHeader titulo="${titulo}">${texto.trim().replace(/\s+/g, " ")}</PageHeader>`)
  s = s.replace(voltar, "")
  s = s.replace(divVazia, "")
  s = s.replace(/ font-light italic"/g, ' font-normal"')
  if (!s.includes("<PageHeader")) throw new Error(`${arquivo}: abertura não encontrada, editar à mão`)
  if (!s.includes("import { PageHeader }")) {
    s = s.replace(/(import [^\n]+\n)(?!import)/, `$1import { PageHeader } from "@/components/membros/page-header"\n`)
  }
  if (s !== antes) writeFileSync(arquivo, s)
  console.log("ok", arquivo)
}
```

Run: `node scripts/codemod-cabecalho.mjs`
Expected: uma linha `ok <arquivo>` por alvo. Se algum lançar "abertura não encontrada", abrir o arquivo e fazer a troca à mão com o mesmo `<PageHeader titulo="...">texto</PageHeader>`.

- [ ] **Step 3: Páginas fora do padrão do codemod**

`aprendizagem/page.tsx`, `administracao/{atas,cargos,patrimonio}/page.tsx` e `components/frente-painel.tsx` têm abertura própria. Em cada uma:

1. `grep -n "<h1\|Voltar para membros\|italic" <arquivo>`.
2. Se houver um `<h1 ...>...</h1>` próprio, trocar por `<PageHeader titulo="<da tabela>">…</PageHeader>` mantendo o texto de apoio como filho.
3. Remover o `<Link href="/membros" ...>Voltar para membros</Link>`.
4. Trocar ` font-light italic"` por ` font-normal"` nos h2.
5. `components/frente-painel.tsx`: trocar o parágrafo `<p className="mt-10 max-w-2xl ...">Os sprints da frente {frente}…</p>` por `<PageHeader titulo={frente}>Os sprints da frente {frente}. Qualquer membro acompanha as três; mudar status, progresso e diário é de quem tem cargo nesta frente, ou da diretoria, em qualquer uma.{eMinhaFrente ? " Esta é a sua frente." : ""}</PageHeader>`, e mover `<FrenteAbas atual={frente} />` para depois dele (remover a classe `mt-10` do `<nav>` em `components/frente-abas.tsx`).

- [ ] **Step 4: Ramo "sem cargo" de `app/membros/administracao/layout.tsx`**

Trocar o bloco `<p>ACESSO RESTRITO</p>` + `<h1>Área da <br/> <span italic>administração</span></h1>` + parágrafo + botão "Voltar para membros" por:

```tsx
<PageHeader titulo="Acesso restrito">
  Esta área é restrita a membros com cargo na entidade. Sua conta continua ativa. Se você deveria ter acesso, peça para a diretoria preencher seu cargo no perfil.
</PageHeader>
```

e acrescentar o import de `PageHeader`.

- [ ] **Step 5: Limpar imports e eyebrows**

Run: `npx eslint . 2>&1 | grep -E "never used|no-unused"`
Para cada aviso (provavelmente `Link`, `botaoSecundario`, `Surge` que ficou sem uso), remover o import.

Run: `grep -rn 'tracking-\[0\.3em\] text-muted-foreground mb-[24]' app/membros components`
Para cada resultado: se o texto do `<p>` é só um rótulo de seção (nome da seção ou numeração), apagar o `<p>`; se carrega dado útil ao usuário (contagem real), trocar a classe por `font-mono text-xs text-muted-foreground mb-2`.

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -15`
Expected: tudo verde. Depois `rm scripts/codemod-cabecalho.mjs`.

Manual (`npm run dev`, logado como membro aprovado): cada rota de `/membros/*` mostra um único h1, a barra marca o grupo certo e as sub-abas navegam.

- [ ] **Step 7: Commit**

```bash
git add -A app/membros components scripts
git commit -m "refactor(membros): PageHeader em todas as páginas, sem botão voltar nem h2 itálico" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## ETAPA 2: Hoje

### Task 5: `lib/hoje.ts` com teste

**Files:**
- Create: `lib/hoje.ts`, `scripts/testar-hoje.mjs`
- Modify: `package.json` (script `test:hoje`)

**Interfaces:**
- Produces:
  ```ts
  export function maisDias(chave: string, n: number): string               // "YYYY-MM-DD" + n dias
  export function ordenarSprints<T extends { status: string; updated_at: string }>(s: T[]): T[]
  export type ItemPrazo = { id: string; origem: "evento" | "meta"; titulo: string; dia: string; hora: string | null; href: string; detalhe: string }
  export function prazosDaSemana(itens: ItemPrazo[], hoje: string, ate: string): { atrasados: ItemPrazo[]; proximos: ItemPrazo[] }
  export function agruparMetas<T extends { prazo: string; concluida: boolean }>(m: T[], hoje: string): { atrasadas: T[]; semana: T[]; depois: T[]; concluidas: T[] }
  ```
- Consumes: nada (sem imports; todos os dias chegam como string `"YYYY-MM-DD"` já calculada em Brasília por quem chama).

- [ ] **Step 1: Teste que falha**

`scripts/testar-hoje.mjs`:

```js
import assert from "node:assert/strict"
import { agruparMetas, maisDias, ordenarSprints, prazosDaSemana } from "../lib/hoje.ts"

// maisDias atravessa mês e ano.
assert.equal(maisDias("2026-10-21", 7), "2026-10-28")
assert.equal(maisDias("2026-12-30", 3), "2027-01-02")
assert.equal(maisDias("2026-03-01", -1), "2026-02-28")

// Bloqueado antes de Em andamento antes de Planejado; empate por updated_at mais recente.
const sprints = [
  { id: "a", status: "Planejado", updated_at: "2026-10-01T10:00:00Z" },
  { id: "b", status: "Em andamento", updated_at: "2026-10-02T10:00:00Z" },
  { id: "c", status: "Bloqueado", updated_at: "2026-09-01T10:00:00Z" },
  { id: "d", status: "Em andamento", updated_at: "2026-10-05T10:00:00Z" },
]
assert.deepEqual(ordenarSprints(sprints).map((s) => s.id), ["c", "d", "b", "a"])
// Não muta a entrada.
assert.equal(sprints[0].id, "a")

const item = (id, origem, dia, hora = null) => ({ id, origem, titulo: id, dia, hora, href: "/x", detalhe: "" })
const itens = [
  item("meta-atrasada", "meta", "2026-10-15"),
  item("evento-passado", "evento", "2026-10-10", "09:00"),
  item("meta-hoje", "meta", "2026-10-21"),
  item("evento-hoje", "evento", "2026-10-21", "14:00"),
  item("evento-amanha", "evento", "2026-10-22", "08:00"),
  item("meta-longe", "meta", "2026-11-30"),
]
const { atrasados, proximos } = prazosDaSemana(itens, "2026-10-21", "2026-10-28")
// Só meta conta como atrasada; evento passado some.
assert.deepEqual(atrasados.map((i) => i.id), ["meta-atrasada"])
// Dentro do dia, evento antes de meta; fora da janela não entra.
assert.deepEqual(proximos.map((i) => i.id), ["evento-hoje", "meta-hoje", "evento-amanha"])

// Entrada vazia não quebra.
assert.deepEqual(prazosDaSemana([], "2026-10-21", "2026-10-28"), { atrasados: [], proximos: [] })

// Metas agrupadas.
const metas = [
  { id: 1, prazo: "2026-10-01", concluida: false },
  { id: 2, prazo: "2026-10-01", concluida: true },
  { id: 3, prazo: "2026-10-25", concluida: false },
  { id: 4, prazo: "2026-12-01", concluida: false },
]
const g = agruparMetas(metas, "2026-10-21")
assert.deepEqual(g.atrasadas.map((m) => m.id), [1])
assert.deepEqual(g.semana.map((m) => m.id), [3])
assert.deepEqual(g.depois.map((m) => m.id), [4])
assert.deepEqual(g.concluidas.map((m) => m.id), [2])

console.log("hoje: ok")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types scripts/testar-hoje.mjs`
Expected: FAIL (`lib/hoje.ts` não existe).

- [ ] **Step 3: Implementar `lib/hoje.ts`**

```ts
/**
 * Regras de "Hoje" que não dependem de React nem do Supabase. Sem imports,
 * para o teste (scripts/testar-hoje.mjs) rodar em Node. Todo dia chega como
 * "YYYY-MM-DD" já calculado em Brasília (hojeISO/diaGear de lib/datas.ts).
 */

/** "YYYY-MM-DD" deslocado em `n` dias. UTC puro: sem fuso, sem horário de verão. */
export function maisDias(chave: string, n: number): string {
  const [a, m, d] = chave.split("-").map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

const PESO_STATUS: Record<string, number> = { Bloqueado: 0, "Em andamento": 1, Planejado: 2 }

/** Bloqueado primeiro (pede ação), depois em andamento; empate: mexido por último. */
export function ordenarSprints<T extends { status: string; updated_at: string }>(sprints: T[]): T[] {
  return [...sprints].sort((a, b) => {
    const pa = PESO_STATUS[a.status] ?? 3
    const pb = PESO_STATUS[b.status] ?? 3
    if (pa !== pb) return pa - pb
    return b.updated_at.localeCompare(a.updated_at)
  })
}

export type ItemPrazo = {
  id: string
  origem: "evento" | "meta"
  titulo: string
  dia: string
  hora: string | null
  href: string
  detalhe: string
}

/**
 * Atrasados = metas (nunca eventos) com dia antes de hoje; quem chama já tirou
 * as concluídas. Próximos = hoje até `ate`, inclusive, por dia, evento antes de
 * meta dentro do dia, e por hora entre eventos.
 */
export function prazosDaSemana(itens: ItemPrazo[], hoje: string, ate: string) {
  const atrasados = itens
    .filter((i) => i.origem === "meta" && i.dia < hoje)
    .sort((a, b) => a.dia.localeCompare(b.dia))

  const proximos = itens
    .filter((i) => i.dia >= hoje && i.dia <= ate)
    .sort((a, b) => {
      if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
      if (a.origem !== b.origem) return a.origem === "evento" ? -1 : 1
      return (a.hora ?? "").localeCompare(b.hora ?? "")
    })

  return { atrasados, proximos }
}

/** Metas em quatro grupos; "semana" = de hoje até 7 dias, inclusive. */
export function agruparMetas<T extends { prazo: string; concluida: boolean }>(metas: T[], hoje: string) {
  const ate = maisDias(hoje, 7)
  const abertas = metas.filter((m) => !m.concluida)
  return {
    atrasadas: abertas.filter((m) => m.prazo < hoje),
    semana: abertas.filter((m) => m.prazo >= hoje && m.prazo <= ate),
    depois: abertas.filter((m) => m.prazo > ate),
    concluidas: metas.filter((m) => m.concluida),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types scripts/testar-hoje.mjs`
Expected: `hoje: ok`

- [ ] **Step 5: Script e commit**

Em `package.json` acrescentar `"test:hoje": "node --experimental-strip-types scripts/testar-hoje.mjs"`.

```bash
git add lib/hoje.ts scripts/testar-hoje.mjs package.json
git commit -m "feat(membros): regras puras de Hoje (prazos, ordem de sprints, metas) com teste" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Página "Hoje"

**Files:**
- Create: `components/membros/hoje.tsx`
- Modify: `app/membros/page.tsx` (reescrita completa)

**Interfaces:**
- Consumes: `ordenarSprints`, `prazosDaSemana`, `maisDias`, `ItemPrazo` (Task 5); `PageHeader`, `Secao`, `EstadoVazio`, `Pilula` (Task 2); `Sprint`, `COLUNAS_SPRINT`, `aparenciaDoStatus` (`lib/sprints.ts`); `COLUNAS_META`, `prazoRelativo`, `Meta` (`lib/metas.ts`); `montarEstagios`, `COLUNAS_MODULO`, `formatarDuracao`, `Modulo`, `Progresso` (`lib/academia.ts`); `hojeISO`, `diaGear`, `horaGear`, `saudacao`, `inicioDoDiaGear` (`lib/datas.ts`); `primeiroNome`, `rotaDaFrente`, `temCargo` (`lib/administracao.ts`).
- Produces: `BlocoPendencias({ aprovacoes: number | null, bloqueados: number | null })`, reusado na Task 10; `AvisoResumo`, `ModuloAtual` (tipos exportados de `hoje.tsx`).

`page.tsx` faz o portão e as consultas (cada consulta isolada, com seu erro) e passa dados prontos para os blocos de `hoje.tsx`, que são Server Components sem estado.

- [ ] **Step 1: `components/membros/hoje.tsx`**

```tsx
import Link from "next/link"

import { EstadoVazio } from "@/components/membros/estado-vazio"
import { Pilula } from "@/components/membros/pilula"
import { Secao } from "@/components/membros/secao"
import { ErroDados } from "@/components/erro-dados"
import type { ErroDeDados } from "@/lib/erros"
import type { ItemPrazo } from "@/lib/hoje"
import { aparenciaDoStatus, type Sprint } from "@/lib/sprints"
import { prazoRelativo } from "@/lib/metas"
import { formatarDuracao } from "@/lib/academia"

const linha = "flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 py-3"
const verMais = "font-mono text-[11px] text-[var(--gear-amber)] hover:underline"

export function BlocoAgora({ sprints, erro, rotaFrente }: { sprints: Sprint[]; erro: ErroDeDados | null; rotaFrente: string }) {
  return (
    <Secao titulo="Agora" className="mt-0">
      {erro ? (
        <ErroDados titulo="SPRINTS INDISPONÍVEIS" erro={erro}>
          Rode <code>supabase/020_sprints_responsavel_e_proximo_passo.sql</code> e{" "}
          <code>supabase/021_sprints_progresso_bloqueado_e_diario.sql</code>.
        </ErroDados>
      ) : sprints.length === 0 ? (
        <EstadoVazio href={rotaFrente} acao="Ver sprints da frente">
          Você não é responsável por nenhum sprint em aberto.
        </EstadoVazio>
      ) : (
        <ul>
          {sprints.map((s) => {
            const aparencia = aparenciaDoStatus(s.status)
            return (
              <li key={s.id} className={linha}>
                <Link href={`${rotaFrente}#sprint-${s.id}`} className="min-w-0 flex-1 basis-64 font-sans text-base hover:text-[var(--gear-amber)]">
                  {s.titulo}
                  <span className="block font-sans text-sm font-light text-muted-foreground">
                    {s.proximo_passo?.trim() || "Próximo passo ainda não declarado."}
                  </span>
                </Link>
                <Pilula tom={s.status === "Bloqueado" ? "alerta" : "ativo"}>{s.status}</Pilula>
                <div
                  role="progressbar"
                  aria-valuenow={s.progresso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso de ${s.titulo}`}
                  className="h-1.5 w-28 bg-white/10"
                >
                  <div style={{ width: `${s.progresso}%` }} className={`h-full ${aparencia.barra}`} />
                </div>
                <span className="w-10 text-right font-mono text-xs tabular-nums">{s.progresso}%</span>
              </li>
            )
          })}
        </ul>
      )}
    </Secao>
  )
}

export function BlocoPrazos({
  atrasados,
  proximos,
  hoje,
  erros,
}: {
  atrasados: ItemPrazo[]
  proximos: ItemPrazo[]
  hoje: string
  erros: { titulo: string; erro: ErroDeDados; dica: string }[]
}) {
  const vazio = atrasados.length === 0 && proximos.length === 0
  return (
    <Secao titulo="Prazos dos próximos 7 dias">
      {erros.map((e) => (
        <ErroDados key={e.titulo} titulo={e.titulo} erro={e.erro} className="mb-4">
          {e.dica}
        </ErroDados>
      ))}
      {vazio ? (
        <EstadoVazio href="/membros/calendario" acao="Abrir calendário">
          Nada marcado para esta semana.
        </EstadoVazio>
      ) : (
        <ul>
          {[...atrasados, ...proximos].map((i) => (
            <li key={i.id} className={linha}>
              <Link href={i.href} className="min-w-0 flex-1 basis-64 font-sans text-base hover:text-[var(--gear-amber)]">
                {i.titulo}
                <span className="block font-sans text-sm font-light text-muted-foreground">{i.detalhe}</span>
              </Link>
              {i.dia < hoje && <Pilula tom="alerta">Atrasada</Pilula>}
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {prazoRelativo(i.dia)}
                {i.hora ? `, ${i.hora}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}

export type AvisoResumo = { id: string; titulo: string; conteudo: string; fixado: boolean }

export function BlocoAvisos({ avisos, erro }: { avisos: AvisoResumo[]; erro: ErroDeDados | null }) {
  return (
    <Secao titulo="Avisos" acoes={<Link href="/membros/mural" className={verMais}>Ver mural →</Link>}>
      {erro ? (
        <ErroDados titulo="MURAL INDISPONÍVEL" erro={erro}>
          Rode <code>supabase/008_eventos_avisos_sprints.sql</code>.
        </ErroDados>
      ) : avisos.length === 0 ? (
        <EstadoVazio>Nenhum aviso publicado.</EstadoVazio>
      ) : (
        <ul>
          {avisos.map((a) => (
            <li key={a.id} className={linha}>
              <div className="min-w-0 flex-1 basis-64">
                <p className="font-sans text-base">{a.titulo}</p>
                <p className="line-clamp-1 font-sans text-sm font-light text-muted-foreground">{a.conteudo}</p>
              </div>
              {a.fixado && <Pilula tom="ativo">Fixado</Pilula>}
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}

export type ModuloAtual = {
  titulo: string
  nivel: string
  posicao: string
  prazo: string | null
  duracao: number | null
  percentual: number
}

export function BlocoAcademia({ atual }: { atual: ModuloAtual }) {
  return (
    <Secao titulo="Academia" acoes={<Link href="/membros/aprendizagem" className={verMais}>Abrir →</Link>}>
      <p className="font-sans text-base">{atual.titulo}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {atual.nivel}, módulo {atual.posicao}
        {atual.duracao ? `, ${formatarDuracao(atual.duracao)}` : ""}
        {atual.prazo ? `, prazo ${prazoRelativo(atual.prazo)}` : ""}
      </p>
      <div
        role="progressbar"
        aria-valuenow={atual.percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso na formação"
        className="mt-3 h-1.5 w-full max-w-md bg-white/10"
      >
        <div style={{ width: `${atual.percentual}%` }} className="h-full bg-[var(--gear-amber)]" />
      </div>
      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{atual.percentual}% da formação</p>
    </Secao>
  )
}

export function BlocoPendencias({ aprovacoes, bloqueados }: { aprovacoes: number | null; bloqueados: number | null }) {
  return (
    <Secao titulo="Pendências da diretoria">
      <ul>
        <li className={linha}>
          <Link href="/membros/administracao/cargos" className="flex-1 font-sans text-base hover:text-[var(--gear-amber)]">
            Membros aguardando aprovação
          </Link>
          <Pilula tom={aprovacoes ? "alerta" : "neutro"}>{aprovacoes ?? "?"}</Pilula>
        </li>
        <li className={linha}>
          <span className="flex-1 font-sans text-base">Sprints bloqueados na entidade</span>
          <Pilula tom={bloqueados ? "alerta" : "neutro"}>{bloqueados ?? "?"}</Pilula>
        </li>
      </ul>
    </Secao>
  )
}
```

`aparenciaDoStatus(status).barra` é a classe de preenchimento já usada em `components/sprint-cartao.tsx`; `formatarDuracao(minutos)` está em `lib/academia.ts:47`.

- [ ] **Step 2: Reescrever `app/membros/page.tsx`**

```tsx
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { PageHeader } from "@/components/membros/page-header"
import {
  BlocoAcademia,
  BlocoAgora,
  BlocoAvisos,
  BlocoPendencias,
  BlocoPrazos,
  type AvisoResumo,
  type ModuloAtual,
} from "@/components/membros/hoje"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { diaGear, hojeISO, horaGear, inicioDoDiaGear, saudacao } from "@/lib/datas"
import { primeiroNome, rotaDaFrente, temCargo } from "@/lib/administracao"
import { maisDias, ordenarSprints, prazosDaSemana, type ItemPrazo } from "@/lib/hoje"
import { COLUNAS_SPRINT, type Sprint } from "@/lib/sprints"
import { COLUNAS_META, type Meta } from "@/lib/metas"
import { COLUNAS_MODULO, montarEstagios, type Modulo, type Progresso } from "@/lib/academia"

export const metadata: Metadata = {
  title: "Hoje | GEAR",
  robots: { index: false, follow: false },
}

export default async function HojePage() {
  const user = await exigirUsuario()
  const { perfil, erro } = await getPerfil()

  // Portões: mesma régua de app/membros/layout.tsx.
  if (!erro && !perfil?.nome_completo?.trim()) redirect("/membros/completar-perfil")
  if (!erro && !perfil?.aprovado) redirect("/membros/aguardando")

  if (erro) {
    return (
      <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
        <Aviso titulo="PERFIL INDISPONÍVEL">
          Não foi possível ler o seu perfil. Se a tabela não existe, rode <code>supabase/001_perfis.sql</code>.
        </Aviso>
      </section>
    )
  }

  const frente = perfil?.frente?.trim() || null
  const comCargo = temCargo(perfil?.cargo)
  const rotaFrente = rotaDaFrente(frente)

  const hoje = hojeISO()
  const ate = maisDias(hoje, 7)
  const inicioJanela = inicioDoDiaGear(hoje)
  const fimJanela = inicioDoDiaGear(maisDias(ate, 1))

  const supabase = await createClient()
  const [sprintsR, eventosR, metasR, avisosR, modulosR, progressoR, aprovacoesR, bloqueadosR] = await Promise.all([
    supabase.from("sprints").select(COLUNAS_SPRINT).eq("responsavel_id", user.id).neq("status", "Concluído"),
    supabase
      .from("eventos")
      .select("id, titulo, tipo, data_inicio, frente_vinculada")
      .gte("data_inicio", inicioJanela)
      .lt("data_inicio", fimJanela)
      .order("data_inicio", { ascending: true }),
    supabase.from("metas").select(COLUNAS_META).eq("usuario_id", user.id).eq("concluida", false).lte("prazo", ate),
    supabase
      .from("avisos")
      .select("id, titulo, conteudo, fixado")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("modulos").select(COLUNAS_MODULO).order("ordem"),
    supabase.from("progresso").select("modulo_id, concluido_em").eq("usuario_id", user.id),
    comCargo
      ? supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false).not("nome_completo", "is", null)
      : Promise.resolve({ count: null, error: null }),
    comCargo
      ? supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "Bloqueado")
      : Promise.resolve({ count: null, error: null }),
  ])

  const sprints = ordenarSprints((sprintsR.data ?? []) as unknown as Sprint[])

  // Evento da minha frente ou sem frente; as metas já são só minhas.
  const itens: ItemPrazo[] = [
    ...((eventosR.data ?? []) as { id: string; titulo: string; tipo: string; data_inicio: string; frente_vinculada: string | null }[])
      .filter((e) => !e.frente_vinculada || e.frente_vinculada === frente)
      .map((e) => ({
        id: `evento-${e.id}`,
        origem: "evento" as const,
        titulo: e.titulo,
        dia: diaGear(e.data_inicio),
        hora: horaGear(e.data_inicio),
        href: "/membros/calendario",
        detalhe: e.tipo,
      })),
    ...((metasR.data ?? []) as Meta[]).map((m) => ({
      id: `meta-${m.id}`,
      origem: "meta" as const,
      titulo: m.titulo,
      dia: m.prazo.slice(0, 10),
      hora: null,
      href: "/membros/metas",
      detalhe: "Sua meta",
    })),
  ]
  const { atrasados, proximos } = prazosDaSemana(itens, hoje, ate)

  const errosPrazos = [
    ...(eventosR.error
      ? [{ titulo: "EVENTOS INDISPONÍVEIS", erro: eventosR.error, dica: "Rode supabase/008_eventos_avisos_sprints.sql." }]
      : []),
    ...(metasR.error ? [{ titulo: "METAS INDISPONÍVEIS", erro: metasR.error, dica: "Rode supabase/017_metas.sql." }] : []),
  ]

  // Academia: primeiro módulo não concluído da trilha, na ordem da formação.
  let moduloAtual: ModuloAtual | null = null
  if (!modulosR.error) {
    const lista = (modulosR.data ?? []) as Modulo[]
    const concluidos = new Set(
      ((progressoR.data ?? []) as Progresso[]).filter((p) => p.concluido_em).map((p) => p.modulo_id),
    )
    const estagios = montarEstagios(lista, concluidos).filter((e) => e.total > 0)
    const trilha = estagios.flatMap((e) => e.modulos)
    const pendente = trilha.find((m) => !concluidos.has(m.id))
    if (pendente) {
      const estagio = estagios.find((e) => e.nivel === pendente.nivel)
      const posicao = (estagio?.modulos.findIndex((m) => m.id === pendente.id) ?? 0) + 1
      const feitos = trilha.filter((m) => concluidos.has(m.id)).length
      moduloAtual = {
        titulo: pendente.titulo,
        nivel: pendente.nivel,
        posicao: `${posicao} de ${estagio?.total ?? 0}`,
        prazo: estagio?.prazo ?? null,
        duracao: pendente.duracao_estimada,
        percentual: trilha.length ? Math.round((feitos / trilha.length) * 100) : 0,
      }
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
      <PageHeader titulo={`${saudacao()}, ${primeiroNome(perfil?.nome_completo)}`}>
        {frente ? `Frente ${frente}.` : "Você ainda não tem uma frente definida."} O que pede a sua atenção agora.
      </PageHeader>

      <BlocoAgora sprints={sprints} erro={sprintsR.error} rotaFrente={rotaFrente} />
      <BlocoPrazos atrasados={atrasados} proximos={proximos} hoje={hoje} erros={errosPrazos} />
      <BlocoAvisos avisos={(avisosR.data ?? []) as unknown as AvisoResumo[]} erro={avisosR.error} />
      {moduloAtual && <BlocoAcademia atual={moduloAtual} />}
      {comCargo && (
        <BlocoPendencias
          aprovacoes={aprovacoesR.error ? null : (aprovacoesR.count ?? 0)}
          bloqueados={bloqueadosR.error ? null : (bloqueadosR.count ?? 0)}
        />
      )}
    </section>
  )
}
```

`responsavel_id` (em `sprints`, migração 020), `saudacao()` e `hojeISO()` (em `lib/datas.ts`) existem. Se `Aviso` não aceitar a prop `titulo`, copiar a forma de uso de `app/membros/aprendizagem/page.tsx`.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -15`
Expected: verde. Corrigir o que o `tsc` apontar.

Manual (`npm run dev`): membro sem frente, sem sprint e sem meta vê os estados vazios e nenhuma palavra "null" ou "undefined"; membro com cargo vê "Pendências da diretoria"; sem cargo, não vê.

- [ ] **Step 4: Commit**

```bash
git add app/membros/page.tsx components/membros/hoje.tsx
git commit -m "feat(membros): painel Hoje com sprints, prazos, avisos, academia e pendências" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## ETAPA 3: Minha frente e Equipe

### Task 7: Sprints em quadro e filtro "Meus"

**Files:**
- Modify: `components/sprints-quadro.tsx`, `components/frente-painel.tsx`, `components/sprint-cartao.tsx`

**Interfaces:**
- Consumes: `STATUS_SPRINT` (`lib/administracao.ts`), `Sprint` (`lib/sprints.ts`; `responsavel` é `{ id, nome_completo } | null`).
- Produces: `SprintCartao` ganha `id={`sprint-${sprint.id}`}` no `<article>` (alvo do link de "Hoje"); `SprintsQuadro` mantém as props.

- [ ] **Step 1: Âncora no cartão**

Em `components/sprint-cartao.tsx`, trocar `<article className="border border-white/10 bg-[var(--gear-navy)] p-6 md:p-8">` por `<article id={`sprint-${sprint.id}`} className="scroll-mt-32 border border-white/10 bg-[var(--gear-navy)] p-5 md:p-6">`.

- [ ] **Step 2: Filtro "Meus" e quadro por status em `components/sprints-quadro.tsx`**

Imports: acrescentar `import { STATUS_SPRINT } from "@/lib/administracao"`.

Dentro do componente, junto dos `useState`:

```tsx
const [meus, setMeus] = useState(true)

const base = useMemo(
  () => (meus ? sprints.filter((s) => s.responsavel?.id === usuarioId) : sprints),
  [sprints, meus, usuarioId],
)
// porBusca passa a partir de `base`:
const porBusca = useMemo(() => base.filter((s) => corresponde(s, busca)), [base, busca])
```

Acima do campo de busca (antes de `<div className="mt-10">`), o alternador:

```tsx
<div role="group" aria-label="Quais sprints mostrar" className="mt-6 flex gap-2">
  {[
    { rotulo: "Meus", valor: true },
    { rotulo: "Todos", valor: false },
  ].map((o) => (
    <button
      key={o.rotulo}
      type="button"
      onClick={() => setMeus(o.valor)}
      aria-pressed={meus === o.valor}
      className={`min-h-11 border px-4 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors ${
        meus === o.valor
          ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
          : "border-white/20 text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {o.rotulo}
    </button>
  ))}
</div>
```

Trocar o bloco final `<div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">…</div>` (lista única de cartões) por colunas por status no desktop e pilha no celular:

```tsx
<div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-4 xl:gap-4">
  {STATUS_SPRINT.filter((st) => !status || st === status).map((st) => {
    const doStatus = visiveis.filter((s) => s.status === st)
    return (
      <section key={st} aria-label={st}>
        <h2 className="mb-3 flex items-baseline justify-between border-b border-white/10 pb-2 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">
          {st}
          <span className="tabular-nums">{doStatus.length}</span>
        </h2>
        <div className="flex flex-col gap-4">
          {doStatus.map((sprint) => (
            <SprintCartao
              key={sprint.id}
              sprint={sprint}
              atualizacoes={atualizacoes[sprint.id] ?? []}
              podeEscrever={podeEscrever}
              usuarioId={usuarioId}
            />
          ))}
        </div>
      </section>
    )
  })}
</div>
```

A mensagem de lista vazia (hoje `sprints.length === 0 ? "Nenhum sprint registrado nesta frente ainda." : "Nenhum sprint corresponde…"`) passa a olhar para `base`: trocar a condição por `base.length === 0 ? (meus ? "Você não é responsável por nenhum sprint desta frente. Use Todos para ver os demais." : "Nenhum sprint registrado nesta frente ainda.") : "Nenhum sprint corresponde à busca e ao filtro escolhidos."`.

A hierarquia fica h1 (`PageHeader`) → h2 (coluna de status) → h3 (título do cartão).

- [ ] **Step 3: `components/frente-painel.tsx`**

Sem mudança de dados. Se o codemod da Task 4 não removeu o `<div className="mt-16">…Voltar para membros…</div>` do fim, remover agora, junto com os imports `Link` e `botaoSecundario` que ficarem sem uso.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -10`
Manual: abrir uma frente; "Meus" começa ativo e mostra só os sprints do usuário; "Todos" mostra 4 colunas no desktop (≥1280px) e uma pilha por status no celular; clicar num sprint em "Hoje" rola até o cartão.

- [ ] **Step 5: Commit**

```bash
git add components/sprints-quadro.tsx components/sprint-cartao.tsx components/frente-painel.tsx components/frente-abas.tsx
git commit -m "feat(membros): sprints em quadro por status com filtro Meus/Todos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Metas agrupadas, Agenda e Equipe

**Files:**
- Modify: `app/membros/metas/page.tsx`, `app/membros/calendario/page.tsx`
- Create: `components/membros/agenda-lista.tsx`

**Interfaces:**
- Consumes: `agruparMetas` (Task 5), `MetaCartao` (`<MetaCartao meta={meta} usuarioId={user.id} editavel />`), `ItemAgenda` (`lib/agenda.ts`), `Secao`, `EstadoVazio`.
- Produces: `AgendaLista({ itens, hoje }: { itens: ItemAgenda[]; hoje: string })`.

- [ ] **Step 1: Metas agrupadas**

Em `app/membros/metas/page.tsx`, acrescentar os imports:

```tsx
import { agruparMetas } from "@/lib/hoje"
import { hojeISO } from "@/lib/datas"
import { Secao } from "@/components/membros/secao"
import { EstadoVazio } from "@/components/membros/estado-vazio"
```

Logo depois de `const minhas = …`, acrescentar:

```tsx
const grupos = agruparMetas(minhas, hojeISO())
const SECOES_METAS = [
  { chave: "atrasadas", titulo: "Atrasadas" },
  { chave: "semana", titulo: "Esta semana" },
  { chave: "depois", titulo: "Depois" },
  { chave: "concluidas", titulo: "Concluídas" },
] as const
```

(`SECOES_METAS` pode ficar fora do componente, no topo do módulo.)

Substituir a `<section className="mt-16 max-w-4xl">` de "Minhas metas" (que hoje renderiza `minhas.map(… <Surge><MetaCartao meta={meta} usuarioId={user.id} editavel /></Surge>)`) por:

```tsx
{SECOES_METAS.map(({ chave, titulo }) =>
  grupos[chave].length === 0 ? null : (
    <Secao key={chave} titulo={`${titulo} (${grupos[chave].length})`} className="mt-12 max-w-4xl">
      <div className="space-y-4">
        {grupos[chave].map((meta) => (
          <MetaCartao key={meta.id} meta={meta} usuarioId={user.id} editavel />
        ))}
      </div>
    </Secao>
  ),
)}
{minhas.length === 0 && (
  <Secao titulo="Minhas metas" className="mt-12 max-w-4xl">
    <EstadoVazio>
      {error ? "Não foi possível carregar suas metas." : "Você ainda não criou nenhuma meta. Use o formulário acima."}
    </EstadoVazio>
  </Secao>
)}
```

O bloco "Nova meta" (formulário) fica acima, como hoje, dentro de `<Secao titulo="Nova meta" className="mt-12 max-w-4xl">`. Apagar os `vencidas`/`abertas` calculados antes se ficarem sem uso.

- [ ] **Step 2: `components/membros/agenda-lista.tsx`**

```tsx
import { dataLonga } from "@/lib/datas"
import { Pilula } from "@/components/membros/pilula"
import type { ItemAgenda } from "@/lib/agenda"

/** Lista cronológica dos itens do calendário; complementa a grade mensal. */
export function AgendaLista({ itens, hoje }: { itens: ItemAgenda[]; hoje: string }) {
  const futuros = itens.filter((i) => i.dia >= hoje).slice(0, 30)
  if (futuros.length === 0) {
    return <p className="font-sans text-sm font-light text-muted-foreground">Nada marcado de hoje em diante neste mês.</p>
  }
  return (
    <ul>
      {futuros.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 py-3">
          <span className="w-44 font-mono text-xs tabular-nums text-muted-foreground">
            {dataLonga(`${i.dia}T12:00:00-03:00`)}
            {i.hora ? `, ${i.hora}` : ""}
          </span>
          <span className="min-w-0 flex-1 basis-56 font-sans text-base">{i.titulo}</span>
          <Pilula tom={i.atrasada ? "alerta" : "neutro"}>{i.rotulo}</Pilula>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Usar a lista em `app/membros/calendario/page.tsx`**

Importar `Secao` (`@/components/membros/secao`) e `AgendaLista` (`@/components/membros/agenda-lista`). Depois do bloco `<Surge className="mt-16"><CalendarioMensal … /></Surge>`, acrescentar:

```tsx
<Secao titulo="Agenda">
  <AgendaLista itens={itens} hoje={hoje} />
</Secao>
```

- [ ] **Step 4: Pessoas, Documentos, Métricas, Mural**

O codemod da Task 4 já aplicou `PageHeader` e tirou o itálico. Aqui só conferir: `grep -n "Voltar para membros\|italic" app/membros/{diretorio,documentacao,metricas,mural}/page.tsx` deve retornar vazio. O diretório já agrupa as pessoas por frente (`grupo.chave`/`grupo.rotulo`), então não há tarefa de filtro novo.

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -10`
Manual: Metas mostra os grupos que não estão vazios; Calendário mostra a grade e a Agenda abaixo.

```bash
git add app/membros/metas app/membros/calendario components/membros/agenda-lista.tsx
git commit -m "feat(membros): metas agrupadas por prazo e lista de agenda no calendário" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## ETAPA 4: Gestão e `Ctrl+K`

### Task 9: Gestão com fila de pendências

**Files:**
- Modify: `app/membros/administracao/page.tsx` (reescrita)

**Interfaces:**
- Consumes: `BlocoPendencias` (Task 6), `Secao`, `PageHeader`.

- [ ] **Step 1: Reescrever `app/membros/administracao/page.tsx`**

```tsx
import type { Metadata } from "next"
import Link from "next/link"

import { BlocoPendencias } from "@/components/membros/hoje"
import { PageHeader } from "@/components/membros/page-header"
import { Secao } from "@/components/membros/secao"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Gestão | GEAR",
  robots: { index: false, follow: false },
}

const CADASTROS = [
  { href: "/membros/administracao/atas", nome: "Atas", texto: "Registro de reuniões: presentes, pauta, decisões e pendências." },
  { href: "/membros/administracao/cargos", nome: "Cargos e aprovação", texto: "Atribuir e trocar cargos e aprovar membros. Restrito a Presidente e Vice-Presidente." },
  { href: "/membros/administracao/patrimonio", nome: "Patrimônio", texto: "Inventário de robôs, componentes, ferramentas e equipamentos." },
]

export default async function GestaoPage() {
  const supabase = await createClient()
  const [aprovacoes, bloqueados] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false).not("nome_completo", "is", null),
    supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "Bloqueado"),
  ])

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-24 md:px-8">
      <PageHeader titulo="Gestão">
        Patrimônio, atas e cargos da entidade. Cargo e aprovação de membro são só de Presidente e Vice-Presidente.
      </PageHeader>

      <BlocoPendencias
        aprovacoes={aprovacoes.error ? null : (aprovacoes.count ?? 0)}
        bloqueados={bloqueados.error ? null : (bloqueados.count ?? 0)}
      />

      <Secao titulo="Cadastros">
        <ul className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          {CADASTROS.map((c) => (
            <li key={c.href} className="bg-[var(--gear-ink)]">
              <Link href={c.href} className="block h-full p-5 hover:bg-[var(--gear-navy)]">
                <span className="block font-sans text-lg">{c.nome}</span>
                <span className="mt-2 block font-sans text-sm font-light leading-relaxed text-muted-foreground">{c.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Secao>
    </section>
  )
}
```

- [ ] **Step 2: Conferir o guarda de cargo**

`administracao/layout.tsx` continua devolvendo o aviso quando `!temCargo(...)` (a Task 4 só trocou o cabeçalho). Manual: com usuário sem cargo, `/membros/administracao` mostra "Acesso restrito" e a barra não tem o grupo Gestão.

- [ ] **Step 3: Verificar e commitar**

Run: `npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -10`

```bash
git add app/membros/administracao
git commit -m "feat(membros): Gestão abre na fila de pendências, com cadastros em seguida" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Paleta `Ctrl+K`

**Files:**
- Create: `components/membros/paleta.tsx`
- Modify: `components/membros-shell.tsx` (montar a paleta)

**Interfaces:**
- Consumes: `gruposVisiveis` (Task 1). O evento `membros:paleta` já é disparado pelo botão da barra (Task 3).
- Produces: `Paleta({ comCargo }: { comCargo: boolean })`.

- [ ] **Step 1: `components/membros/paleta.tsx`**

```tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { gruposVisiveis } from "@/lib/navegacao"

type Destino = { rotulo: string; detalhe: string; href: string }

/**
 * Diálogo de navegação por teclado. Lista as telas que o usuário pode ver
 * (derivada de GRUPOS) mais alguns atalhos de criação. Abre com Ctrl+K ou
 * Cmd+K, ou pelo botão da barra (evento "membros:paleta").
 */
export function Paleta({ comCargo }: { comCargo: boolean }) {
  const router = useRouter()
  const [aberta, setAberta] = useState(false)
  const [busca, setBusca] = useState("")
  const [indice, setIndice] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const quemAbriu = useRef<HTMLElement | null>(null)

  const destinos = useMemo<Destino[]>(() => {
    const telas = gruposVisiveis(comCargo).flatMap((g) =>
      g.abas.length > 0
        ? g.abas.map((a) => ({ rotulo: a.rotulo, detalhe: g.rotulo, href: a.href }))
        : [{ rotulo: g.rotulo, detalhe: "Tela", href: g.href }],
    )
    return [
      ...telas,
      { rotulo: "Nova meta", detalhe: "Atalho", href: "/membros/metas" },
      ...(comCargo ? [{ rotulo: "Novo aviso", detalhe: "Atalho", href: "/membros/mural" }] : []),
      { rotulo: "Editar perfil", detalhe: "Conta", href: "/membros/completar-perfil" },
    ]
  }, [comCargo])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo ? destinos.filter((d) => `${d.rotulo} ${d.detalhe}`.toLowerCase().includes(termo)) : destinos
  }, [busca, destinos])

  const fechar = () => {
    setAberta(false)
    setBusca("")
    setIndice(0)
    quemAbriu.current?.focus()
  }

  useEffect(() => {
    const abrir = () => {
      quemAbriu.current = document.activeElement as HTMLElement | null
      setAberta(true)
    }
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener("keydown", tecla)
    window.addEventListener("membros:paleta", abrir)
    return () => {
      window.removeEventListener("keydown", tecla)
      window.removeEventListener("membros:paleta", abrir)
    }
  }, [])

  useEffect(() => {
    if (aberta) entrada.current?.focus()
  }, [aberta])

  if (!aberta) return null

  const ir = (d: Destino | undefined) => {
    if (!d) return
    fechar()
    router.push(d.href)
  }

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return fechar()
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndice((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndice((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      ir(filtrados[indice])
    } else if (e.key === "Tab") {
      // Foco preso: só há um campo e a lista; Tab não deve sair do diálogo.
      e.preventDefault()
    }
  }

  return (
    <div
      className="nao-imprimir fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && fechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ir para uma tela"
        onKeyDown={aoTeclar}
        className="w-full max-w-lg border border-white/15 bg-[var(--gear-ink)] shadow-2xl"
      >
        <input
          ref={entrada}
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setIndice(0)
          }}
          placeholder="Ir para…"
          aria-label="Buscar tela"
          role="combobox"
          aria-expanded="true"
          aria-controls="paleta-lista"
          aria-activedescendant={filtrados[indice] ? `paleta-${indice}` : undefined}
          className="min-h-12 w-full border-b border-white/10 bg-transparent px-4 font-sans text-base outline-none placeholder:text-muted-foreground/60"
        />
        <ul id="paleta-lista" role="listbox" className="max-h-72 overflow-y-auto py-1">
          {filtrados.length === 0 && (
            <li className="px-4 py-3 font-sans text-sm font-light text-muted-foreground">Nenhuma tela encontrada.</li>
          )}
          {filtrados.map((d, i) => (
            <li
              key={`${d.href}-${d.rotulo}`}
              id={`paleta-${i}`}
              role="option"
              aria-selected={i === indice}
              onMouseEnter={() => setIndice(i)}
              onClick={() => ir(d)}
              className={`flex min-h-11 cursor-pointer items-center justify-between px-4 font-sans text-sm ${
                i === indice ? "bg-[var(--gear-navy)] text-[var(--gear-amber)]" : "text-foreground"
              }`}
            >
              {d.rotulo}
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{d.detalhe}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Montar na casca**

Em `components/membros-shell.tsx`, importar `import { Paleta } from "@/components/membros/paleta"` e renderizar `<Paleta comCargo={comCargo} />` como último filho dentro do `<div className="nao-imprimir sticky …">` (a paleta é `fixed`, então não interfere no layout da barra).

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -10`
Manual: `Ctrl+K` abre; digitar "meta" filtra; setas movem; Enter navega e fecha; Esc fecha e devolve o foco; sem cargo, "Gestão" e "Novo aviso" não aparecem.

- [ ] **Step 4: Commit**

```bash
git add components/membros/paleta.tsx components/membros-shell.tsx
git commit -m "feat(membros): paleta Ctrl+K para ir a qualquer tela" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificação final e limpeza

**Files:**
- Modify: `docs/superpowers/specs/2026-10-21-area-de-membros-redesign-design.md`

- [ ] **Step 1: Procurar resíduos**

Run: `grep -rn "Voltar para membros\|ABAS\b\|migalha" app components lib`
Expected: nenhum resultado. Qualquer resultado: remover.

Run: `grep -rn "CustomCursor\|SmoothScroll" app/membros components/membros-shell.tsx components/membros`
Expected: só `app/membros/layout.tsx` (ramo público).

Run: `grep -rnE "—|–" app/membros components/membros components/membros-shell.tsx | grep -vE '^\S+:[0-9]+:\s*(\*|//|/\*|\{/\*)'`
Expected: nenhum texto visível com travessão (os `"—"` de células vazias de tabela em `administracao/{patrimonio,cargos}` são valor ausente e podem ficar).

- [ ] **Step 2: Suíte inteira**

Run: `npm run test:nav && npm run test:hoje && npx tsc --noEmit && npx eslint . && npx next build 2>&1 | tail -20`
Expected: `navegacao: ok`, `hoje: ok`, build verde com todas as rotas `/membros/*` listadas e `/membros/frente` presente.

- [ ] **Step 3: Roteiro manual (1440px e 390px)**

1. Sem sessão: `/membros` leva a `/entrar`.
2. Conta sem perfil: cai em `/membros/completar-perfil` com a moldura pública.
3. Conta não aprovada: `/membros/aguardando` com a moldura pública.
4. Membro aprovado sem cargo: barra com Hoje, Minha frente, Aprender, Equipe; `/membros/administracao` mostra "Acesso restrito".
5. Membro com cargo: aparece Gestão; "Pendências" aparece em Hoje e em Gestão.
6. Imprimir `/membros/metricas` (Ctrl+P): barra e paleta não saem no papel.
7. `prefers-reduced-motion` ligado: sem movimento além de fade.

- [ ] **Step 4: Registrar desvios no spec e commitar**

No spec, na seção "Verificação", acrescentar duas linhas: (a) `rotaDaFrente` fica em `lib/administracao.ts` e `lib/navegacao.ts` não importa nada; (b) o movimento de entrada é neutralizado por `MotionConfig reducedMotion="always"`, restando só o fade de opacidade.

```bash
git add docs package.json
git commit -m "docs: spec registra desvios do plano de implementação" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Cobertura do spec:** estrutura de 5 grupos e sub-abas (T1, T3); `/membros/frente` (T3); Hoje com Agora/Prazos/Avisos/Academia/Pendências e remoção de atalhos, perfil e avatares (T5, T6); Minha frente com quadro por status, "Meus/Todos" e metas agrupadas (T7, T8); Equipe com Agenda e `PageHeader` (T4, T8); Gestão com fila de pendências (T9); kit (T2); `Ctrl+K` (T10); casca sem cursor/scroll/footer (T3); acessibilidade (T3, T10); verificação por scripts e build (T1, T5, T11). O spec cita "Pessoas com filtro por frente e busca": o diretório já agrupa por frente e o plano não acrescenta busca de texto; se você quiser, é uma tarefa extra.
- **Placeholders:** nenhum "TBD". Os pontos que mandam conferir algo trazem o comando exato e o que ajustar.
- **Consistência de tipos:** `Grupo`/`Aba`/`GRUPOS`/`gruposVisiveis`/`grupoAtual`/`abaAtual`/`titulo` (T1) usados em T3 e T10 com as mesmas assinaturas; `ItemPrazo`/`prazosDaSemana`/`maisDias`/`ordenarSprints`/`agruparMetas` (T5) usados em T6 e T8; `BlocoPendencias({ aprovacoes, bloqueados })` (T6) reusado em T9 com as mesmas props; `Secao` com `className` que substitui o padrão `mt-12`, usado assim em T6, T8 e T9.
