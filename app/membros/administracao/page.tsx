import type { Metadata } from "next"
import Link from "next/link"

import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Administração | GEAR",
  robots: { index: false, follow: false },
}

const SECOES = [
  { href: "/membros/administracao/patrimonio", nome: "Patrimônio", texto: "Inventário de robôs, componentes, ferramentas e equipamentos da entidade." },
  { href: "/membros/administracao/atas", nome: "Atas", texto: "Registro de reuniões: presentes, pauta, decisões e pendências." },
  { href: "/membros/administracao/cargos", nome: "Cargos", texto: "Atribuir e trocar cargos dos membros. Restrito a Presidente e Vice-Presidente." },
]

export default function AdministracaoPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>
        <p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
          Patrimônio, atas e cargos da entidade. Tudo aqui exige cargo preenchido; cargo e
          aprovação de membro, só Presidente e Vice-Presidente.
        </p>
      </Surge>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {SECOES.map((secao, i) => (
          <Surge key={secao.href} index={i} className="h-full">
          <Link
            href={secao.href}
            data-cursor-hover
            className="group block h-full border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
          >
            <h2 className="font-sans text-2xl md:text-3xl font-light tracking-tight">{secao.nome}</h2>
            <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
              {secao.texto}
            </p>
            <span className="mt-5 inline-block font-mono text-[10px] tracking-[0.25em] text-[var(--gear-amber)]">
              ABRIR →
            </span>
          </Link>
          </Surge>
        ))}
      </div>

      <Link
        href="/membros"
        data-cursor-hover
        className={`mt-16 inline-block ${botaoSecundario}`}
      >
        Voltar para membros
      </Link>
    </section>
  )
}
