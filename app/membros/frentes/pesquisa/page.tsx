import type { Metadata } from "next"

import { FrentePainel } from "@/components/frente-painel"

export const metadata: Metadata = {
  title: "Frente Pesquisa | GEAR",
  robots: { index: false, follow: false },
}

/** Frente fixa da rota — não depende do perfil de quem está vendo. */
export default function FrentePesquisaPage() {
  return <FrentePainel frente="Pesquisa" />
}
