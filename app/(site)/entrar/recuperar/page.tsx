import type { Metadata } from "next"

import { RecuperarSenha } from "@/components/recuperar-senha"

export const metadata: Metadata = {
  title: "Recuperar senha | GEAR",
  robots: { index: false, follow: false },
}

export default async function RecuperarPage({
  searchParams,
}: {
  // No Next 16 searchParams é Promise; sem o await o valor vem como objeto
  // pendente e a comparação abaixo seria sempre falsa.
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams

  return <RecuperarSenha expirado={estado === "expirado"} />
}
