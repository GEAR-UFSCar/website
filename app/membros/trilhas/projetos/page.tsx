import type { Metadata } from "next"

import { TrilhaPainel } from "@/components/trilha-painel"

export const metadata: Metadata = {
  title: "Trilha Projetos | GEAR",
  robots: { index: false, follow: false },
}

/** Trilha fixa da rota — não depende do perfil de quem está vendo. */
export default function TrilhaProjetosPage() {
  return <TrilhaPainel trilha="Projetos" />
}
