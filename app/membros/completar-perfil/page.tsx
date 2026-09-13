import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { CompletarPerfil } from "@/components/completar-perfil"
import { createClient } from "@/lib/supabase/server"

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
    .select("nome_completo, curso, frente")
    .eq("id", user.id)
    .maybeSingle<{ nome_completo: string | null; curso: string | null; frente: string | null }>()

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <CompletarPerfil
          userId={user.id}
          nomeInicial={perfil?.nome_completo ?? ""}
          cursoInicial={perfil?.curso ?? ""}
          frenteInicial={perfil?.frente ?? ""}
        />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
