"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"

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
    if (!CONFIGURADO) return

    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => setLogado(Boolean(data.user)))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      setLogado(Boolean(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Link href={logado ? "/membros" : "/entrar"} onClick={onNavigate} className={className}>
      {logado ? "MEMBROS" : "ENTRAR"}
    </Link>
  )
}
