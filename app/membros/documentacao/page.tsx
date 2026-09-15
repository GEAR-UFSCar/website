import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { DocumentoForm } from "@/components/documento-form"
import { DocumentoAnexo } from "@/components/documento-anexo"
import { createClient } from "@/lib/supabase/server"
import { dataLonga } from "@/lib/datas"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import {
  BUCKET,
  CATEGORIAS,
  COLUNAS_DOCUMENTO,
  VALIDADE_LINK,
  eExterno,
  type Documento,
} from "@/lib/documentos"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Documentação | GEAR",
  robots: { index: false, follow: false },
}

export default async function DocumentacaoPage() {
  const { perfil } = await exigirMembroAprovado()
  /*
   * Portão só da tela. A RLS de 006 (escrita com cargo, na tabela e no bucket)
   * é quem barra de fato — quem não tem cargo e chamar o endpoint direto
   * recebe 42501, com ou sem estes botões renderizados.
   */
  const podeEscrever = temCargo(perfil?.cargo)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("documentos")
    .select(COLUNAS_DOCUMENTO)
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
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>
      <p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
        Regimento, manuais e normas da entidade, abertos a qualquer membro. O que ainda não tem
        arquivo aparece listado mesmo assim — e quem tem cargo anexa ali na linha.
      </p>

      <p className="mt-10 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {documentos.length} DOCUMENTO(S) · {anexados} COM ARQUIVO
      </p>
      </Surge>

      {error && (
        <ErroDados titulo="DOCUMENTOS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/006_documentos.sql</code> no SQL Editor do
          painel — ele cria a tabela, as políticas, o bucket e cadastra os documentos já
          conhecidos.
        </ErroDados>
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

            {/*
              Grade em vez de lista: cada documento é título, versão e um
              botão — três linhas curtas que, empilhadas em coluna única,
              deixavam dois terços da largura vazios e transformavam uma
              categoria de seis itens em meia tela de rolagem.
            */}
            <ul className="mt-8 grid grid-cols-1 gap-px bg-white/10 lg:grid-cols-2">
              {daCategoria.map((documento, i) => (
                <Surge
                  as="li"
                  index={i}
                  key={documento.id}
                  className="flex h-full flex-col justify-between gap-4 bg-[var(--gear-ink)] p-6"
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
                </Surge>
              ))}
            </ul>
          </section>
        )
      })}

      {podeEscrever && (
        <section className="mt-20">
          <div className="border-t border-white/10 pt-8">
            <h2 className="font-sans text-2xl md:text-4xl font-light italic">Cadastrar documento</h2>
            <p className="mt-3 max-w-2xl font-sans text-sm font-light leading-relaxed text-muted-foreground">
              O arquivo vai para um bucket privado: ninguém abre sem sessão, e o link que aparece na
              lista é assinado e expira em uma hora.
            </p>
          </div>
          <div className="mt-8">
            <DocumentoForm />
          </div>
        </section>
      )}

      <div className="mt-16">
        <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Voltar para membros
        </Link>
      </div>
    </section>
  )
}
