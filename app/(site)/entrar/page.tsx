import type { Metadata } from "next"

import { Entrar } from "@/components/entrar"

export const metadata: Metadata = {
  title: "Entrar | GEAR",
  description: "Acesso à área de membros do GEAR — UFSCar Sorocaba.",
  robots: { index: false, follow: true },
}

export default function EntrarPage() {
  return <Entrar />
}
