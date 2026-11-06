import type { Metadata } from "next"

import { Entrar } from "@/components/entrar"

export const metadata: Metadata = {
  title: "Entrar | GEAR",
  description: "Acesso à área de membros do GEAR, UFSCar Sorocaba.",
  robots: { index: false, follow: true },
}

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const { modo } = await searchParams
  return <Entrar modoInicial={modo === "criar" ? "criar" : "entrar"} />
}
