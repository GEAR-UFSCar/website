import type { Metadata } from "next"
import Link from "next/link"

import { CargoSelect } from "@/components/cargo-select"
import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { eDiretoria } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Cargos | GEAR",
  robots: { index: false, follow: false },
}

type Perfil = {
  id: string
  nome_completo: string | null
  curso: string | null
  trilha: string | null
  cargo: string | null
  cargo_atualizado_em: string | null
}

export default async function CargosPage() {
  // sessão e perfil vêm do cache do layout — sem nova consulta
  const user = await exigirUsuario()
  const { perfil: meu } = await getPerfil()

  // O layout já barra quem não tem cargo; aqui a régua é mais alta.
  if (!eDiretoria(meu?.cargo)) {
    return (
      <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--gear-amber)] mb-4">ACESSO RESTRITO</p>
        <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight">Cargos</h1>
        <p className="mt-8 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
          Só Presidente e Vice-Presidente atribuem cargos. Seu cargo atual é{" "}
          <span className="text-foreground">{meu?.cargo ?? "nenhum"}</span>.
        </p>
        <Link href="/membros/administracao" data-cursor-hover
          className={`mt-12 inline-block ${botaoSecundario}`}>
          Voltar ao painel
        </Link>
      </section>
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome_completo, curso, trilha, cargo, cargo_atualizado_em")
    .order("nome_completo", { nullsFirst: false })

  const perfis = (data ?? []) as Perfil[]
  const comCargo = perfis.filter((p) => p.cargo?.trim()).length

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <Surge>
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ADMINISTRAÇÃO</p>
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">Cargos</h1>
      <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {perfis.length} PERFIL(S) · {comCargo} COM CARGO
      </p>
      </Surge>

      <Aviso titulo="ATENÇÃO" tom="neutro" className="mt-8 max-w-3xl">
        Qualquer cargo preenchido dá acesso ao painel de Patrimônio e Atas. Só Presidente e
        Vice-Presidente conseguem alterar cargos. Remover o próprio cargo tira o seu acesso.
      </Aviso>

      {error && (
        <Aviso titulo="ERRO" className="mt-10 max-w-2xl">
          {error.message}. Se as colunas de auditoria não existem, rode{" "}
          <code>supabase/004_cargos.sql</code>.
        </Aviso>
      )}

      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse">
          <thead>
            <tr className="border-b border-white/15 text-left">
              {["Membro", "Curso", "Trilha", "Cargo", "Alterado em"].map((h) => (
                <th key={h} className="py-3 pr-4 font-mono text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perfis.length === 0 && !error && (
              <tr><td colSpan={5} className="py-8 font-sans text-sm font-light text-muted-foreground">
                Nenhum perfil cadastrado.
              </td></tr>
            )}
            {perfis.map((p, indice) => (
              <Surge as="tr" index={indice} key={p.id} className="border-b border-white/10 align-top">
                <td className="py-4 pr-4">
                  <p className="font-sans text-base font-light">{p.nome_completo ?? "sem nome"}</p>
                  {p.id === user.id && (
                    <span className="font-mono text-[9px] tracking-[0.2em] text-[var(--gear-amber)]">VOCÊ</span>
                  )}
                </td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{p.curso ?? "—"}</td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">{p.trilha ?? "—"}</td>
                <td className="py-4 pr-4 w-52"><CargoSelect perfilId={p.id} valor={p.cargo} /></td>
                <td className="py-4 pr-4 font-mono text-[11px] text-muted-foreground">
                  {p.cargo_atualizado_em
                    ? new Date(p.cargo_atualizado_em).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })
                    : "—"}
                </td>
              </Surge>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/membros/administracao" data-cursor-hover
        className={`mt-14 inline-block ${botaoSecundario}`}>
        Voltar ao painel
      </Link>
    </section>
  )
}
