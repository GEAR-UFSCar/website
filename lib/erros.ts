/**
 * Tradução de erro de banco para frase que um membro consegue ler.
 *
 * O PROBLEMA (SEC-08 da auditoria)
 * Vinte e dois pontos da área de membros renderizavam `error.message` cru. A
 * mensagem do Postgres é escrita para quem administra o banco, não para quem
 * usa o site: ela nomeia tabela, coluna, política e constraint. Num ambiente
 * de desenvolvimento isso economiza meia hora; em produção é um mapa do
 * esquema entregue a qualquer pessoa que consiga uma sessão — inclusive a que
 * está esperando aprovação.
 *
 * A REGRA
 * A frase segura aparece sempre. O texto cru do Postgres aparece só em
 * desenvolvimento. Não é o mesmo que esconder o erro: o membro continua
 * sabendo que falhou e o que fazer a respeito — só não recebe o nome da
 * constraint junto.
 */

/** Formato mínimo comum a PostgrestError e AuthError. */
export type ErroDeDados = {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

/**
 * Vale no servidor e no cliente: o Next substitui `process.env.NODE_ENV` no
 * bundle em tempo de build, então o ramo de desenvolvimento nem chega ao
 * JavaScript que o navegador baixa em produção.
 */
export const EM_DESENVOLVIMENTO = process.env.NODE_ENV !== "production"

/*
 * Códigos que a área de membros realmente produz. Cada um foi visto em
 * alguma tela — não é a tabela inteira do Postgres copiada.
 *
 * 42501 é o mais importante: é o que a RLS devolve, e é o único caso em que a
 * resposta honesta ("você não tem permissão") é também a resposta útil.
 */
const POR_CODIGO: Record<string, string> = {
  // RLS negou. Desde a migração 014 isto quase sempre significa "conta ainda
  // não aprovada", e não "erro".
  "42501": "Você não tem permissão para isto. Se acabou de se cadastrar, sua conta ainda aguarda aprovação da diretoria.",
  // Tabela ou função que não existe: falta rodar uma migração.
  "42P01": "Esta parte do sistema ainda não foi instalada no banco.",
  "42883": "Esta parte do sistema ainda não foi instalada no banco.",
  // Unicidade.
  "23505": "Já existe um registro igual a esse.",
  // CHECK — inclui os limites de tamanho da migração 015.
  "23514": "Algum campo está fora do formato aceito.",
  // Chave estrangeira.
  "23503": "Esse registro depende de outro que não existe mais.",
  // NOT NULL.
  "23502": "Falta preencher um campo obrigatório.",
  // Texto maior que o limite da coluna.
  "22001": "Um dos campos passou do tamanho máximo.",
  // PostgREST.
  PGRST116: "Registro não encontrado.",
  PGRST301: "Sua sessão expirou. Entre novamente.",
  PGRST204: "O formulário mandou um campo que o banco não conhece.",
}

/** Último recurso: nem código conhecido, nem nada a dizer de específico. */
const GENERICA = "Não foi possível carregar agora. Tente de novo em instantes."

/**
 * A frase que vai para a tela, em qualquer ambiente.
 *
 * Deliberadamente NÃO cai para `erro.message` quando o código é desconhecido:
 * seria o vazamento de volta pela porta dos fundos, e o caso desconhecido é
 * justamente o que ninguém revisou.
 */
export function mensagemSegura(erro: ErroDeDados | null | undefined): string {
  if (!erro) return GENERICA
  if (erro.code && POR_CODIGO[erro.code]) return POR_CODIGO[erro.code]

  /*
   * Erro de autenticação do Supabase não traz `code` nos fluxos antigos, e a
   * mensagem dele é redigida para o usuário final, não para o DBA. Só que ela
   * vem em inglês — por isso os casos que o formulário de entrada produz de
   * fato estão traduzidos aqui, e o resto cai na genérica.
   */
  const bruta = erro.message?.toLowerCase() ?? ""
  if (bruta.includes("invalid login credentials")) return "E-mail ou senha incorretos."
  if (bruta.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar."
  if (bruta.includes("user already registered")) return "Já existe conta com esse e-mail."
  if (bruta.includes("password should be")) return "A senha precisa ter pelo menos 6 caracteres."
  if (bruta.includes("rate limit") || bruta.includes("too many"))
    return "Tentativas demais em pouco tempo. Espere um minuto e tente de novo."
  if (bruta.includes("fetch") || bruta.includes("network"))
    return "Sem conexão com o servidor. Verifique a internet e tente de novo."

  return GENERICA
}

/**
 * O texto cru, e só em desenvolvimento. Em produção devolve `null`, e quem
 * chama renderiza nada — o `null` é o que garante que não existe caminho de
 * código capaz de imprimir isto em produção por descuido.
 */
export function detalheTecnico(erro: ErroDeDados | null | undefined): string | null {
  if (!EM_DESENVOLVIMENTO || !erro) return null
  return [erro.code, erro.message, erro.details, erro.hint].filter(Boolean).join(" · ")
}
