import type { Instrumentation } from "next"

/*
 * OBSERVABILIDADE — o outro lado de lib/erros.ts
 *
 * Desde que a área de membros parou de imprimir `error.message` na tela, o
 * membro vê "não foi possível carregar agora" e um código de ocorrência. Isso
 * só é honesto se alguém do outro lado conseguir descobrir o que aconteceu a
 * partir desse código — senão trocamos vazamento por silêncio.
 *
 * `onRequestError` é o gancho do Next para isso. Ele roda no servidor, recebe
 * o erro real e o `digest` que app/error.tsx mostra ao usuário, e escreve uma
 * linha JSON no stdout — que é exatamente o que a Vercel indexa em Runtime
 * Logs. Nenhuma dependência nova, nenhum serviço a contratar.
 *
 * QUANDO QUISEREM MAIS: definam ERRO_WEBHOOK_URL (Discord, Slack, Sentry via
 * proxy) e a mesma linha vai também para lá. Sem a variável, o bloco inteiro
 * não executa — o padrão continua sendo só o log.
 */

/** Cabeçalhos que NUNCA entram no log: carregam sessão ou identidade. */
const CABECALHOS_PROIBIDOS = new Set(["cookie", "authorization", "x-forwarded-for", "set-cookie"])

/**
 * Só o que ajuda a reproduzir. O objeto `request.headers` do Next vem
 * completo, com os cookies do Supabase dentro — despejá-lo no log
 * transformaria o monitoramento numa segunda via de vazamento, agora
 * persistida.
 */
function cabecalhosSeguros(headers: Record<string, string | string[] | undefined>) {
  const seguros: Record<string, string> = {}
  for (const [chave, valor] of Object.entries(headers)) {
    if (CABECALHOS_PROIBIDOS.has(chave.toLowerCase())) continue
    if (chave.toLowerCase() !== "user-agent" && chave.toLowerCase() !== "referer") continue
    if (valor === undefined) continue
    seguros[chave] = Array.isArray(valor) ? valor.join(", ") : valor
  }
  return seguros
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const erro = err instanceof Error ? err : new Error(String(err))
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined

  const ocorrencia = {
    nivel: "erro",
    // O mesmo valor que app/error.tsx mostra como "Código da ocorrência".
    // É a chave que liga a tela do membro a esta linha.
    digest,
    mensagem: erro.message,
    pilha: erro.stack,
    rota: context.routePath,
    tipo: context.routeType,
    caminho: request.path,
    metodo: request.method,
    cabecalhos: cabecalhosSeguros(request.headers),
    quando: new Date().toISOString(),
  }

  // Uma linha, JSON: a Vercel e o `next start` indexam igual, e dá para
  // filtrar por digest sem abrir cada entrada.
  console.error(JSON.stringify(ocorrencia))

  const webhook = process.env.ERRO_WEBHOOK_URL
  if (!webhook) return

  /*
   * O try/catch é obrigatório: se o webhook estiver fora do ar, a exceção aqui
   * dentro aconteceria DURANTE o tratamento de um erro. O Next não tem onde
   * apará-la, e o que era uma falha de página viraria uma falha de processo.
   */
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ocorrencia),
    })
  } catch {
    console.error("ERRO_WEBHOOK_URL inacessível; a ocorrência ficou só no log.")
  }
}
