import { createClient } from "@supabase/supabase-js"

import { gerarICS, type EventoCal } from "@/lib/calendario"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const texto = (corpo: string, status: number) =>
  new Response(corpo, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  })

/**
 * Feed de assinatura do calendário (.ics) para Google Agenda, Apple Calendário
 * e Outlook.
 *
 * Aplicativo de agenda não manda cookie, então o endereço carrega um segredo —
 * o token de `calendario_assinaturas` (027). Esta rota NÃO tem sessão: fala
 * com o banco como `anon` e só passa pelas duas funções SECURITY DEFINER, que
 * conferem o token e que o dono dele continua aprovado. Nada além dos eventos
 * da entidade sai por aqui: metas, sprints e perfis ficam de fora.
 *
 * Token errado e token revogado dão 404 igual: quem tenta adivinhar não aprende
 * nada além de "não".
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: bruto } = await params
  const token = bruto.replace(/\.ics$/i, "")
  if (!UUID.test(token)) return texto("Não encontrado.", 404)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !chave) return texto("Calendário indisponível.", 503)

  const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: valido, error: erroToken } = await supabase.rpc("calendario_token_valido", { p_token: token })
  // Função inexistente (027 não aplicada) e falha de rede são "indisponível"; só um `false` limpo é "não existe".
  if (erroToken) return texto("Calendário indisponível.", 503)
  if (valido !== true) return texto("Não encontrado.", 404)

  const { data, error } = await supabase.rpc("feed_do_calendario", { p_token: token })
  if (error) return texto("Calendário indisponível.", 503)

  const corpo = gerarICS({
    nome: "GEAR — UFSCar Sorocaba",
    eventos: (data ?? []) as EventoCal[],
    agora: new Date().toISOString(),
  })

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="gear.ics"',
      // Os aplicativos consultam sozinhos; cinco minutos de cache só poupam o banco de rajadas.
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  })
}
