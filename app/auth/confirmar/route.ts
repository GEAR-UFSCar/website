import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/*
 * Ponto de pouso dos links que o Supabase manda por e-mail — hoje, o de
 * recuperação de senha.
 *
 * Precisa ser Route Handler e não página: trocar o código por uma sessão
 * ESCREVE cookie, e Server Component não escreve cookie (está documentado em
 * lib/supabase/server.ts, no catch do setAll). Numa página, a sessão seria
 * criada e perdida no mesmo request.
 *
 * Dois formatos, porque o Supabase manda um ou outro conforme o template do
 * projeto e a versão do fluxo:
 *   · `code`                → PKCE, o padrão do @supabase/ssr
 *   · `token_hash` + `type` → link de verificação no formato antigo
 * O fluxo implícito (tokens no fragmento `#`) não aparece aqui de propósito:
 * o fragmento nunca chega ao servidor, e é justamente por isso que não é o
 * usado.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const tipo = searchParams.get("type")

  /*
   * Destino depois da troca. Só caminho interno: `proximo` vem da URL, e sem
   * esta checagem o link do e-mail poderia levar a pessoa autenticada para
   * fora do site (redirecionamento aberto). `//` é barrado junto com `http://`
   * porque `//evil.com` é URL absoluta para o navegador.
   */
  const bruto = searchParams.get("proximo") ?? "/membros"
  const proximo = bruto.startsWith("/") && !bruto.startsWith("//") ? bruto : "/membros"

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(proximo, origin))
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({
      type: tipo as "recovery" | "email" | "invite" | "magiclink" | "email_change",
      token_hash: tokenHash,
    })
    if (!error) return NextResponse.redirect(new URL(proximo, origin))
  }

  /*
   * Link gasto, expirado ou adulterado. Volta para o pedido de recuperação com
   * um aviso — nunca para uma tela de erro sem saída, que é onde a pessoa
   * desiste. O motivo não é detalhado: para quem tem o link errado, saber
   * QUAL dos três casos ocorreu não ajuda a entrar.
   */
  return NextResponse.redirect(new URL("/entrar/recuperar?estado=expirado", origin))
}
