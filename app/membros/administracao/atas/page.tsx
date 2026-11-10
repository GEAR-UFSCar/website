import { redirect } from "next/navigation"

/** As atas saíram da Gestão: todo membro lê (038). O endereço antigo continua valendo. */
export default function AtasAntigas() {
  redirect("/membros/atas")
}
