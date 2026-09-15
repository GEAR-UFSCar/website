import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { exigirPerfilCompleto } from "@/lib/supabase/sessao"
import { botaoSecundario } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Aguardando aprovação | GEAR",
  robots: { index: false, follow: false },
}

/** Sai pelo servidor: limpa o cookie de sessão de verdade, não só no browser. */
async function sair() {
  "use server"

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

/*
 * Sala de espera de quem tem conta mas ainda não foi aprovado.
 *
 * Usa exigirPerfilCompleto, NÃO exigirMembroAprovado — exigir aprovação aqui
 * criaria um laço de redirecionamento com a própria página.
 */
export default async function AguardandoPage() {
  const { user, perfil } = await exigirPerfilCompleto()

  // Quem já foi aprovado não tem o que fazer aqui.
  if (perfil?.aprovado) redirect("/membros")

  return (
    <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)] mb-4">
        CONTA CRIADA
      </p>
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
        Aguardando
        <br />
        <span className="italic">aprovação</span>
      </h1>

      <p className="mt-8 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
        Seu cadastro chegou. A área de membros abre quando a diretoria confirmar seu vínculo com
        a entidade — é o que impede que qualquer pessoa de fora leia o diretório e os documentos
        internos.
      </p>

      <Aviso titulo="SEUS DADOS" tom="neutro" className="mt-10 max-w-2xl">
        <dl className="space-y-3">
          {[
            { label: "Nome", valor: perfil?.nome_completo?.trim() || "—" },
            { label: "Curso", valor: perfil?.curso?.trim() || "não informado" },
            { label: "E-mail", valor: user.email ?? "—" },
          ].map((linha) => (
            <div key={linha.label}>
              <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                {linha.label}
              </dt>
              <dd className="font-mono text-[11px] text-foreground mt-0.5 break-words">
                {linha.valor}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5">
          É por esses dados que a diretoria vai te reconhecer. Se algo estiver errado, corrija
          antes — depois de aprovado, só a diretoria altera cargo e vínculo.
        </p>
      </Aviso>

      <div className="mt-12 flex flex-col sm:flex-row gap-5">
        <Link
          href="/membros/completar-perfil"
          data-cursor-hover
          className={`text-center ${botaoSecundario}`}
        >
          Corrigir meus dados
        </Link>
        <form action={sair}>
          <button type="submit" data-cursor-hover className={`w-full ${botaoSecundario}`}>
            Sair
          </button>
        </form>
      </div>
    </section>
  )
}
