import { dataLonga } from "@/lib/datas"
import { Pilula } from "@/components/membros/pilula"
import type { ItemAgenda } from "@/lib/agenda"

/** Lista cronológica dos itens do calendário; complementa a grade mensal. */
export function AgendaLista({ itens, hoje }: { itens: ItemAgenda[]; hoje: string }) {
  const futuros = itens.filter((i) => i.dia >= hoje).slice(0, 30)
  if (futuros.length === 0) {
    return <p className="font-sans text-sm font-light text-muted-foreground">Nada marcado de hoje em diante neste mês.</p>
  }
  return (
    <ul>
      {futuros.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 py-3">
          <span className="w-44 font-mono text-xs tabular-nums text-muted-foreground">
            {dataLonga(`${i.dia}T12:00:00-03:00`)}
            {i.hora ? `, ${i.hora}` : ""}
          </span>
          <span className="min-w-0 flex-1 basis-56 font-sans text-base">{i.titulo}</span>
          <Pilula tom={i.atrasada ? "alerta" : "neutro"}>{i.rotulo}</Pilula>
        </li>
      ))}
    </ul>
  )
}
