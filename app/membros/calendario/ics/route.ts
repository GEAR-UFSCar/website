import { createClient } from "@/lib/supabase/server"
import { gerarICS, normalizar, type EventoCal } from "@/lib/calendario"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Baixa UM evento como .ics (com a regra de repetição, se houver, e um lembrete
 * de 15 minutos antes). Usa a sessão do membro: quem não é aprovado não lê o
 * evento pela RLS e recebe 404, igual a um evento que não existe.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("evento")
  if (!id || !UUID.test(id)) return new Response("Evento inválido.", { status: 400 })

  const supabase = await createClient()
  const { data } = await supabase.from("eventos").select("*").eq("id", id).maybeSingle()
  if (!data) return new Response("Não encontrado.", { status: 404 })

  const evento = data as EventoCal
  const apelido = normalizar(evento.titulo).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "evento"

  const corpo = gerarICS({
    nome: "GEAR — UFSCar Sorocaba",
    eventos: [evento],
    agora: new Date().toISOString(),
    lembreteMin: 15,
  })

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="gear-${apelido}.ics"`,
      "Cache-Control": "private, no-store",
    },
  })
}
