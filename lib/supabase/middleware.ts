import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Só tenta falar com o Supabase se as credenciais existirem. */
export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

/**
 * Renova a sessão do usuário a cada request e repassa os cookies atualizados
 * para o browser. Padrão oficial do @supabase/ssr para o App Router.
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: nada de lógica entre createServerClient e getUser(). Qualquer
  // coisa aqui no meio pode fazer a sessão expirar de forma imprevisível.
  await supabase.auth.getUser()

  return supabaseResponse
}
