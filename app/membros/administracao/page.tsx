import type { Metadata } from "next"
import Link from "next/link"

import { BlocoPendencias } from "@/components/membros/hoje"
import { PageHeader } from "@/components/membros/page-header"
import { Secao } from "@/components/membros/secao"
import { createClient } from "@/lib/supabase/server"
import { paginaMembros } from "@/lib/ui"
import { dataDoDia, hojeISO } from "@/lib/datas"

export const metadata: Metadata = {
  title: "Gestão | GEAR",
  robots: { index: false, follow: false },
}

const CADASTROS = [
  { href: "/membros/administracao/atas", nome: "Atas", texto: "Registro de reuniões: presentes, pauta, decisões e pendências." },
  { href: "/membros/administracao/cargos", nome: "Cargos e aprovação", texto: "Atribuir e trocar cargos e aprovar membros. Restrito a Presidente e Vice-Presidente." },
  { href: "/membros/administracao/patrimonio", nome: "Patrimônio", texto: "Inventário de robôs, componentes, ferramentas e equipamentos." },
  { href: "/membros/administracao/horas", nome: "Horas e presença", texto: "Chamada de reuniões e eventos e horas avulsas, que viram a declaração de cada membro." },
  { href: "/membros/administracao/selecao", nome: "Processo seletivo", texto: "Candidatos em cada etapa, motivação e notas da banca." },
  { href: "/membros/administracao/caixa", nome: "Caixa", texto: "Saldo, entradas e saídas e os pedidos de compra dos membros." },
  { href: "/membros/administracao/atividade", nome: "Atividade", texto: "Último sinal de cada membro e tarefas atrasadas: quem está parado." },
]

export default async function GestaoPage() {
  const supabase = await createClient()
  const [aprovacoes, bloqueados, membros, modulos, progresso, abertos] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false).not("nome_completo", "is", null),
    supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "Bloqueado"),
    supabase.from("perfis").select("id, nome_completo, frente").eq("aprovado", true).order("nome_completo"),
    supabase.from("modulos").select("id", { count: "exact", head: true }),
    // a 031 abre a leitura de todos para quem tem cargo; sem ela só viria o próprio
    supabase.from("progresso").select("usuario_id").not("concluido_em", "is", null),
    // 033: o que está fora agora, atrasado primeiro
    supabase
      .from("emprestimos")
      .select("id, retirado_em, prazo, item:patrimonio(codigo, item), pessoa:perfis(nome_completo)")
      .is("devolvido_em", null)
      .order("prazo", { nullsFirst: false }),
  ])
  const hoje = hojeISO()
  const foraAgora = (abertos.data ?? []) as unknown as {
    id: string
    retirado_em: string
    prazo: string | null
    item: { codigo: string; item: string } | null
    pessoa: { nome_completo: string | null } | null
  }[]

  const totalModulos = modulos.count ?? 0
  const feitosPor = new Map<string, number>()
  for (const p of progresso.data ?? []) feitosPor.set(p.usuario_id, (feitosPor.get(p.usuario_id) ?? 0) + 1)
  // quem está mais atrás aparece primeiro: é para isso que a lista existe
  const formacao = (membros.data ?? [])
    .map((m) => ({ ...m, feitos: feitosPor.get(m.id) ?? 0 }))
    .sort((a, b) => a.feitos - b.feitos)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Gestão">
        Patrimônio, atas e cargos da entidade. Cargo e aprovação de membro são só de Presidente e Vice-Presidente.
      </PageHeader>

      <BlocoPendencias
        aprovacoes={aprovacoes.error ? null : (aprovacoes.count ?? 0)}
        bloqueados={bloqueados.error ? null : (bloqueados.count ?? 0)}
      />

      <Secao titulo="Cadastros">
        <ul className="grid gap-px border border-linha bg-linha md:grid-cols-3">
          {CADASTROS.map((c) => (
            <li key={c.href} className="bg-[var(--gear-ink)]">
              <Link href={c.href} className="block h-full p-5 hover:bg-[var(--gear-navy)]">
                <span className="block font-sans text-lg">{c.nome}</span>
                <span className="mt-2 block font-sans text-sm font-light leading-relaxed text-muted-foreground">{c.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Empréstimos em aberto">
        {abertos.error ? (
          <p className="font-sans text-sm font-light text-muted-foreground">
            Histórico indisponível. Confira se a <code>supabase/033_tarefas_horas_caixa_selecao.sql</code> rodou.
          </p>
        ) : foraAgora.length === 0 ? (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhum item fora.</p>
        ) : (
          <ul className="border border-linha">
            {foraAgora.map((e) => {
              const atrasado = e.prazo !== null && e.prazo < hoje
              return (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-4 border-b border-linha px-5 py-3 last:border-b-0">
                  <span className="font-mono text-[11px] text-[var(--gear-amber)]">{e.item?.codigo}</span>
                  <span className="flex-1 font-sans text-sm">{e.item?.item}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {e.pessoa?.nome_completo ?? "ex-membro"} · desde {dataDoDia(e.retirado_em.slice(0, 10))}
                  </span>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${atrasado ? "text-[var(--gear-amber)]" : "text-muted-foreground"}`}>
                    {e.prazo ? `${atrasado ? "atrasado · " : "até "}${dataDoDia(e.prazo)}` : "sem prazo"}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Secao>

      <Secao
        titulo="Formação na Academia"
        acoes={
          <Link href="/membros/aprendizagem" className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline">
            Editar módulos →
          </Link>
        }
      >
        {membros.error || progresso.error ? (
          <p className="font-sans text-sm font-light text-muted-foreground">
            Progresso indisponível. Se o erro persistir, confira se a <code>supabase/031_academia_gerenciavel.sql</code> rodou.
          </p>
        ) : totalModulos === 0 ? (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhum módulo cadastrado.</p>
        ) : (
          <ul className="border border-linha">
            {formacao.map((m) => (
              <li key={m.id} className="flex items-center gap-4 border-b border-linha px-5 py-3 last:border-b-0">
                <span className="flex-1 font-sans text-sm">
                  {m.nome_completo}
                  {m.frente && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{m.frente}</span>}
                </span>
                <div
                  role="progressbar"
                  aria-valuenow={m.feitos}
                  aria-valuemin={0}
                  aria-valuemax={totalModulos}
                  aria-label={`Módulos concluídos por ${m.nome_completo}`}
                  className="hidden h-1.5 w-32 bg-linha sm:block"
                >
                  <div className="h-full bg-[var(--gear-amber)]" style={{ width: `${Math.round((m.feitos / totalModulos) * 100)}%` }} />
                </div>
                <span className="w-14 text-right font-mono text-[11px] tabular-nums">
                  {m.feitos}/{totalModulos}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </section>
  )
}
