import { createClient as criarClienteSupabase } from "@supabase/supabase-js"

/**
 * Cliente Supabase SEM cookies, para ler dado público no servidor.
 *
 * O cliente de lib/supabase/server.ts chama `cookies()`, e qualquer página que
 * o use deixa de ser estática — o Next passa a renderizar por requisição para
 * poder ler a sessão. Isso é o certo na área de membros e é desperdício em
 * /sobre, que mostra a mesma vitrine de números para todo mundo.
 *
 * Sem sessão, este cliente é o papel `anon` puro. Ele só alcança o que a RLS
 * abre para anônimo — hoje, a view `metricas_publicas` (019). Não serve para
 * nada que dependa de quem está olhando.
 */
export function createClientePublico() {
  return criarClienteSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
