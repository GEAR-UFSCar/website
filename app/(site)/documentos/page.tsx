import type { Metadata } from "next"

import { OG_IMAGE, EMAIL_CONTATO } from "@/lib/site"
import { Aviso } from "@/components/aviso"
import { Surge } from "@/components/surge"
import { createClientePublico } from "@/lib/supabase/publico"
import { dataLonga } from "@/lib/datas"
import { rotuloPublico } from "@/lib/documentos-catalogo"

const DESCRICAO =
  "Os documentos que organizam a GEAR: Regimento, políticas, manuais e a identidade da entidade. O que já foi aprovado abre em PDF; o que ainda não foi está marcado como em aprovação."

export const metadata: Metadata = {
  title: "Documentos | GEAR",
  description: DESCRICAO,
  openGraph: {
    title: "Documentos | GEAR",
    description: DESCRICAO,
    url: "/documentos",
    images: [OG_IMAGE],
  },
}

/*
 * Estática com revalidação de hora em hora, como /sobre: a lista muda quando a
 * diretoria aprova um documento, não a cada visita. O PDF não está nesta página
 * — o botão aponta para /documentos/[codigo], que assina o arquivo no clique.
 */
export const revalidate = 3600

type Publico = {
  codigo: string | null
  titulo: string
  pacote: number | null
  pacote_nome: string | null
  resumo: string | null
  versao: string | null
  paginas: number | null
  status: string
  arquivo: string | null
  atualizado_em: string
}

async function listar(): Promise<Publico[] | null> {
  const supabase = createClientePublico()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("documentos_publicos")
    .select("codigo, titulo, pacote, pacote_nome, resumo, versao, paginas, status, arquivo, atualizado_em")
    .order("pacote")
    .order("codigo")

  // Sem a 025 aplicada a view não existe: a vitrine some em silêncio em vez de
  // mostrar a um visitante que falta rodar migração.
  if (error) return null
  return (data ?? []) as Publico[]
}

export default async function DocumentosPage() {
  const documentos = await listar()
  const vigentes = documentos?.filter((d) => d.status === "vigente").length ?? 0

  return (
    <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">TRANSPARÊNCIA</p>
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
        Como a GEAR
        <br />
        <span className="italic">se organiza</span>
      </h1>

      <p className="mt-8 max-w-[62ch] font-sans text-lg font-light leading-relaxed text-muted-foreground">
        Uma entidade que pede confiança de universidade e de parceiro precisa mostrar as regras pelas
        quais se governa. Estes são os documentos que podem ser vistos por qualquer pessoa. Os de uso
        interno ficam na área de membros.
      </p>

      <Aviso titulo="O QUE JÁ VALE" tom="neutro" className="mt-10">
        Um documento só aparece como <strong>vigente</strong>, com PDF, depois de aprovado pela
        Assembleia ou pela Diretoria. Enquanto isso ele aparece como <strong>em aprovação</strong>:
        você sabe que existe e do que trata, mas ainda não é a regra em vigor.
      </Aviso>

      {documentos === null || documentos.length === 0 ? (
        <p className="mt-16 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
          A lista de documentos públicos ainda não foi publicada. Para consultar algum deles agora,
          escreva para{" "}
          <a
            href={`mailto:${EMAIL_CONTATO}`}
            data-cursor-hover
            className="text-[var(--gear-amber)] hover:underline"
          >
            {EMAIL_CONTATO}
          </a>
          .
        </p>
      ) : (
        <>
          <p className="mt-12 font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
            {documentos.length} documento(s) · {vigentes} vigente(s)
          </p>

          <ul className="mt-6 divide-y divide-linha border-y border-linha">
            {documentos.map((d, i) => {
              const abre = d.status === "vigente" && Boolean(d.arquivo) && Boolean(d.codigo)
              return (
                <Surge as="li" index={i} key={d.codigo ?? d.titulo} className="py-8">
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    {d.pacote_nome ?? "Documento"}
                    {" · "}
                    <span className={d.status === "vigente" ? "text-[var(--gear-amber)]" : ""}>
                      {rotuloPublico(d.status)}
                    </span>
                  </p>
                  <h2 className="mt-2 font-sans text-xl md:text-2xl font-light">{d.titulo}</h2>
                  {d.resumo && (
                    <p className="mt-3 max-w-[62ch] font-sans text-base font-light leading-relaxed text-muted-foreground">
                      {d.resumo}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                    {abre ? (
                      <a
                        href={`/documentos/${d.codigo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor-hover
                        className="font-mono text-xs tracking-[0.2em] text-[var(--gear-amber)] hover:underline"
                      >
                        ABRIR PDF →
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        {d.status === "vigente" ? "PDF indisponível no momento" : "PDF disponível após a aprovação"}
                      </span>
                    )}
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      {d.versao?.trim() ? `Versão ${d.versao}` : "Sem versão"}
                      {d.paginas ? ` · ${d.paginas} p.` : ""}
                      {" · "}
                      {dataLonga(d.atualizado_em)}
                    </span>
                  </div>
                </Surge>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
