import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { COOKIE_LEMBRAR, querLembrar, validadeDaSessao } from "@/lib/supabase/lembrar"

/** Prefixos que exigem sessão. /membros/completar-perfil está incluído. */
const AREA_RESTRITA = "/membros"

/** Só tenta falar com o Supabase se as credenciais existirem. */
export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

/**
 * Renova a sessão do usuário a cada request e repassa os cookies atualizados
 * para o browser. Padrão oficial do @supabase/ssr para o App Router, chamado
 * do `proxy.ts` na raiz (o antigo `middleware.ts`).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Sem credenciais o site segue funcionando normalmente, apenas sem sessão.
  if (!supabaseConfigurado) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          /*
           * Aqui é onde o "Lembrar de mim" mais importa: este proxy renova a
           * sessão a cada request, e é ele que regravaria os cookies com os
           * 400 dias padrão do @supabase/ssr, promovendo a cookie persistente
           * a sessão que devia morrer ao fechar o navegador.
           * Ver lib/supabase/lembrar.ts.
           */
          const lembrar = querLembrar(request.cookies.get(COOKIE_LEMBRAR)?.value)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, validadeDaSessao(options, lembrar)),
          )
        },
      },
    },
  )

  // IMPORTANTE: nada de lógica entre createServerClient e getUser(). Qualquer
  // coisa aqui no meio pode fazer a sessão expirar de forma imprevisível.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  /*
   * Porta de entrada da área de membros, aqui e não só nas páginas.
   *
   * Desde que app/membros/loading.tsx passou a existir, o segmento ganhou um
   * limite de Suspense: o Next começa a TRANSMITIR a resposta com 200 antes de
   * a página rodar, e o redirect() de dentro dela deixa de virar 307 — sai
   * como instrução no meio do stream, executada no cliente. Quem não tem
   * sessão via o esqueleto piscar antes de ir para o login, e curl/robô
   * recebia 200.
   *
   * Isto é checagem otimista, como a própria documentação do Next recomenda
   * para proxy: a barreira real continua sendo exigirUsuario() na página e a
   * RLS no banco. O ganho é devolver o 307 antes de qualquer stream.
   */
  if (!user && request.nextUrl.pathname.startsWith(AREA_RESTRITA)) {
    const login = request.nextUrl.clone()
    login.pathname = "/entrar"
    return NextResponse.redirect(login)
  }

  return supabaseResponse
}
