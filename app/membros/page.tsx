import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { createClient } from "@/lib/supabase/server"
import { temCargo } from "@/lib/administracao"

export const metadata: Metadata = {
  title: "Membros | GEAR",
  robots: { index: false, follow: false },
}

type Perfil = {
  nome_completo: string | null
  curso: string | null
  trilha: string | null
  cargo: string | null
  created_at: string
}

/** Sai pelo servidor: limpa o cookie de sessão de verdade, não só no browser. */
async function sair() {
  "use server"

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export default async function MembrosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/entrar")

  // A RLS já limita ao próprio usuário; o eq() deixa a intenção explícita.
  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("nome_completo, curso, trilha, cargo, created_at")
    .eq("id", user.id)
    .maybeSingle<Perfil>()

  /*
   * Gate do primeiro acesso: sem nome_completo, não entra na área.
   * Só redireciona se a consulta funcionou — se a tabela ainda não existe,
   * `error` vem preenchido e o aviso abaixo explica o que fazer, em vez de
   * mandar a pessoa para um formulário que também não teria onde gravar.
   */
  if (!error && !perfil?.nome_completo?.trim()) {
    redirect("/membros/completar-perfil")
  }

  const membroDesde = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  const ficha = [
    { label: "E-mail", valor: user.email ?? "—" },
    { label: "Curso", valor: perfil?.curso?.trim() || "não informado" },
    // trilha null = ainda não escolheu; é um estado válido, não um erro
    { label: "Trilha", valor: perfil?.trilha?.trim() || "a definir" },
    ...(perfil?.cargo?.trim() ? [{ label: "Cargo", valor: perfil.cargo }] : []),
    ...(membroDesde ? [{ label: "Membro desde", valor: membroDesde }] : []),
  ]

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Bem-vindo(a),
            <br />
            <span className="italic break-words">{perfil?.nome_completo ?? user.email}</span>
          </h1>

          <div className="mt-12 flex flex-col lg:flex-row gap-12 lg:gap-16">
            <p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
              Por enquanto não há nada aqui. O conteúdo da Academia GEAR — trilhas de formação,
              material e acompanhamento — entra nesta área depois.
            </p>

            {/* ficha do perfil, mesma linguagem das outras páginas */}
            <div className="w-full max-w-sm shrink-0 border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-6">
              <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">SEU PERFIL</p>
              <dl className="mt-4 space-y-4">
                {ficha.map((linha) => (
                  <div key={linha.label}>
                    <dt className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                      {linha.label}
                    </dt>
                    <dd className="font-mono text-[11px] text-foreground mt-1 break-words">{linha.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* A tabela pode não existir ainda, ou o trigger não ter rodado. */}
          {(error || !perfil) && (
            <div className="mt-10 max-w-2xl border border-white/20 bg-[var(--gear-navy)] p-5">
              <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground mb-2">
                PERFIL NÃO ENCONTRADO
              </p>
              <p className="font-sans text-sm font-light leading-relaxed text-muted-foreground">
                Sua conta existe, mas não há linha correspondente em <code>perfis</code>
                {error ? ` (${error.message})` : ""}. Rode <code>supabase/001_perfis.sql</code> no SQL
                Editor do painel — ele cria a tabela, as políticas e preenche quem já se cadastrou.
              </p>
            </div>
          )}

          <div className="mt-12 flex flex-col sm:flex-row gap-5">
            <Link
              href="/membros/aprendizagem"
              data-cursor-hover
              className="border border-[var(--gear-amber)] bg-transparent px-8 py-4 text-center font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"
            >
              Aprendizagem
            </Link>
            {/* só aparece para quem tem cargo — a RLS é quem barra de fato */}
            {temCargo(perfil?.cargo) && (
              <Link
                href="/membros/administracao"
                data-cursor-hover
                className="border border-[var(--gear-amber)] bg-transparent px-8 py-4 text-center font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"
              >
                Administração
              </Link>
            )}
            <Link
              href="/membros/completar-perfil"
              data-cursor-hover
              className="border border-white/20 bg-transparent px-8 py-4 text-center font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"
            >
              Editar perfil
            </Link>
          </div>

          <form action={sair} className="mt-6">
            <button
              type="submit"
              data-cursor-hover
              className="border border-white/20 bg-transparent px-8 py-4 font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"
            >
              Sair
            </button>
          </form>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
