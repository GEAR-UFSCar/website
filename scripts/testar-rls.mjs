/**
 * Teste de fronteira: o que uma pessoa SEM SESSÃO consegue do banco.
 *
 * POR QUE ISTO EXISTE
 * A autorização da GEAR mora na RLS, não no React. Toda a área de membros
 * depende de policies que ninguém consegue ver pela interface — e a auditoria
 * mostrou que dá para uma migração ser escrita, revisada e nunca aplicada sem
 * que nada no site mude de aparência. Este arquivo é a única forma de a
 * afirmação "a RLS está ligada" ser verificável em vez de acreditada.
 *
 * O QUE ELE NÃO É
 * Não é teste de unidade e não sobe banco nenhum: ele fala com o projeto real
 * do Supabase usando a MESMA chave anônima que está no bundle do site. Ou
 * seja, ele faz exatamente o que um visitante hostil faria, e nada além.
 *
 * SEGURANÇA DO PRÓPRIO TESTE
 *   · nenhuma linha é criada, alterada ou apagada;
 *   · os POST de sondagem vão com corpo VAZIO, que a RLS recusa antes de
 *     qualquer validação de coluna — se um deles passasse, o 201 de volta já
 *     seria o próprio achado;
 *   · nenhum dado lido é impresso: o teste conta linhas, não mostra conteúdo.
 *
 * COMO RODAR
 *   npm run test:rls
 *
 * Sai com código 1 se qualquer teste falhar — serve em CI sem adaptação.
 */

import { readFileSync } from "node:fs"

// --- credenciais -------------------------------------------------------------
// Lê .env.local na mão em vez de depender de dotenv: uma dependência a menos
// numa ferramenta cujo objetivo é não confiar em intermediários.
function lerEnv(caminho = ".env.local") {
  try {
    return Object.fromEntries(
      readFileSync(caminho, "utf8")
        .split("\n")
        .filter((linha) => linha.trim() && !linha.trim().startsWith("#"))
        .map((linha) => {
          const corte = linha.indexOf("=")
          return [linha.slice(0, corte).trim(), linha.slice(corte + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const env = { ...lerEnv(), ...process.env }
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const CHAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL_BASE || !CHAVE) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  process.exit(1)
}

const REST = `${URL_BASE}/rest/v1`
const CABECALHOS = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` }

// --- placar ------------------------------------------------------------------
let passou = 0
let falhou = 0
const pendentes = []

function checar(nome, ok, detalhe = "") {
  if (ok) {
    passou++
    console.log(`  \x1b[32m✓\x1b[0m ${nome}`)
  } else {
    falhou++
    console.log(`  \x1b[31m✗\x1b[0m ${nome}${detalhe ? ` — ${detalhe}` : ""}`)
  }
}

function pendente(nome, motivo) {
  pendentes.push(nome)
  console.log(`  \x1b[33m·\x1b[0m ${nome} — ${motivo}`)
}

// --- tabelas sob teste -------------------------------------------------------
// Toda tabela que a migração 014 fechou, mais as duas de administração que a
// 016 alinhou. Acrescentar tabela aqui é mais barato que descobrir depois.
const TABELAS = [
  "perfis",
  "documentos",
  "avisos",
  "eventos",
  "sprints",
  "modulos",
  "progresso",
  "patrimonio",
  "atas",
  "termos_aceitos",
]

/** Predicados de autorização — não deveriam ser chamáveis sem sessão (SEC-07). */
const PREDICADOS = ["e_membro", "e_diretoria", "tem_cargo"]

// --- 1. leitura anônima ------------------------------------------------------
console.log("\n1. LEITURA ANÔNIMA — nenhuma tabela interna pode devolver linha")

for (const tabela of TABELAS) {
  const resposta = await fetch(`${REST}/${tabela}?select=*&limit=5`, { headers: CABECALHOS })

  if (resposta.status === 404) {
    pendente(`${tabela}: leitura negada`, "tabela não existe (migração não aplicada)")
    continue
  }

  if (!resposta.ok) {
    // 401/403 também é negação — é o resultado certo, por outro caminho.
    checar(`${tabela}: leitura negada`, true)
    continue
  }

  const linhas = await resposta.json()
  const vazio = Array.isArray(linhas) && linhas.length === 0
  checar(
    `${tabela}: leitura negada`,
    vazio,
    vazio ? "" : `VAZOU ${linhas.length} linha(s) para quem não tem sessão`,
  )
}

// --- 2. escrita anônima ------------------------------------------------------
console.log("\n2. ESCRITA ANÔNIMA — corpo vazio, só para ver quem responde 42501")

for (const tabela of TABELAS) {
  const resposta = await fetch(`${REST}/${tabela}`, {
    method: "POST",
    headers: { ...CABECALHOS, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: "{}",
  })

  if (resposta.status === 404) {
    pendente(`${tabela}: escrita negada`, "tabela não existe (migração não aplicada)")
    continue
  }

  const corpo = await resposta.json().catch(() => ({}))

  /*
   * 42501 é a resposta CERTA: a RLS barrou. Um 400 por coluna obrigatória
   * faltando seria a resposta ERRADA — significaria que a policy deixou
   * passar e só o NOT NULL segurou. A distinção entre os dois códigos é o
   * ponto inteiro deste teste.
   */
  const negadoPelaRls = corpo?.code === "42501"
  const criou = resposta.status === 201
  checar(
    `${tabela}: escrita negada pela RLS`,
    negadoPelaRls,
    criou
      ? "CRIOU A LINHA — a policy de insert está aberta para anon"
      : `esperava 42501, veio ${corpo?.code ?? resposta.status}`,
  )
}

// --- 3. predicados de autorização (SEC-07) -----------------------------------
console.log("\n3. PREDICADOS — não devem ser executáveis sem sessão")

for (const nome of PREDICADOS) {
  const resposta = await fetch(`${REST}/rpc/${nome}`, {
    method: "POST",
    headers: { ...CABECALHOS, "Content-Type": "application/json" },
    body: "{}",
  })

  // Depois da 016 o EXECUTE some para anon e o PostgREST responde 404.
  const inacessivel = resposta.status === 404 || resposta.status === 401 || resposta.status === 403
  checar(
    `${nome}(): fora do alcance anônimo`,
    inacessivel,
    `respondeu ${resposta.status} — falta aplicar supabase/016_autoria_e_predicados.sql`,
  )
}

// --- 4. bucket privado -------------------------------------------------------
console.log("\n4. ARMAZENAMENTO — o bucket de documentos é privado")

const objeto = await fetch(`${URL_BASE}/storage/v1/object/list/documentos`, {
  method: "POST",
  headers: { ...CABECALHOS, "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 5 }),
})
const listagem = await objeto.json().catch(() => null)
const semVazamento = !objeto.ok || (Array.isArray(listagem) && listagem.length === 0)
checar("documentos: listagem negada a anônimo", semVazamento)

// --- placar ------------------------------------------------------------------
console.log(`\n${"─".repeat(60)}`)
console.log(`${passou} passou · ${falhou} falhou · ${pendentes.length} pendente(s)`)

if (pendentes.length) {
  console.log(
    "\nPendente = a tabela ainda não existe no banco. Não é falha do teste:\n" +
      "é migração que não foi aplicada. Veja supabase/README.md.",
  )
}

if (falhou > 0) {
  console.log("\n\x1b[31mFALHOU.\x1b[0m Cada ✗ acima é dado ao alcance de quem não tem sessão.")
  process.exit(1)
}

console.log("\n\x1b[32mA fronteira anônima está fechada.\x1b[0m")
