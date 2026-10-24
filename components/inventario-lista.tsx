"use client"

import { Fragment, useMemo, useState, type ReactNode } from "react"
import { ChevronRight, Download } from "lucide-react"

import { PatrimonioForm } from "@/components/patrimonio-form"
import { PatrimonioStatus } from "@/components/patrimonio-status"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { Pilula } from "@/components/membros/pilula"
import { hojeISO } from "@/lib/datas"
import {
  CATEGORIAS, ESTADOS, SEM_ESTADO, SEM_FILTROS, STATUS,
  filtrarItens, itensParaCsv, urlSegura,
  type Filtros, type ItemInventario,
} from "@/lib/inventario"
import { botaoSecundario, campoBase, rotuloBase } from "@/lib/ui"

const numero = new Intl.NumberFormat("pt-BR")
const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

const COLUNAS = ["Código", "Item", "Categoria", "Qtd", "Estado", "Status", "Local · Responsável"] as const

/**
 * Inventário do GEAR: busca, filtros, linha que abre os detalhes, edição no
 * lugar e exportação em CSV.
 *
 * Filtra no navegador pelo mesmo motivo do diretório de pessoas: o servidor já
 * trouxe tudo (dezenas de itens, não milhares), e refazer a consulta a cada
 * tecla só devolveria linhas que já estão na memória.
 *
 * As contagens dos chips de categoria seguem a busca e os outros filtros, mas
 * NÃO a própria categoria: do contrário, escolher uma categoria zeraria todas
 * as outras e ninguém conseguiria ver para onde ir em seguida.
 */
export function InventarioLista({
  itens,
  origens,
}: {
  itens: ItemInventario[]
  /** Origens já usadas, para o formulário de edição sugerir. */
  origens: string[]
}) {
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS)
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set())
  const [editando, setEditando] = useState<string | null>(null)

  const mudar = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }))
  const filtrando = Boolean(filtros.q.trim() || filtros.categoria || filtros.estado || filtros.status)

  const visiveis = useMemo(() => filtrarItens(itens, filtros), [itens, filtros])

  const contagemPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const i of filtrarItens(itens, { ...filtros, categoria: "" })) {
      mapa.set(i.categoria, (mapa.get(i.categoria) ?? 0) + 1)
    }
    return mapa
  }, [itens, filtros])

  const totalSemCategoria = useMemo(
    () => [...contagemPorCategoria.values()].reduce((s, n) => s + n, 0),
    [contagemPorCategoria],
  )
  const categoriasComItem = CATEGORIAS.filter((c) => itens.some((i) => i.categoria === c))
  const unidadesVisiveis = visiveis.reduce((s, i) => s + i.quantidade, 0)

  const alternar = (id: string) => {
    setAbertos((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
    // Fechar a linha fecha também o editor dela: não deixa formulário oculto com texto digitado.
    if (editando === id) setEditando(null)
  }

  const exportar = () => {
    // O que está na tela é o que sai no arquivo; com filtro ativo, o nome avisa.
    const blob = new Blob([itensParaCsv(visiveis)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventario-gear-${hojeISO()}${filtrando ? "-filtrado" : ""}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revogar na hora pode cancelar o download em alguns navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (itens.length === 0) {
    return (
      <div className="mt-10">
        <EstadoVazio>Nenhum item cadastrado ainda. Use “Novo item” para cadastrar o primeiro.</EstadoVazio>
      </div>
    )
  }

  return (
    <>
      <div className="mt-10">
        <label htmlFor="busca-inventario" className="sr-only">
          Buscar no inventário por nome, código, fabricante, modelo, part-number ou descrição
        </label>
        <input
          id="busca-inventario"
          type="search"
          value={filtros.q}
          onChange={(e) => mudar({ q: e.target.value })}
          placeholder="Buscar por nome, código, fabricante, modelo ou part-number…"
          className={`${campoBase} min-h-11 max-w-4xl placeholder:text-muted-foreground/50`}
        />

        {/* No celular os dez chips viram uma fileira que rola de lado: empilhados, tomariam metade da tela. */}
        <div
          role="group"
          aria-label="Filtrar por categoria"
          className="mt-4 flex gap-2 max-sm:overflow-x-auto max-sm:pb-2 sm:flex-wrap"
        >
          {[{ chave: "", rotulo: "Todas", quantos: totalSemCategoria }, ...categoriasComItem.map((c) => ({
            chave: c as string,
            rotulo: c as string,
            quantos: contagemPorCategoria.get(c) ?? 0,
          }))].map((c) => {
            const ativo = filtros.categoria === c.chave
            return (
              <button
                key={c.rotulo}
                type="button"
                onClick={() => mudar({ categoria: c.chave })}
                aria-pressed={ativo}
                className={`min-h-11 shrink-0 whitespace-nowrap border px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                  ativo
                    ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                    : "border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {c.rotulo}
                <span className="ml-2 tabular-nums opacity-70">{c.quantos}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="filtro-estado" className={rotuloBase}>Estado de conservação</label>
            <select
              id="filtro-estado"
              value={filtros.estado}
              onChange={(e) => mudar({ estado: e.target.value })}
              className={`${campoBase} min-h-11`}
            >
              <option value="" className="bg-[var(--gear-ink)]">Todos</option>
              {ESTADOS.map((s) => <option key={s} value={s} className="bg-[var(--gear-ink)]">{s}</option>)}
              <option value={SEM_ESTADO} className="bg-[var(--gear-ink)]">Sem estado preenchido</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtro-status" className={rotuloBase}>Status (onde está)</label>
            <select
              id="filtro-status"
              value={filtros.status}
              onChange={(e) => mudar({ status: e.target.value })}
              className={`${campoBase} min-h-11`}
            >
              <option value="" className="bg-[var(--gear-ink)]">Todos</option>
              {STATUS.map((s) => <option key={s} value={s} className="bg-[var(--gear-ink)]">{s}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFiltros(SEM_FILTROS)}
              disabled={!filtrando}
              className={`${botaoSecundario} min-h-11 w-full !px-5 !py-2 text-[11px] disabled:opacity-40 disabled:hover:border-white/20 disabled:hover:text-muted-foreground`}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {/* Anunciado por leitor de tela: o filtro muda a lista sem recarregar. */}
        <p aria-live="polite" className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          {filtrando ? `${visiveis.length} de ${itens.length}` : visiveis.length}{" "}
          {itens.length === 1 ? "item" : "itens"} · {numero.format(unidadesVisiveis)}{" "}
          {unidadesVisiveis === 1 ? "unidade" : "unidades"}
        </p>
        <button
          type="button"
          onClick={exportar}
          disabled={visiveis.length === 0}
          className={`${botaoSecundario} inline-flex min-h-11 items-center gap-2 !px-4 !py-2 text-[11px] disabled:opacity-40 disabled:hover:border-white/20 disabled:hover:text-muted-foreground`}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {filtrando ? "Exportar filtrados (CSV)" : "Exportar CSV"}
        </button>
      </div>

      {visiveis.length === 0 ? (
        <div className="mt-6">
          <EstadoVazio>Nenhum item corresponde à busca e aos filtros escolhidos.</EstadoVazio>
        </div>
      ) : (
        /*
         * Tabela de 1024px para cima; abaixo disso, um cartão por item.
         *
         * Sete colunas não cabem num celular: a primeira versão rolava de lado, e
         * o detalhe aberto (que ocupa a largura inteira da tabela) saía da tela e
         * obrigava a rolar para ler uma descrição. Aqui o <tr> vira um grid, sem
         * trocar o HTML — o leitor de tela e o teclado percorrem a mesma ordem.
         *
         * Mudar o `display` de um elemento de tabela faz alguns leitores de tela
         * (VoiceOver no Safari, principalmente) esquecerem que ali havia uma
         * tabela; os `role` explícitos devolvem a semântica.
         */
        <div className="mt-4 overflow-x-auto">
          <table role="table" className="w-full border-collapse max-lg:block">
            <caption className="sr-only">
              Inventário do GEAR, um item por linha. Ative o código de um item para ver os detalhes e editar.
            </caption>
            <thead role="rowgroup" className="max-lg:sr-only">
              <tr role="row" className="border-b border-linha-forte text-left">
                {COLUNAS.map((h) => (
                  <th
                    key={h}
                    role="columnheader"
                    scope="col"
                    className="py-3 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.25em] text-muted-foreground md:text-[9px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="max-lg:block">
              {visiveis.map((i) => {
                const aberto = abertos.has(i.id)
                const idDetalhe = `inv-${i.id}`
                const onde = [i.localizacao, i.responsavel_atual].filter(Boolean).join(" · ")
                return (
                  <Fragment key={i.id}>
                    <tr
                      role="row"
                      className={`align-top max-lg:mt-3 max-lg:grid max-lg:grid-cols-[1fr_auto] max-lg:items-start max-lg:gap-x-4 max-lg:gap-y-2 max-lg:border max-lg:border-linha max-lg:p-4 ${
                        aberto ? "max-lg:border-b-0" : "lg:border-b lg:border-linha"
                      }`}
                    >
                      <td role="cell" className="py-1.5 pr-4 max-lg:order-1 max-lg:p-0">
                        <button
                          type="button"
                          onClick={() => alternar(i.id)}
                          aria-expanded={aberto}
                          aria-controls={aberto ? idDetalhe : undefined}
                          aria-label={`${i.codigo}, ${i.item}: ${aberto ? "recolher" : "ver"} detalhes`}
                          className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-wider text-[var(--gear-amber)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gear-amber)]"
                        >
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${aberto ? "rotate-90" : ""}`}
                            aria-hidden="true"
                          />
                          {i.codigo}
                        </button>
                      </td>
                      <td role="cell" className="py-3 pr-4 max-lg:order-3 max-lg:col-span-2 max-lg:p-0">
                        <p className="max-w-[40ch] break-words font-sans text-base font-light">{i.item}</p>
                        {(i.fabricante || i.modelo) && (
                          <p className="mt-1 max-w-[40ch] break-words font-mono text-[11px] text-muted-foreground">
                            {[i.fabricante, i.modelo].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td role="cell" className="py-3 pr-4 font-mono text-[11px] text-muted-foreground max-lg:order-4 max-lg:p-0">
                        {i.categoria}
                        {i.subcategoria && <span className="block">{i.subcategoria}</span>}
                      </td>
                      <td
                        role="cell"
                        data-rotulo="Qtd"
                        className="py-3 pr-4 font-mono text-[11px] tabular-nums max-lg:order-5 max-lg:p-0 max-lg:text-right max-lg:before:mr-2 max-lg:before:text-[10px] max-lg:before:uppercase max-lg:before:tracking-[0.2em] max-lg:before:text-muted-foreground max-lg:before:content-[attr(data-rotulo)]"
                      >
                        {numero.format(i.quantidade)}
                      </td>
                      <td role="cell" className="whitespace-nowrap py-3 pr-4 max-lg:order-2 max-lg:p-0 max-lg:justify-self-end">
                        <EstadoPilula estado={i.estado} />
                      </td>
                      <td role="cell" className="py-1.5 pr-4 lg:w-44 max-lg:order-6 max-lg:col-span-2 max-lg:p-0">
                        <PatrimonioStatus id={i.id} valor={i.status} codigo={i.codigo} />
                      </td>
                      <td
                        role="cell"
                        data-rotulo="Local"
                        className={`py-3 pr-4 font-mono text-[11px] text-muted-foreground max-lg:order-7 max-lg:col-span-2 max-lg:p-0 max-lg:before:mr-2 max-lg:before:text-[10px] max-lg:before:uppercase max-lg:before:tracking-[0.2em] max-lg:before:content-[attr(data-rotulo)] ${
                          onde ? "" : "max-lg:hidden"
                        }`}
                      >
                        {onde || "—"}
                      </td>
                    </tr>

                    {aberto && (
                      <tr
                        role="row"
                        id={idDetalhe}
                        className="border-b border-linha bg-[var(--gear-navy)] max-lg:block max-lg:border max-lg:border-t-0"
                      >
                        <td role="cell" colSpan={COLUNAS.length} className="px-4 py-6 max-lg:block">
                          {editando === i.id ? (
                            <div className="max-w-4xl">
                              <PatrimonioForm item={i} origens={origens} aoConcluir={() => setEditando(null)} />
                            </div>
                          ) : (
                            <Detalhe item={i} aoEditar={() => setEditando(i.id)} />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function EstadoPilula({ estado }: { estado: string | null }) {
  // Sem estado é uma lacuna do cadastro, não um valor: aparece tracejado para não passar por "Novo".
  if (!estado) {
    return (
      <span className="inline-block whitespace-nowrap border border-dashed border-linha-forte px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        sem estado
      </span>
    )
  }
  const tom = estado === "Com defeito" ? "alerta" : estado === "Em manutenção" ? "ativo" : "neutro"
  return <Pilula tom={tom}>{estado}</Pilula>
}

function Campo({ rotulo, children, largo = false }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "md:col-span-3" : ""}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:text-[9px]">{rotulo}</dt>
      <dd className="mt-1 break-words font-sans text-sm font-light leading-relaxed text-foreground">{children}</dd>
    </div>
  )
}

function Detalhe({ item: i, aoEditar }: { item: ItemInventario; aoEditar: () => void }) {
  // Só vira link se for http(s); o banco já recusa o resto, e esta é a segunda trava.
  const link = urlSegura(i.datasheet_url)
  let hospedeiro = ""
  if (link) {
    try {
      hospedeiro = new URL(link).hostname.replace(/^www\./, "")
    } catch {
      hospedeiro = ""
    }
  }

  return (
    <div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-3">
        {i.descricao && <Campo rotulo="Descrição" largo>{i.descricao}</Campo>}
        <Campo rotulo="Part-number">{i.part_number ?? "—"}</Campo>
        <Campo rotulo="Origem">{i.origem ?? "—"}</Campo>
        <Campo rotulo="Frente vinculada">{i.frente_vinculada ?? "—"}</Campo>
        <Campo rotulo="Valor unitário estimado">
          {i.valor_estimado === null ? "não estimado" : reais.format(i.valor_estimado)}
        </Campo>
        <Campo rotulo="Localização">{i.localizacao ?? "—"}</Campo>
        <Campo rotulo="Responsável atual">{i.responsavel_atual ?? "—"}</Campo>
        {i.datasheet_url && (
          <Campo rotulo="Datasheet">
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-mono text-[11px] text-[var(--gear-amber)] hover:underline md:min-h-0"
              >
                Abrir{hospedeiro ? ` em ${hospedeiro}` : ""} ↗
              </a>
            ) : (
              <span className="text-muted-foreground">link inválido; edite o item para corrigir</span>
            )}
          </Campo>
        )}
        {i.observacoes && <Campo rotulo="Observações" largo>{i.observacoes}</Campo>}
      </dl>

      <button
        type="button"
        onClick={aoEditar}
        className={`${botaoSecundario} mt-6 min-h-11 !px-5 !py-2 text-[11px]`}
      >
        Editar {i.codigo}
      </button>
    </div>
  )
}
