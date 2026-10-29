import { nivelDeRisco, type Modelo } from "@/lib/formularios"

/**
 * O registro preenchido, só leitura. É também a versão impressa: com as linhas
 * de assinatura do documento original, vira o papel que a UFSCar pede.
 */
export function RegistroVisualizacao({ modelo, dados, nomes }: { modelo: Modelo; dados: Record<string, unknown>; nomes: Map<string, string> }) {
  return (
    <div className="space-y-8">
      {modelo.secoes.map((secao, i) => (
        <section key={i} className="border-t border-linha pt-5 print:break-inside-avoid">
          {secao.titulo && <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gear-amber)] print:text-black">{secao.titulo}</h2>}
          <dl className="mt-3 space-y-4">
            {secao.campos.map((c) => {
              const v = dados[c.id]
              let conteudo: React.ReactNode = <span className="text-muted-foreground">—</span>
              if (c.tipo === "pessoa" && typeof v === "string" && v) conteudo = nomes.get(v) ?? "ex-membro"
              else if (c.tipo === "checklist") {
                const marcados = Array.isArray(v) ? (v as string[]) : []
                conteudo = (
                  <ul className="space-y-1">
                    {c.itens.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="font-mono">{marcados.includes(item) ? "[x]" : "[ ]"}</span>
                        <span className="sr-only">{marcados.includes(item) ? "Feito:" : "Pendente:"}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              } else if (c.tipo === "multipla" && Array.isArray(v) && v.length) conteudo = (v as string[]).join("; ")
              else if (c.tipo === "tabela" && Array.isArray(v) && v.length) {
                const linhas = v as string[][]
                const risco = c.colunas[0]?.startsWith("Gravidade")
                conteudo = (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-linha-forte">
                        {c.linhas && <th scope="col" className="py-1 pr-3 font-mono text-[10px] font-normal uppercase text-muted-foreground">Item</th>}
                        {c.colunas.map((col) => <th key={col} scope="col" className="py-1 pr-3 font-mono text-[10px] font-normal uppercase text-muted-foreground">{col}</th>)}
                        {risco && <th scope="col" className="py-1 font-mono text-[10px] font-normal uppercase text-muted-foreground">Risco</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((linha, l) => (
                        <tr key={l} className="border-b border-linha align-top">
                          {c.linhas && <td className="py-1 pr-3">{c.linhas[l]}</td>}
                          {c.colunas.map((_, k) => <td key={k} className="py-1 pr-3">{linha[k] || "—"}</td>)}
                          {risco && <td className="py-1">{nivelDeRisco(linha[0] ?? "", linha[1] ?? "")?.valor ?? "—"}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              } else if (typeof v === "string" && v.trim()) conteudo = <span className="whitespace-pre-line">{v}</span>
              return (
                <div key={c.id}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{c.rotulo}</dt>
                  <dd className="mt-1 break-words font-sans text-sm font-light leading-relaxed">{conteudo}</dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}

      {modelo.assinaturas && (
        <div className="hidden grid-cols-2 gap-10 pt-16 print:grid">
          {modelo.assinaturas.map((a) => (
            <p key={a} className="border-t border-black pt-2 text-sm">{a}</p>
          ))}
        </div>
      )}
    </div>
  )
}
