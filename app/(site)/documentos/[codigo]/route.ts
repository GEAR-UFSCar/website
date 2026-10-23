import { NextResponse, type NextRequest } from "next/server"

import { createClientePublico } from "@/lib/supabase/publico"
import { BUCKET } from "@/lib/documentos"

/** Código do catálogo: "RI", "08", "47". Qualquer outra coisa nem consulta o banco. */
const CODIGO = /^[A-Za-z0-9]{1,8}$/

/** O link assinado vive pouco: serve para o redirecionamento, não para ser guardado. */
const VALIDADE_SEGUNDOS = 120

/*
 * Abre o PDF de um documento PÚBLICO e VIGENTE.
 *
 * Por que uma rota e não o link assinado direto na página: a página é estática
 * com revalidação, e um link assinado impresso nela expira antes da página. Aqui
 * o link nasce a cada clique.
 *
 * A decisão de publicar não é desta rota. Ela só consulta a view
 * `documentos_publicos` (supabase/025), que devolve `arquivo` nulo para tudo
 * que não é vigente; e a assinatura só funciona porque a policy de storage
 * também exige vigente. As duas camadas precisam concordar para o arquivo sair.
 * Qualquer falha — banco ausente, documento interno, rascunho, arquivo que não
 * está no bucket — é o mesmo 404, para não revelar o que existe.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params
  const naoEncontrado = () =>
    new NextResponse("Documento não encontrado.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    })

  if (!CODIGO.test(codigo)) return naoEncontrado()

  const supabase = createClientePublico()
  if (!supabase) return naoEncontrado()

  const { data } = await supabase
    .from("documentos_publicos")
    .select("arquivo")
    .eq("codigo", codigo)
    .maybeSingle()

  if (!data?.arquivo) return naoEncontrado()

  const { data: assinado, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.arquivo, VALIDADE_SEGUNDOS)

  if (error || !assinado?.signedUrl) return naoEncontrado()

  return NextResponse.redirect(assinado.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  })
}
