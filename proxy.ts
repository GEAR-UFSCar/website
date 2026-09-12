import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/sessao-proxy"

/*
 * Antigo `middleware.ts`. No Next 16 a convenção passou a se chamar `proxy`;
 * o comportamento é o mesmo e o nome antigo emite aviso de depreciação.
 */
export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Todas as rotas, menos:
     * - _next/static e _next/image (assets do build)
     * - favicon, robots, sitemap
     * - arquivos de imagem servidos de public/
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
}
