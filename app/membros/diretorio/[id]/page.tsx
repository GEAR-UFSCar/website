import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { Secao } from "@/components/membros/secao"
import { hrefDoSprint, temCargo } from "@/lib/administracao"
import { dataDoDia } from "@/lib/datas"
import { formatarHoras, somarHoras } from "@/lib/horas"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Pessoa | GEAR",
  robots: { index: false, follow: false },
}

const vazio = "font-sans text-sm font-light text-muted-foreground"
const linha = "flex flex-wrap items-baseline gap-x-3 border-b border-linha px-5 py-3 last:border-b-0"

/**
 * Perfil de um membro: quem é, no que está trabalhando e o que está com ele.
 * Formação e horas só aparecem para a própria pessoa e para quem tem cargo,
 * porque é o que a RLS deixa ler (031, 033); para os outros a seção some em
 * vez de mostrar um zero que não é verdade.
 */
export default async function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil: eu } = await exigirMembroAprovado()
  const supabase = await createClient()

  const { data: pessoa } = await supabase
    .from("perfis")
    .select("id, nome_completo, curso, frente, cargo, bio, whatsapp, github, linkedin, aprovado")
    .eq("id", id)
    .maybeSingle()
  if (!pessoa?.aprovado) notFound()

  const vePrivado = id === user.id || temCargo(eu?.cargo)

  const [sprints, tarefas, itens, modulos, progresso, chamadas, lancadas] = await Promise.all([
    supabase.from("sprints").select("id, titulo, status, frente").eq("responsavel_id", id).neq("status", "Concluído"),
    supabase
      .from("sprint_tarefas")
      .select("id, titulo, prazo, sprint:sprints(id, titulo, frente)")
      .eq("responsavel_id", id)
      .eq("feita", false),
    supabase.from("patrimonio").select("id, codigo, item").eq("emprestado_para", id),
    supabase.from("modulos").select("id", { count: "exact", head: true }),
    vePrivado ? supabase.from("progresso").select("modulo_id").eq("usuario_id", id).not("concluido_em", "is", null) : null,
    vePrivado ? supabase.from("eventos_chamada").select("horas").eq("usuario_id", id) : null,
    vePrivado ? supabase.from("horas_lancadas").select("horas").eq("usuario_id", id) : null,
  ])

  const listaTarefas = (tarefas.data ?? []) as unknown as {
    id: string
    titulo: string
    prazo: string | null
    sprint: { id: string; titulo: string; frente: string } | null
  }[]
  const horas = somarHoras([...(chamadas?.data ?? []), ...(lancadas?.data ?? [])])

  const links = [
    pessoa.whatsapp && { rotulo: "WhatsApp", href: `https://wa.me/${pessoa.whatsapp.length <= 11 ? `55${pessoa.whatsapp}` : pessoa.whatsapp}` },
    pessoa.github && { rotulo: "GitHub", href: `https://github.com/${pessoa.github}` },
    pessoa.linkedin?.startsWith("https://") && { rotulo: "LinkedIn", href: pessoa.linkedin },
  ].filter((l): l is { rotulo: string; href: string } => Boolean(l))

  return (
    <section className={paginaMembros}>
      <Link href="/membros/diretorio" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        ← Pessoas
      </Link>
      <PageHeader titulo={pessoa.nome_completo ?? "Sem nome"}>
        {[pessoa.curso, pessoa.frente ? `Frente ${pessoa.frente}` : "Frente a definir"].filter(Boolean).join(" · ")}
      </PageHeader>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {temCargo(pessoa.cargo) && <Pilula tom="ativo">{pessoa.cargo}</Pilula>}
        {links.map((l) => (
          <a key={l.rotulo} href={l.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)] hover:underline">
            {l.rotulo} ↗
          </a>
        ))}
        {id === user.id && (
          <Link href="/membros/completar-perfil" className="inline-flex min-h-11 items-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
            Editar meu perfil
          </Link>
        )}
      </div>

      {pessoa.bio && <p className="mt-6 max-w-[62ch] font-sans text-base font-light leading-relaxed">{pessoa.bio}</p>}

      {vePrivado && (
        <div className="mt-10 grid grid-cols-2 gap-px border border-linha bg-linha">
          <div className="bg-[var(--gear-ink)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Formação</p>
            <p className="mt-2 font-sans text-3xl font-light tabular-nums">
              {progresso?.data?.length ?? 0}/{modulos.count ?? 0}
            </p>
          </div>
          <div className="bg-[var(--gear-ink)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Horas de extensão</p>
            <p className="mt-2 font-sans text-3xl font-light tabular-nums">{formatarHoras(horas)}</p>
          </div>
        </div>
      )}

      <Secao titulo="Sprints sob responsabilidade">
        {(sprints.data ?? []).length === 0 ? (
          <p className={vazio}>Nenhum sprint aberto.</p>
        ) : (
          <ul className="border border-linha">
            {(sprints.data ?? []).map((s) => (
              <li key={s.id} className={linha}>
                <Link href={hrefDoSprint(s.frente, s.id)} className="flex-1 font-sans text-sm hover:text-[var(--gear-amber)]">{s.titulo}</Link>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Tarefas abertas">
        {listaTarefas.length === 0 ? (
          <p className={vazio}>Nenhuma tarefa aberta.</p>
        ) : (
          <ul className="border border-linha">
            {listaTarefas.map((t) => (
              <li key={t.id} className={linha}>
                <span className="flex-1 font-sans text-sm">{t.titulo}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t.sprint?.titulo}{t.prazo && ` · ${dataDoDia(t.prazo)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Itens com a pessoa">
        {(itens.data ?? []).length === 0 ? (
          <p className={vazio}>Nenhum item do inventário.</p>
        ) : (
          <ul className="border border-linha">
            {(itens.data ?? []).map((i) => (
              <li key={i.id} className={linha}>
                <span className="font-mono text-[11px] text-[var(--gear-amber)]">{i.codigo}</span>
                <span className="flex-1 font-sans text-sm">{i.item}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </section>
  )
}
