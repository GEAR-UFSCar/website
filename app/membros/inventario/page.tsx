import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { InventarioLista } from "@/components/inventario-lista"
import { PageHeader } from "@/components/membros/page-header"
import { temCargo } from "@/lib/administracao"
import { COLUNAS_ITEM, compararCodigo, type ItemInventario } from "@/lib/inventario"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Inventário | GEAR",
  robots: { index: false, follow: false },
}

/**
 * O inventário visto por qualquer membro: o que existe, onde está e com quem.
 * Cadastrar fica em Gestão › Patrimônio; aqui se retira e devolve (032).
 */
export default async function InventarioPage() {
  const { user, perfil } = await exigirMembroAprovado()

  const supabase = await createClient()
  const { data, error } = await supabase.from("patrimonio").select(COLUNAS_ITEM)

  const itens = ((data ?? []) as unknown as ItemInventario[])
    .map((i) => ({ ...i, valor_estimado: i.valor_estimado === null ? null : Number(i.valor_estimado) }))
    .sort((a, b) => compararCodigo(a.codigo, b.codigo))
  const origens = [...new Set(itens.map((i) => i.origem).filter((o): o is string => Boolean(o)))].sort()
  const comigo = itens.filter((i) => i.emprestado_para === user.id)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Inventário">
        O que o GEAR tem, onde está e com quem. Precisa de uma peça? Abra o item e clique em Retirar; ao
        terminar, Devolver. O empréstimo é do item inteiro, então para kits combine antes com quem cuida do
        patrimônio.
        {comigo.length > 0 && ` Com você agora: ${comigo.map((i) => i.codigo).join(", ")}.`}
      </PageHeader>

      {error ? (
        <ErroDados titulo="INVENTÁRIO INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
          Se o erro fala em <code>emprestado_para</code>, ou se a lista vem vazia para quem não tem cargo,
          falta rodar <code>supabase/032_emprestimos_e_contato.sql</code>.
        </ErroDados>
      ) : (
        <InventarioLista itens={itens} origens={origens} usuarioId={user.id} gerencia={temCargo(perfil?.cargo)} />
      )}
    </section>
  )
}
