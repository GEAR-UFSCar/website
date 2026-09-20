import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { COOKIE_LEMBRAR, querLembrar, validadeDaSessao } from "@/lib/supabase/lembrar"

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Precisa ser criado a cada request — não dá para guardar em uma variável
 * global, porque os cookies mudam de usuário para usuário.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Respeita o "Lembrar de mim" (lib/supabase/lembrar.ts): sem isto,
          // um refresh de token vindo de Server Action ou Route Handler
          // regravaria a sessão com os 400 dias padrão da lib.
          const lembrar = querLembrar(cookieStore.get(COOKIE_LEMBRAR)?.value)
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, validadeDaSessao(options, lembrar)),
            )
          } catch {
            // Server Components não podem escrever cookies. Ignorar é seguro
            // porque o middleware já renova a sessão a cada request.
          }
        },
      },
    },
  )
}
