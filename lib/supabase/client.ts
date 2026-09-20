import { createBrowserClient, type CookieOptions } from "@supabase/ssr"

import { COOKIE_LEMBRAR, MAX_AGE_LEMBRAR, querLembrar, validadeDaSessao } from "@/lib/supabase/lembrar"

const noNavegador = () => typeof document !== "undefined"

/*
 * Leitura e escrita de document.cookie, iguais ao fallback interno da lib
 * (dist/main/cookies.js): valor passa por encode/decodeURIComponent, nome vai
 * cru. Reimplementamos porque assumir os métodos é o único jeito de decidir a
 * validade do cookie — ver lib/supabase/lembrar.ts.
 */

function decodificar(valor: string) {
  try {
    return decodeURIComponent(valor)
  } catch {
    return valor
  }
}

function lerCookies() {
  return document.cookie
    .split(";")
    .map((par) => par.trim())
    .filter(Boolean)
    .map((par) => {
      const corte = par.indexOf("=")
      if (corte < 0) return { name: par, value: "" }
      return { name: par.slice(0, corte), value: decodificar(par.slice(corte + 1)) }
    })
}

function escreverCookie(name: string, value: string, options: CookieOptions) {
  let cookie = `${name}=${encodeURIComponent(value)}`

  cookie += `; Path=${options.path ?? "/"}`
  if (options.domain) cookie += `; Domain=${options.domain}`
  // Sem Max-Age nem Expires o cookie é de sessão — é assim que o "lembrar
  // desligado" some quando a pessoa fecha o navegador.
  if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.floor(options.maxAge)}`
  if (options.sameSite) {
    const valor = options.sameSite === true ? "Strict" : String(options.sameSite)
    cookie += `; SameSite=${valor.charAt(0).toUpperCase()}${valor.slice(1)}`
  }
  if (options.secure) cookie += "; Secure"

  document.cookie = cookie
}

/** Grava a escolha do "Lembrar de mim". Chamar ANTES de criar a sessão. */
export function definirPreferenciaLembrar(lembrar: boolean) {
  if (!noNavegador()) return

  /*
   * A ordem importa: o marcador precisa existir antes do signInWithPassword,
   * porque é ele que o setAll abaixo consulta ao gravar os cookies de auth.
   * Escrito depois, o primeiro par de cookies ainda sairia com a validade
   * errada.
   *
   * Quando a escolha é "não lembrar", o próprio marcador é cookie de sessão:
   * some junto com o resto, e a ausência dele já significa "não lembrar".
   */
  escreverCookie(COOKIE_LEMBRAR, lembrar ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    maxAge: lembrar ? MAX_AGE_LEMBRAR : undefined,
    secure: window.location.protocol === "https:",
  })
}

function preferenciaAtual() {
  if (!noNavegador()) return false
  return querLembrar(lerCookies().find(({ name }) => name === COOKIE_LEMBRAR)?.value)
}

/** Cliente Supabase para Client Components (roda no navegador). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Client Component também renderiza no servidor, onde não há
          // document. Lá a sessão vem do cliente de server.ts, não daqui.
          return noNavegador() ? lerCookies() : []
        },
        setAll(cookiesParaGravar) {
          if (!noNavegador()) return
          const lembrar = preferenciaAtual()
          cookiesParaGravar.forEach(({ name, value, options }) =>
            escreverCookie(name, value, validadeDaSessao(options, lembrar)),
          )
        },
      },
    },
  )
}
