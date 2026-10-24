/** Tipos de lib/csp.mjs — ver lá a explicação das duas políticas. */
export function politicaCsp(opcoes?: { nonce?: string }): string
export const ROTAS_COM_NONCE: string
/** Origem (HTTP e WebSocket) do projeto Supabase, ou null se a URL falta ou não é http(s). */
export function origemSupabase(url?: string): { http: string; ws: string } | null
