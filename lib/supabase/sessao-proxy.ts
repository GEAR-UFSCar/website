import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { COOKIE_LEMBRAR, querLembrar, validadeDaSessao } from "@/lib/supabase/lembrar"
import { ROTAS_COM_NONCE, politicaCsp } from "@/lib/csp.mjs"

/** Prefixos que exigem sessão. /membros/completar-perfil está incluído. */
const AREA_RESTRITA = "/membros"

/** Só tenta falar com o Supabase se as credenciais existirem. */
export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

/**
 * Renova a sessão do usuário a cada request e repassa os cookies atualizados
 * para o browser. Padrão oficial do @supabase/ssr para o App Router, chamado
 * do `proxy.ts` na raiz (o antigo `middleware.ts`).
 */
export async function updateSession(request: NextRequest) {
  /*
   * CSP com nonce na área de membros (ver lib/csp.mjs). O Next lê o nonce do
   * cabeçalho Content-Security-Policy da REQUISIÇÃO e o aplica sozinho nos
   * <script> que gera; a RESPOSTA leva o mesmo cabeçalho para o navegador.
   * Um nonce novo por requisição — reaproveitar seria o mesmo que não ter.
   */
  // Segmento inteiro: "/membros" e "/membros/…", não "/membrosX". É a mesma
  // fronteira do `source` em next.config.mjs, que tira essas rotas da CSP pública.
  const caminho = request.nextUrl.pathname
  const comNonce = caminho === ROTAS_COM_NONCE || caminho.startsWith(`${ROTAS_COM_NONCE}/`)
  const csp = comNonce ? politicaCsp({ nonce: btoa(crypto.randomUUID()) }) : null

  /*
   * `continuar()` e não um NextResponse.next() solto: o setAll lá embaixo
   * recria a resposta depois de mexer nos cookies da requisição, e a
   * recriação precisa carregar a CSP de novo. Os cabeçalhos são copiados NA
   * HORA da chamada para incluir os cookies que o setAll acabou de gravar.
   */
  const continuar = () => {
    if (!csp) return NextResponse.next({ request })
    const cabecalhos = new Headers(request.headers)
    cabecalhos.set("Content-Security-Policy", csp)
    const resposta = NextResponse.next({ request: { headers: cabecalhos } })
    resposta.headers.set("Content-Security-Policy", csp)
    return resposta
  }

  let supabaseResponse = continuar()

  // Sem credenciais o site segue funcionando normalmente, apenas sem sessão.
  if (!supabaseConfigurado) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          /*
           * Aqui é onde o "Lembrar de mim" mais importa: este proxy renova a
           * sessão a cada request, e é ele que regravaria os cookies com os
           * 400 dias padrão do @supabase/ssr, promovendo a cookie persistente
           * a sessão que devia morrer ao fechar o navegador.
           * Ver lib/supabase/lembrar.ts.
           */
          const lembrar = querLembrar(request.cookies.get(COOKIE_LEMBRAR)?.value)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = continuar()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, validadeDaSessao(options, lembrar)),
          )
        },
      },
    },
  )

  // IMPORTANTE: nada de lógica entre createServerClient e getUser(). Qualquer
  // coisa aqui no meio pode fazer a sessão expirar de forma imprevisível.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  /*
   * Porta de entrada da área de membros, aqui e não só nas páginas.
   *
   * Desde que app/membros/loading.tsx passou a existir, o segmento ganhou um
   * limite de Suspense: o Next começa a TRANSMITIR a resposta com 200 antes de
   * a página rodar, e o redirect() de dentro dela deixa de virar 307 — sai
   * como instrução no meio do stream, executada no cliente. Quem não tem
   * sessão via o esqueleto piscar antes de ir para o login, e curl/robô
   * recebia 200.
   *
   * Isto é checagem otimista, como a própria documentação do Next recomenda
   * para proxy: a barreira real continua sendo exigirUsuario() na página e a
   * RLS no banco. O ganho é devolver o 307 antes de qualquer stream.
   */
  if (!user && request.nextUrl.pathname.startsWith(AREA_RESTRITA)) {
    const login = request.nextUrl.clone()
    login.pathname = "/entrar"
    return NextResponse.redirect(login)
  }

  return supabaseResponse
}
