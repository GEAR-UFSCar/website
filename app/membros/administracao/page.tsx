import type { Metadata } from "next"
import Link from "next/link"

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
    <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ADMINISTRAÇÃO</p>
      <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
        Painel da
        <br />
        <span className="italic">entidade</span>
      </h1>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {SECOES.map((secao) => (
          <Link
            key={secao.href}
            href={secao.href}
            data-cursor-hover
            className="group border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
          >
            <h2 className="font-sans text-2xl md:text-3xl font-light tracking-tight">{secao.nome}</h2>
            <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
              {secao.texto}
            </p>
            <span className="mt-5 inline-block font-mono text-[10px] tracking-[0.25em] text-[var(--gear-amber)]">
              ABRIR →
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/membros"
        data-cursor-hover
        className="mt-16 inline-block border border-white/20 bg-transparent px-8 py-4 font-mono text-sm tracking-widest uppercase text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground"
      >
        Voltar para membros
      </Link>
    </section>
  )
}
