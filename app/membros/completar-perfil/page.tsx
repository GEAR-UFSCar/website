import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CompletarPerfil } from "@/components/completar-perfil"
import { createClient } from "@/lib/supabase/server"
import { eDiretoria, temCargo } from "@/lib/administracao"

export const metadata: Metadata = {
  title: "Completar perfil | GEAR",
  robots: { index: false, follow: false },
}

export default async function CompletarPerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/entrar")

  // Pré-preenche com o que o cadastro já mandou, para não digitar de novo.
  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome_completo, curso, frente, cargo")
    .eq("id", user.id)
    .maybeSingle<{ nome_completo: string | null; curso: string | null; frente: string | null; cargo: string | null }>()

  return (
    <CompletarPerfil
      userId={user.id}
      nomeInicial={perfil?.nome_completo ?? ""}
      cursoInicial={perfil?.curso ?? ""}
      frenteInicial={perfil?.frente ?? ""}
      // Espelha guardar_cargo() (023): com cargo, a frente só muda pela
      // diretoria. Presidência escreve em todas as frentes e fica livre.
      frenteTravada={temCargo(perfil?.cargo) && !eDiretoria(perfil?.cargo)}
    />
  )
}
