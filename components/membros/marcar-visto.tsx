"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

/**
 * Marca as novidades como vistas ao abrir a página. No navegador e não no
 * servidor: o prefetch de um <Link> renderiza a página no servidor sem a
 * pessoa ter entrado nela, e zeraria o contador à toa.
 *
 * O refresh fica para a saída: o layout (onde está o sino) não re-renderiza
 * numa navegação comum, e recarregar na entrada tiraria o destaque do que é
 * novo antes de a pessoa ler.
 */
export function MarcarVisto({ usuarioId }: { usuarioId: string }) {
  const router = useRouter()
  useEffect(() => {
    void createClient()
      .from("perfis")
      .update({ novidades_vistas_em: new Date().toISOString() })
      .eq("id", usuarioId)
      .then(() => undefined)
    return () => router.refresh()
  }, [usuarioId, router])
  return null
}
