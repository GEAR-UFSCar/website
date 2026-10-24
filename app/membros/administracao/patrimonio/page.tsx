import type { Metadata } from "next"

import { ErroDados } from "@/components/erro-dados"
import { InventarioLista } from "@/components/inventario-lista"
import { PageHeader } from "@/components/membros/page-header"
import { Recolhivel } from "@/components/membros/recolhivel"
import { PatrimonioForm } from "@/components/patrimonio-form"
import { COLUNAS_ITEM, compararCodigo, resumir, type ItemInventario } from "@/lib/inventario"
import { createClient } from "@/lib/supabase/server"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Patrimônio | GEAR",
  robots: { index: false, follow: false },
}

const numero = new Intl.NumberFormat("pt-BR")

export default async function PatrimonioPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("patrimonio").select(COLUNAS_ITEM)

  /*
   * Ordena aqui, e não no SELECT: "GEAR-1000" vem antes de "GEAR-999" na ordem
   * de texto do banco. O PostgREST devolve `numeric` como número, mas o Number()
   * garante o tipo se um dia vier como string.
   */
  const itens = ((data ?? []) as unknown as ItemInventario[])
    .map((i) => ({ ...i, valor_estimado: i.valor_estimado === null ? null : Number(i.valor_estimado) }))
    .sort((a, b) => compararCodigo(a.codigo, b.codigo))

  const resumo = resumir(itens)
  const origens = [...new Set(itens.map((i) => i.origem).filter((o): o is string => Boolean(o)))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  )

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Patrimônio">
        {numero.format(resumo.itens)} {resumo.itens === 1 ? "item" : "itens"}, {numero.format(resumo.unidades)}{" "}
        unidades. A quantidade conta as peças dentro dos kits (um kit com 650 capacitores vale 650), então
        “unidades” não é o número de objetos que cabem numa bancada.
        {resumo.semEstado > 0 &&
          ` ${resumo.semEstado} ${resumo.semEstado === 1 ? "item está" : "itens estão"} sem o estado de conservação preenchido.`}
      </PageHeader>

      {error ? (
        <ErroDados titulo="INVENTÁRIO INDISPONÍVEL" erro={error} className="mt-10 max-w-2xl">
          Se o erro fala em coluna que não existe (<code>codigo</code>, <code>frente_vinculada</code>), falta
          rodar <code>supabase/029_inventario.sql</code>.
        </ErroDados>
      ) : (
        <>
          <Recolhivel rotulo="Novo item" aberto={itens.length === 0} className="max-w-4xl">
            <PatrimonioForm origens={origens} />
          </Recolhivel>

          <InventarioLista itens={itens} origens={origens} />
        </>
      )}
    </section>
  )
}
