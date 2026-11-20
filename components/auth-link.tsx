"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const CONFIGURADO = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

/**
 * Alterna entre "Entrar" e "Membros" conforme a sessão, sem recarregar a
 * página: `onAuthStateChange` reage a login, logout e renovação de token,
 * inclusive vindos de outra aba.
 */
export function AuthLink({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [logado, setLogado] = useState(false)

  useEffect(() => {
    /*
     * O supabase-js (~70 KB br, com GoTrue e Realtime) só desce para quem tem
     * cookie de sessão (`sb-<ref>-auth-token`, legível por JS no @supabase/ssr).
     * Visitante anônimo — quase todo o tráfego do site público — não baixa nada.
     * Custo aceito: logar em OUTRA aba não troca este link até recarregar.
     */
    if (!CONFIGURADO || !/(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie)) return

    let cancelado = false
    let sair = () => {}

    import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelado) return
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => !cancelado && setLogado(Boolean(data.user)))
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_evento, session) => setLogado(Boolean(session?.user)))
      sair = () => subscription.unsubscribe()
    })

    return () => {
      cancelado = true
      sair()
    }
  }, [])

  return (
    <Link href={logado ? "/membros" : "/entrar"} onClick={onNavigate} className={className}>
      {logado ? "MEMBROS" : "ENTRAR"}
    </Link>
  )
}
