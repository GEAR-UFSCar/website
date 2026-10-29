import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { Secao } from "@/components/membros/secao"
import { temCargo } from "@/lib/administracao"
import { dataDoDia, diaGear } from "@/lib/datas"
import { GRUPOS_FORMULARIO, MODELOS, modeloPorId, numeroRegistro } from "@/lib/formularios"
import { COLUNAS_REGISTRO, ROTULO_STATUS, type Registro } from "@/lib/registros"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Formulários | GEAR",
  robots: { index: false, follow: false },
}

const TOM = { rascunho: "neutro", enviado: "ativo", aprovado: "neutro", devolvido: "alerta" } as const

function Lista({ registros, vazio }: { registros: Registro[]; vazio: string }) {
  if (registros.length === 0) return <p className="font-sans text-sm font-light text-muted-foreground">{vazio}</p>
  return (
    <ul className="border border-linha">
      {registros.map((r) => (
        <li key={r.id} className="border-b border-linha last:border-b-0">
          <Link href={`/membros/formularios/${r.id}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 hover:bg-[var(--gear-navy)]">
            <span className="flex-1 font-sans text-sm">
              {r.titulo}
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {numeroRegistro(modeloPorId(r.modelo), r.ano, r.numero)}
              </span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{dataDoDia(diaGear(r.created_at))}</span>
            <Pilula tom={TOM[r.status]}>{ROTULO_STATUS[r.status]}</Pilula>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Os formulários do pacote de documentos (fichas, termos, relatórios,
 * checklists, ofícios) preenchidos no site, em vez de Word e planilha.
 */
export default async function FormulariosPage({ searchParams }: { searchParams: Promise<{ modelo?: string }> }) {
  const { user, perfil } = await exigirMembroAprovado()
  const { modelo: filtro } = await searchParams
  const comCargo = temCargo(perfil?.cargo)

  const supabase = await createClient()
  let consulta = supabase.from("registros").select(COLUNAS_REGISTRO).order("created_at", { ascending: false }).limit(100)
  if (filtro) consulta = consulta.eq("modelo", filtro)
  const { data, error } = await consulta
  const registros = (data ?? []) as Registro[]

  const meus = registros.filter((r) => r.autor_id === user.id)
  // aprovar é de outra pessoa (035): o que eu enviei não aparece na minha fila
  const aguardando = comCargo ? registros.filter((r) => r.status === "enviado" && r.autor_id !== user.id && modeloPorId(r.modelo)?.aprovacao) : []
  const outros = registros.filter((r) => r.autor_id !== user.id && r.status !== "rascunho")

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Formulários">
        Fichas, termos, relatórios e checklists dos documentos do GEAR, preenchidos aqui. A numeração é automática, quem
        aprova é sempre outra pessoa, e cada registro imprime com as linhas de assinatura.
      </PageHeader>

      {error && (
        <ErroDados titulo="FORMULÁRIOS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/035_documentacao_integrada.sql</code>.
        </ErroDados>
      )}

      {filtro && (
        <p className="mt-6 font-mono text-[11px]">
          Mostrando só: {modeloPorId(filtro)?.nome ?? filtro}.{" "}
          <Link href="/membros/formularios" className="text-[var(--gear-amber)] hover:underline">Ver todos</Link>
        </p>
      )}

      {comCargo && aguardando.length > 0 && (
        <Secao titulo={`Aguardando sua decisão (${aguardando.length})`}>
          <Lista registros={aguardando} vazio="" />
        </Secao>
      )}

      <Secao titulo="Meus registros">
        <Lista registros={meus} vazio="Você ainda não preencheu nenhum formulário." />
      </Secao>

      <Secao titulo="Novo">
        <div className="space-y-8">
          {GRUPOS_FORMULARIO.map((g) => (
            <div key={g}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{g}</h3>
              <ul className="mt-3 grid gap-px border border-linha bg-linha md:grid-cols-2">
                {MODELOS.filter((m) => m.grupo === g).map((m) => (
                  <li key={m.id} className="bg-[var(--gear-ink)]">
                    <Link href={`/membros/formularios/novo?modelo=${m.id}`} className="block h-full p-4 hover:bg-[var(--gear-navy)]">
                      <span className="block font-sans text-base">{m.nome}</span>
                      <span className="mt-1 block font-sans text-xs font-light leading-relaxed text-muted-foreground">{m.descricao}</span>
                      <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70">{m.fonte}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Registros do Grupo">
        <Lista registros={outros} vazio="Nada registrado por outras pessoas ainda." />
      </Secao>
    </section>
  )
}
