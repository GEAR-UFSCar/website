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
  /*
   * Sem as variáveis, null — e quem chama esconde a seção. Antes os `!` faziam
   * o createClient lançar "supabaseUrl is required" durante o build, e uma
   * variável faltando num projeto da Vercel derrubava o site INTEIRO por
   * causa de uma vitrine de números no /sobre.
   */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !chave) return null

  return criarClienteSupabase(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
