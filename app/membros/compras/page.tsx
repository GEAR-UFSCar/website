import { redirect } from "next/navigation"

/** Compras virou Gastos (044); o endereço antigo continua funcionando. */
export default function ComprasPage() {
  redirect("/membros/gastos")
}
