import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

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
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components não podem escrever cookies. Ignorar é seguro
            // porque o middleware já renova a sessão a cada request.
          }
        },
      },
    },
  )
}
