import { cache } from "react"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

export type Perfil = {
  id: string
  nome_completo: string | null
  curso: string | null
  frente: string | null
  cargo: string | null
  created_at: string
}

/*
 * Layout e página são renderizados no mesmo request, e ambos precisam do
 * usuário e do perfil. Sem `cache()` cada um refazia a chamada — em
 * /membros/administracao/cargos eram três getUser() e três selects por
 * carregamento. `cache()` memoiza por request: a segunda chamada devolve o
 * resultado da primeira, sem ida à rede.
 */

export const getUsuario = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/** Usuário obrigatório: sem sessão, vai para o login. */
export const exigirUsuario = cache(async (): Promise<User> => {
  const user = await getUsuario()
  if (!user) redirect("/entrar")
  return user
})

/**
 * Perfil de quem está logado. Devolve `erro` em vez de lançar porque as
 * telas distinguem "tabela ainda não criada" de "perfil não preenchido".
 */
export const getPerfil = cache(async (): Promise<{ perfil: Perfil | null; erro: string | null }> => {
  const user = await getUsuario()
  if (!user) return { perfil: null, erro: null }

  const supabase = await createClient()
  // A RLS já limita ao próprio usuário; o eq() deixa a intenção explícita.
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome_completo, curso, frente, cargo, created_at")
    .eq("id", user.id)
    .maybeSingle<Perfil>()

  return { perfil: data ?? null, erro: error?.message ?? null }
})

/**
 * Portão comum das áreas de membro: exige sessão e perfil preenchido.
 * Se a consulta falhou (tabela ausente), não redireciona — quem chamou
 * mostra o aviso explicando o que rodar, em vez de mandar a pessoa para um
 * formulário que também não teria onde gravar.
 */
export const exigirPerfilCompleto = cache(async (): Promise<{ user: User; perfil: Perfil | null }> => {
  const user = await exigirUsuario()
  const { perfil, erro } = await getPerfil()

  if (!erro && !perfil?.nome_completo?.trim()) {
    redirect("/membros/completar-perfil")
  }

  return { user, perfil }
})
