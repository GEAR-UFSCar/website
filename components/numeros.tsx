import { FRENTES } from "@/lib/administracao"
import { PROJETOS } from "@/lib/projetos"
import { TOTAL_MEMBROS } from "@/lib/site"

const itens = [
  { valor: PROJETOS.length, rotulo: "robôs documentados" },
  { valor: FRENTES.length, rotulo: "frentes" },
  { valor: TOTAL_MEMBROS, rotulo: "membros fundadores" },
  { valor: 1, rotulo: "registro na ProEx-UFSCar" },
]

/** Faixa de fatos conferíveis no próprio site. Sem contador animado: o número é o dado. */
export function Numeros() {
  return (
    <section aria-label="A GEAR em números" className="px-8 md:px-12">
      <dl className="grid grid-cols-2 gap-px border-y border-linha bg-linha md:grid-cols-4">
        {itens.map((i) => (
          <div key={i.rotulo} className="bg-[var(--gear-ink)] px-2 py-8 md:px-6 md:py-10">
            <dd className="font-mono text-4xl tabular-nums tracking-tight md:text-5xl">{i.valor}</dd>
            <dt className="mt-2 font-sans text-sm font-light text-muted-foreground">{i.rotulo}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
