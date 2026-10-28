import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/membros/page-header"

import { ErroDados } from "@/components/erro-dados"
import { DocumentoForm } from "@/components/documento-form"
import { DocumentoAnexo } from "@/components/documento-anexo"
import { DocumentoPublicacao } from "@/components/documento-publicacao"
import { RegistroEditavel } from "@/components/membros/registro-editavel"
import { createClient } from "@/lib/supabase/server"
import { dataLonga } from "@/lib/datas"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { eDiretoria, temCargo } from "@/lib/administracao"
import {
  BUCKET,
  COLUNAS_DOCUMENTO,
  VALIDADE_LINK,
  eExterno,
  type Documento,
} from "@/lib/documentos"
import { ATALHOS, ROTULO_STATUS, filtrar } from "@/lib/documentos-catalogo"
import { campoBase, paginaMembros } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Documentação | GEAR",
  robots: { index: false, follow: false },
}

type Busca = { q?: string; pacote?: string; tag?: string; arquivados?: string }

/** Comparador de código: "RI" primeiro, depois 01, 02… e por último os sem código. */
const porCodigo = (a: Documento, b: Documento) => {
  const peso = (d: Documento) => (d.codigo === "RI" ? "" : (d.codigo ?? "~"))
  return peso(a).localeCompare(peso(b)) || a.titulo.localeCompare(b.titulo, "pt-BR")
}

export default async function DocumentacaoPage({
  searchParams,
}: {
  searchParams: Promise<Busca>
}) {
  const consulta = await searchParams
  const { perfil } = await exigirMembroAprovado()
  /*
   * Portão só da tela. A RLS (006/023) barra a escrita de quem não tem cargo, e
   * o gatilho da 025 barra publicação e status de quem não é diretoria — chamar
   * o endpoint direto recebe erro com ou sem estes botões renderizados.
   */
  const podeEscrever = temCargo(perfil?.cargo)
  const ehDiretoria = eDiretoria(perfil?.cargo)

  const supabase = await createClient()
  const { data, error } = await supabase.from("documentos").select(COLUNAS_DOCUMENTO)

  const todos = ((data ?? []) as Documento[]).sort(porCodigo)

  const pacoteNumero = consulta.pacote !== undefined && consulta.pacote !== "" ? Number(consulta.pacote) : null
  const filtros = {
    busca: consulta.q?.slice(0, 120) ?? "",
    pacote: Number.isInteger(pacoteNumero) ? pacoteNumero : null,
    tag: consulta.tag?.slice(0, 40) || null,
    arquivados: consulta.arquivados === "1",
  }
  const documentos = filtrar(todos, filtros)
  const filtrando = Boolean(filtros.busca || filtros.pacote !== null || filtros.tag || filtros.arquivados)

  // pacotes existentes, para o seletor — sempre calculados sobre a lista inteira
  const pacotes = [
    ...new Map(
      todos.filter((d) => d.pacote !== null).map((d) => [d.pacote as number, d.pacote_nome ?? `Pacote ${d.pacote}`]),
    ),
  ].sort((a, b) => a[0] - b[0])

  /*
   * Assina de uma vez só os caminhos que apontam para o bucket (arquivo
   * principal e formulários editáveis). Nulo e URL externa não entram: a
   * externa já é o próprio link.
   */
  const caminhos = documentos.flatMap((d) => [
    ...(d.arquivo_url && !eExterno(d.arquivo_url) ? [d.arquivo_url] : []),
    ...(d.anexos ?? []).map((a) => a.caminho),
  ])

  const assinados = new Map<string, string>()
  if (caminhos.length > 0) {
    const { data: urls } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls([...new Set(caminhos)], VALIDADE_LINK)

    for (const item of urls ?? []) {
      // item.error vem preenchido quando o objeto não está no bucket;
      // nesse caso o documento cai no mesmo aviso de "não anexado".
      if (item.signedUrl && !item.error) assinados.set(item.path ?? "", item.signedUrl)
    }
  }

  /** Link final do documento, ou null se ainda não há arquivo utilizável. */
  const linkDe = (documento: Documento) => {
    if (!documento.arquivo_url) return null
    if (eExterno(documento.arquivo_url)) return documento.arquivo_url
    return assinados.get(documento.arquivo_url) ?? null
  }

  // Uma passada: agrupa por pacote (avulsos no fim) e conta os anexados.
  const grupos = new Map<string, Array<Documento & { link: string | null }>>()
  let anexados = 0
  for (const documento of documentos) {
    const link = linkDe(documento)
    if (link) anexados++
    const chave =
      documento.pacote !== null
        ? `${documento.pacote}|${documento.pacote_nome ?? `Pacote ${documento.pacote}`}`
        : "~|Cadastro avulso"
    const lista = grupos.get(chave) ?? []
    lista.push({ ...documento, link })
    grupos.set(chave, lista)
  }
  const gruposOrdenados = [...grupos].sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Documentos">
        Regimento, manuais, modelos e normas da entidade, abertos a qualquer membro aprovado. Procure
        pelo que você precisa fazer, não pelo nome do documento. {documentos.length} de {todos.length}{" "}
        documento(s), {anexados} com arquivo.
      </PageHeader>

      {error && (
        <ErroDados titulo="DOCUMENTOS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/006_documentos.sql</code> no SQL Editor do
          painel. Se o erro cita uma coluna, faltam <code>025_catalogo_de_documentos.sql</code> e{" "}
          <code>026_catalogo_inicial.sql</code>, nessa ordem.
        </ErroDados>
      )}

      {!error && (
        <>
          {/* Busca por GET: a URL é o estado, então a busca se compartilha e o Voltar funciona */}
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_15rem_auto]">
            <div>
              <label htmlFor="doc-busca" className="sr-only">
                Buscar documento
              </label>
              <input
                id="doc-busca"
                name="q"
                type="search"
                defaultValue={filtros.busca}
                placeholder="Buscar: protocolo de voo, empréstimo, ata…"
                className={campoBase}
              />
            </div>
            <div>
              <label htmlFor="doc-pacote" className="sr-only">
                Pacote
              </label>
              <select id="doc-pacote" name="pacote" defaultValue={filtros.pacote ?? ""} className={campoBase}>
                <option value="" className="bg-[var(--gear-ink)]">
                  Todos os pacotes
                </option>
                {pacotes.map(([numero, nome]) => (
                  <option key={numero} value={numero} className="bg-[var(--gear-ink)]">
                    {numero}. {nome}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              data-cursor-hover
              className="min-h-11 border border-[var(--gear-amber)] px-8 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)]"
            >
              Buscar
            </button>
            {filtros.tag && <input type="hidden" name="tag" value={filtros.tag} />}
            <label className="flex min-h-11 items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground md:col-span-3 md:min-h-0">
              <input
                type="checkbox"
                name="arquivados"
                value="1"
                defaultChecked={filtros.arquivados}
                className="h-4 w-4 accent-[var(--gear-amber)]"
              />
              Incluir arquivados
            </label>
          </form>

          <nav aria-label="Atalhos" className="mt-4">
            <p className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              Preciso de…
            </p>
            <ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {ATALHOS.map((a) => {
                const ativo = filtros.tag === a.tag
                return (
                  <li key={a.tag} className="shrink-0">
                    <Link
                      href={ativo ? "/membros/documentacao" : `/membros/documentacao?tag=${a.tag}`}
                      aria-current={ativo ? "true" : undefined}
                      data-cursor-hover
                      className={`inline-flex min-h-11 items-center whitespace-nowrap border px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                        ativo
                          ? "border-[var(--gear-amber)] bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                          : "border-linha-forte text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {a.rotulo}
                    </Link>
                  </li>
                )
              })}
              {filtrando && (
                <li>
                  <Link
                    href="/membros/documentacao"
                    data-cursor-hover
                    className="inline-flex min-h-11 items-center px-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline"
                  >
                    Limpar filtros
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}

      {!error && todos.length === 0 && (
        <p className="mt-10 max-w-2xl font-sans text-sm font-light text-muted-foreground">
          Nenhum documento cadastrado ainda.
        </p>
      )}

      {!error && todos.length > 0 && documentos.length === 0 && (
        <p className="mt-10 max-w-2xl font-sans text-sm font-light text-muted-foreground">
          Nenhum documento corresponde a essa busca. Tente menos palavras ou limpe os filtros.
        </p>
      )}

      {/* Uma seção por pacote */}
      {gruposOrdenados.map(([chave, daSecao]) => {
        const titulo = chave.split("|")[1]
        return (
          <section key={chave} className="mt-12">
            <div className="border-t border-linha pt-8">
              <h2 className="font-sans text-xl font-normal tracking-tight md:text-2xl">{titulo}</h2>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-px bg-linha lg:grid-cols-2">
              {daSecao.map((documento, i) => {
                const anexosAbertos = (documento.anexos ?? [])
                  .map((a) => ({ nome: a.nome, link: assinados.get(a.caminho) ?? null }))
                  .filter((a): a is { nome: string; link: string } => a.link !== null)

                return (
                  <Surge
                    as="li"
                    index={i}
                    key={documento.id}
                    className="flex h-full flex-col justify-between gap-5 bg-[var(--gear-ink)] p-6"
                  >
                    <div className="flex-1">
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        {documento.codigo ? `${documento.codigo} · ` : ""}
                        <span className={documento.status === "vigente" ? "text-[var(--gear-amber)]" : ""}>
                          {ROTULO_STATUS[documento.status]}
                        </span>
                        {documento.publico ? " · Público" : ""}
                      </p>
                      <h3 className="mt-2 font-sans text-lg md:text-xl font-light leading-snug">
                        {documento.titulo}
                      </h3>
                      {documento.resumo && (
                        <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                          {documento.resumo}
                        </p>
                      )}
                      {documento.quando && (
                        <p className="mt-3 font-sans text-sm font-light leading-relaxed">
                          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                            Quando usar{" "}
                          </span>
                          {documento.quando}
                        </p>
                      )}
                      {documento.quem && (
                        <p className="mt-2 font-sans text-sm font-light leading-relaxed">
                          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                            Quem usa{" "}
                          </span>
                          {documento.quem}
                        </p>
                      )}
                      <p className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        {documento.versao?.trim() ? `Versão ${documento.versao}` : "Versão —"}
                        {documento.paginas ? ` · ${documento.paginas} p.` : ""}
                        {" · "}
                        Atualizado em {dataLonga(documento.atualizado_em)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-4">
                      {documento.link ? (
                        <a
                          href={documento.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cursor-hover
                          className="font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                        >
                          ABRIR DOCUMENTO →
                        </a>
                      ) : (
                        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                          ARQUIVO AINDA NÃO ANEXADO
                        </span>
                      )}

                      {anexosAbertos.map((a) => (
                        <a
                          key={a.link}
                          href={a.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cursor-hover
                          className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground hover:text-[var(--gear-amber)]"
                        >
                          WORD: {a.nome.toUpperCase()} ↓
                        </a>
                      ))}

                      {/* Link externo não se substitui por upload: trocar a origem
                          do documento é edição de cadastro, não anexo. */}
                      {podeEscrever && !eExterno(documento.arquivo_url ?? "") && (
                        <DocumentoAnexo
                          documentoId={documento.id}
                          titulo={documento.titulo}
                          temArquivo={Boolean(documento.link)}
                        />
                      )}
                    </div>

                    {ehDiretoria && (
                      <DocumentoPublicacao
                        documentoId={documento.id}
                        status={documento.status}
                        publico={documento.publico}
                        temArquivo={Boolean(documento.link)}
                      />
                    )}
                    {/* Sem apagar: documentos não têm policy de DELETE. */}
                    {podeEscrever && (
                      <RegistroEditavel
                        tabela="documentos"
                        id={documento.id}
                        apagavel={false}
                        className=""
                        formulario={<DocumentoForm documento={documento} />}
                      />
                    )}
                  </Surge>
                )
              })}
            </ul>
          </section>
        )
      })}

      {podeEscrever && (
        <section className="mt-20">
          <div className="border-t border-linha pt-8">
            <h2 className="font-sans text-xl font-normal tracking-tight md:text-2xl">Cadastrar documento</h2>
            <p className="mt-3 max-w-2xl font-sans text-sm font-light leading-relaxed text-muted-foreground">
              O arquivo vai para um bucket privado: ninguém abre sem sessão, e o link que aparece na
              lista é assinado e expira em uma hora. O documento entra como rascunho e interno; a
              diretoria decide quando ele é vigente e se aparece no site público.
            </p>
          </div>
          <div className="mt-8">
            <DocumentoForm />
          </div>
        </section>
      )}
    </section>
  )
}
