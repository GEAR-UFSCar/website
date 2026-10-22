import { Carregando } from "@/components/carregando"

/*
 * Um loading.tsx só, no topo do segmento /membros: o Next o usa em todas as
 * rotas aninhadas.
 */
export default function MembrosLoading() {
  return <Carregando />
}
