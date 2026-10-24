/**
 * Teste das regras de segurança que vivem em código, não no banco: o atributo
 * `Secure` do cookie de sessão, a CSP presa ao host do projeto Supabase e os
 * cabeçalhos do next.config. (O banco é o `npm run test:banco`.)
 *
 * Não sobe servidor e não usa rede: importa as funções e confere a saída. O
 * que ele NÃO prova é o navegador aceitando a política — para isso, abrir o
 * site publicado com o console aberto depois de cada mudança em lib/csp.mjs.
 */

import assert from "node:assert/strict"

import { MAX_AGE_LEMBRAR, validadeDaSessao } from "../lib/supabase/lembrar.ts"
import { ROTAS_COM_NONCE, origemSupabase, politicaCsp } from "../lib/csp.mjs"
import nextConfig from "../next.config.mjs"

let verificacoes = 0
const ok = (cond, msg) => {
  verificacoes++
  assert.ok(cond, msg)
}

// --- cookie de sessão ---------------------------------------------------------
const doSupabase = { path: "/", sameSite: "lax", httpOnly: false, maxAge: 34560000 }

const lembrado = validadeDaSessao(doSupabase, true, true)
assert.equal(lembrado.secure, true, "produção: Secure ligado")
assert.equal(lembrado.maxAge, MAX_AGE_LEMBRAR, "lembrar: 30 dias")
assert.equal(lembrado.expires, undefined)
assert.equal(lembrado.path, "/")
assert.equal(lembrado.sameSite, "lax")
verificacoes += 5

const deSessao = validadeDaSessao(doSupabase, false, true)
assert.equal(deSessao.secure, true, "produção, sem lembrar: Secure ligado")
assert.equal(deSessao.maxAge, undefined, "sem lembrar: cookie de sessão")
verificacoes += 2

// Remoção (maxAge 0) continua remoção, e sai com os mesmos atributos da gravação.
const remocao = validadeDaSessao({ path: "/", maxAge: 0 }, true, true)
assert.equal(remocao.maxAge, 0, "remoção não vira 'guarde por 30 dias'")
assert.equal(remocao.secure, true)
verificacoes += 2

// Fora de produção a lib manda: next dev em http://localhost não pode quebrar.
assert.notEqual(validadeDaSessao(doSupabase, true, false).secure, true, "dev: não força Secure")
// …mas não tira um Secure que a lib já tenha pedido.
assert.equal(validadeDaSessao({ ...doSupabase, secure: true }, true, false).secure, true)
verificacoes += 2

// Não muta a entrada.
const entrada = { path: "/", maxAge: 100 }
validadeDaSessao(entrada, true, true)
assert.deepEqual(entrada, { path: "/", maxAge: 100 })
verificacoes++

// --- CSP presa ao host ----------------------------------------------------------
const URL_ORIGINAL = process.env.NEXT_PUBLIC_SUPABASE_URL
const diretiva = (politica, nome) =>
  politica.split("; ").find((d) => d.startsWith(`${nome} `)) ?? ""
const comUrl = (url, fn) => {
  if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = url
  try {
    return fn()
  } finally {
    if (URL_ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = URL_ORIGINAL
  }
}

// origemSupabase
assert.deepEqual(origemSupabase("https://abc.supabase.co"), { http: "https://abc.supabase.co", ws: "wss://abc.supabase.co" })
assert.deepEqual(origemSupabase("https://abc.supabase.co/rest/v1/?x=1"), { http: "https://abc.supabase.co", ws: "wss://abc.supabase.co" }, "só a origem, sem caminho")
assert.deepEqual(origemSupabase("http://127.0.0.1:54321"), { http: "http://127.0.0.1:54321", ws: "ws://127.0.0.1:54321" })
for (const ruim of [undefined, "", "isso não é url", "ftp://abc.supabase.co", "javascript:alert(1)"]) {
  assert.equal(origemSupabase(ruim), null, `inválida: ${String(ruim)}`)
}
verificacoes += 8

// política com a URL do projeto: o host exato, nunca o curinga
const fixa = comUrl("https://abc.supabase.co", () => politicaCsp())
assert.match(diretiva(fixa, "connect-src"), /https:\/\/abc\.supabase\.co wss:\/\/abc\.supabase\.co/)
assert.match(diretiva(fixa, "img-src"), /https:\/\/abc\.supabase\.co/)
for (const d of ["connect-src", "img-src"]) {
  ok(!diretiva(fixa, d).includes("*.supabase.co"), `${d} sem curinga quando a URL é conhecida`)
}
// o projeto de outra pessoa na Supabase NÃO está liberado
ok(!fixa.includes("outro.supabase.co"), "outro projeto não liberado")

// sem URL (build de CI) ou com valor ruim: volta ao curinga em vez de quebrar
for (const url of [undefined, "isso não é url"]) {
  const larga = comUrl(url, () => politicaCsp())
  ok(diretiva(larga, "connect-src").includes("https://*.supabase.co wss://*.supabase.co"), `fallback para ${String(url)}`)
  ok(diretiva(larga, "img-src").includes("https://*.supabase.co"))
}

// as duas políticas continuam sendo duas
const publica = comUrl("https://abc.supabase.co", () => politicaCsp())
const estrita = comUrl("https://abc.supabase.co", () => politicaCsp({ nonce: "Zm9v" }))
ok(diretiva(publica, "script-src").includes("'unsafe-inline'"), "site público: unsafe-inline")
ok(!diretiva(estrita, "script-src").includes("'unsafe-inline'"), "membros: sem unsafe-inline")
ok(diretiva(estrita, "script-src").includes("'nonce-Zm9v'") && diretiva(estrita, "script-src").includes("'strict-dynamic'"), "membros: nonce + strict-dynamic")
for (const p of [publica, estrita]) {
  ok(p.includes("frame-ancestors 'none'") && p.includes("object-src 'none'") && p.includes("base-uri 'self'"))
}
assert.equal(ROTAS_COM_NONCE, "/membros")
verificacoes++

// --- cabeçalhos do next.config ----------------------------------------------------
assert.equal(nextConfig.poweredByHeader, false, "X-Powered-By desligado")
verificacoes++

const regras = await nextConfig.headers()
const cabecalhos = Object.fromEntries(
  regras.find((r) => r.source === "/:caminho*").headers.map((h) => [h.key, h.value]),
)
assert.equal(cabecalhos["Cross-Origin-Opener-Policy"], "same-origin")
assert.equal(cabecalhos["Cross-Origin-Resource-Policy"], "same-site")
for (const chave of ["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"]) {
  ok(cabecalhos[chave], `${chave} continua presente`)
}
verificacoes += 2

// A CSP estática vale para tudo MENOS /membros (que recebe a do proxy, com nonce):
// mandar as duas faria o navegador aplicar a interseção.
const regraCsp = regras.find((r) => r.headers.some((h) => h.key === "Content-Security-Policy"))
const alcance = new RegExp(`^${regraCsp.source}$`)
for (const caminho of ["/", "/sobre", "/documentos", "/documentos/GEAR-001", "/membrosfalso"]) {
  ok(alcance.test(caminho), `${caminho} recebe a CSP estática`)
}
for (const caminho of ["/membros", "/membros/", "/membros/calendario", "/membros/administracao/cargos"]) {
  ok(!alcance.test(caminho), `${caminho} fica de fora (recebe a do proxy)`)
}

console.log(`seguranca: ${verificacoes} verificações ok`)
