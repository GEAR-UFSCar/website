import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/server"
import { dataLonga } from "@/lib/datas"
import { exigirPerfilCompleto } from "@/lib/supabase/sessao"
import { botaoSecundario } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Documentação | GEAR",
  robots: { index: false, follow: false },
}

/** Ordem das seções na tela — espelha o CHECK de supabase/006_documentos.sql. */
const CATEGORIAS = ["Governança", "Técnico", "Marca", "Financeiro", "Segurança"] as const

/** Bucket privado: o link só existe assinado, e por uma hora. */
const BUCKET = "documentos"
const VALIDADE_LINK = 60 * 60

type Documento = {
  id: string
  titulo: string
  categoria: string
  arquivo_url: string | null
  versao: string | null
  atualizado_em: string
}

const eExterno = (valor: string) => /^https?:\/\//i.test(valor)


export default async function DocumentacaoPage() {
  await exigirPerfilCompleto()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("documentos")
    .select("id, titulo, categoria, arquivo_url, versao, atualizado_em")
    .order("categoria")
    .order("titulo")

  const documentos = (data ?? []) as Documento[]

  /*
   * Assina de uma vez só os caminhos que apontam para o bucket. Quem tem
   * arquivo_url nulo não entra aqui, e quem tem URL externa também não —
   * essa já é o próprio link.
   */
  const caminhos = documentos
    .map((d) => d.arquivo_url)
    .filter((url): url is string => Boolean(url) && !eExterno(url!))

  const assinados = new Map<string, string>()
  if (caminhos.length > 0) {
    const { data: urls } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(caminhos, VALIDADE_LINK)

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

  // Um passo só: a lista já sai agrupada e o total de anexados vem junto.
  const porCategoria = new Map<string, Array<Documento & { link: string | null }>>()
  let anexados = 0
  for (const documento of documentos) {
    const link = linkDe(documento)
    if (link) anexados++
    const lista = porCategoria.get(documento.categoria) ?? []
    lista.push({ ...documento, link })
    porCategoria.set(documento.categoria, lista)
  }

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Documentação
            <br />
            <span className="italic">institucional</span>
          </h1>

          <p className="mt-12 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
            Regimento, manuais e normas da entidade, abertos a qualquer membro. Os arquivos estão
            sendo exportados aos poucos — o que ainda não tem PDF aparece listado, mas sem link.
          </p>

          <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {documentos.length} DOCUMENTO(S) · {anexados} COM ARQUIVO
          </p>

          {error && (
            <Aviso titulo="DOCUMENTOS INDISPONÍVEIS" className="mt-10 max-w-2xl">
              {error.message}. Se a tabela não existe, rode <code>supabase/006_documentos.sql</code>{" "}
              no SQL Editor do painel — ele cria a tabela, as políticas, o bucket e cadastra os
              documentos já conhecidos.
            </Aviso>
          )}

          {!error && documentos.length === 0 && (
            <p className="mt-10 max-w-2xl font-sans text-sm font-light text-muted-foreground">
              Nenhum documento cadastrado ainda.
            </p>
          )}

          {/* Uma seção por categoria */}
          {CATEGORIAS.map((categoria, indice) => {
            const daCategoria = porCategoria.get(categoria)
            if (!daCategoria?.length) return null

            return (
              <section key={categoria} className="mt-16">
                <div className="border-t border-white/10 pt-8">
                  <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                    0{indice + 1} — {categoria.toUpperCase()}
                  </p>
                  <h2 className="font-sans text-2xl md:text-4xl font-light italic">{categoria}</h2>
                </div>

                <ul className="mt-8 space-y-px">
                  {daCategoria.map((documento) => (
                    <li
                      key={documento.id}
                      className="flex flex-col gap-3 border-t border-white/10 py-6 sm:flex-row sm:items-baseline sm:justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-sans text-lg md:text-xl font-light leading-snug">
                          {documento.titulo}
                        </h3>
                        <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                          {documento.versao?.trim() ? `Versão ${documento.versao}` : "Versão —"}
                          {" · "}
                          Atualizado em {dataLonga(documento.atualizado_em)}
                        </p>
                      </div>

                      {documento.link ? (
                        <a
                          href={documento.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cursor-hover
                          className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                        >
                          ABRIR DOCUMENTO →
                        </a>
                      ) : (
                        <span className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                          ARQUIVO AINDA NÃO ANEXADO
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          <div className="mt-16">
            <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
              Voltar para membros
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
