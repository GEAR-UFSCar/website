import type { Metadata } from "next"
import Link from "next/link"

import { EstadoVazio } from "@/components/membros/estado-vazio"
import { MarcarVisto } from "@/components/membros/marcar-visto"
import { PageHeader } from "@/components/membros/page-header"
import { eFinanceiro, temCargo } from "@/lib/administracao"
import { dataHora } from "@/lib/datas"
import { buscarNovidades, umMesAtras } from "@/lib/novidades"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Novidades | GEAR",
  robots: { index: false, follow: false },
}

export default async function NovidadesPage() {
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()
  const { data } = await supabase.from("perfis").select("novidades_vistas_em").eq("id", user.id).maybeSingle()
  const vistoEm = data?.novidades_vistas_em ?? ""
  const novidades = await buscarNovidades(supabase, {
    usuarioId: user.id,
    desde: umMesAtras(),
    comCargo: temCargo(perfil?.cargo),
    financeiro: eFinanceiro(perfil?.cargo),
  })

  return (
    <section className={paginaMembros}>
      <MarcarVisto usuarioId={user.id} />
      <PageHeader titulo="Novidades">
        O último mês de avisos, eventos, tarefas para você e respostas a pedidos de compra. O que chegou desde a sua
        última visita aparece marcado.
      </PageHeader>

      {novidades.length === 0 ? (
        <div className="mt-10"><EstadoVazio>Nada no último mês.</EstadoVazio></div>
      ) : (
        <ul className="mt-10 border border-linha">
          {novidades.map((n) => (
            <li key={n.chave} className="border-b border-linha last:border-b-0">
              <Link
                href={n.href}
                className={`flex flex-wrap items-baseline gap-x-4 px-5 py-3 hover:bg-[var(--gear-navy)] ${
                  n.quando > vistoEm ? "border-l-2 border-[var(--gear-amber)]" : "opacity-70"
                }`}
              >
                {n.quando > vistoEm && <span className="sr-only">Nova:</span>}
                <span className="w-40 shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--gear-amber)]">{n.tipo}</span>
                <span className="flex-1 font-sans text-sm">{n.titulo}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{dataHora(n.quando)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
