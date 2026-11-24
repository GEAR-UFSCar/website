/**
 * Banco de DESENVOLVIMENTO: zera o Supabase local, aplica supabase/001…NNN e
 * cria um usuário de teste por papel, com alguns dados de exemplo.
 *
 *   npx supabase start          # uma vez (Docker); sobe o Supabase local
 *   npm run dev:banco           # zera e semeia (pode repetir)
 *   npm run dev                 # usa .env.development.local, apontando para o local
 *
 * Só fala com o Supabase LOCAL: se a URL da API não for 127.0.0.1/localhost,
 * para antes de tocar em qualquer coisa. Os usuários e a senha abaixo não
 * existem em produção e nunca devem existir.
 */

import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIR = path.join(RAIZ, "supabase")
const SENHA = "gear-dev-123"

const sh = (cmd, args, input) =>
  execFileSync(cmd, args, { cwd: RAIZ, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })

// --- onde está o Supabase local ------------------------------------------------
const env = Object.fromEntries(
  sh("npx", ["supabase", "status", "-o", "env"])
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
const api = env.API_URL
if (!api || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(api)) {
  console.error(`Recusado: a API não é local (${api ?? "Supabase local não está rodando"}). Rode \`npx supabase start\`.`)
  process.exit(1)
}
const projeto = readFileSync(path.join(DIR, "config.toml"), "utf8").match(/^project_id = "(.+)"/m)[1]
const psql = (sql) =>
  sh("docker", ["exec", "-i", `supabase_db_${projeto}`, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], sql)

// --- zera e aplica as migrações -------------------------------------------------
console.log("· zerando o banco local")
sh("npx", ["supabase", "db", "reset", "--local", "--no-seed"])

const arquivos = readdirSync(DIR).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()
for (const arquivo of arquivos) {
  try {
    psql(readFileSync(path.join(DIR, arquivo), "utf8"))
  } catch (e) {
    console.error(`✗ ${arquivo}\n${e.stderr ?? e.message}`)
    process.exit(1)
  }
}
console.log(`· ${arquivos.length} migrações aplicadas`)

// --- um usuário por papel -------------------------------------------------------
const USUARIOS = [
  { papel: "Membro", email: "membro@estudante.ufscar.br", nome: "[Teste] Membro", nivel: "Fundamental", cargo: null, frente: "Pesquisa" },
  { papel: "Revisor", email: "revisor@estudante.ufscar.br", nome: "[Teste] Revisora", nivel: "Principal", cargo: null, frente: "Pesquisa" },
  { papel: "Diretoria", email: "diretoria@estudante.ufscar.br", nome: "[Teste] Diretor de Pesquisa", nivel: "Avançada", cargo: "Diretor de Pesquisa", frente: "Pesquisa" },
  { papel: "Admin", email: "admin@estudante.ufscar.br", nome: "[Teste] Presidência", nivel: "Avançada", cargo: "Presidente", frente: null },
]

const ids = {}
for (const u of USUARIOS) {
  const r = await fetch(`${api}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: env.SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: SENHA, email_confirm: true }),
  })
  const corpo = await r.json()
  if (!r.ok) {
    console.error(`✗ ${u.email}: ${JSON.stringify(corpo)}`)
    process.exit(1)
  }
  ids[u.papel] = corpo.id
}

const q = (v) => (v === null ? "null" : `'${String(v).replaceAll("'", "''")}'`)
psql(`
  ${USUARIOS.map((u) => `update public.perfis set nome_completo = ${q(u.nome)}, curso = 'Engenharia (teste)', aprovado = true,
     cargo = ${q(u.cargo)}, frente = ${q(u.frente)}, nivel_formacao = ${q(u.nivel)} where id = '${ids[u.papel]}';`).join("\n")}

  -- dados de exemplo
  insert into public.sprints (frente, titulo, descricao, status, responsavel_id, documento_interfaces)
  values ('Pesquisa', '[Teste] Rover com visão', 'Projeto de exemplo do ambiente de desenvolvimento.', 'Em andamento', '${ids.Diretoria}',
          '/cmd_vel  geometry_msgs/Twist  (navegação → base)');
  insert into public.sprint_tarefas (sprint_id, titulo, pronto_quando, responsavel_id, prazo, criado_por)
  select id, 'Calibrar a câmera', 'matriz intrínseca salva no repositório', '${ids.Membro}', current_date + 5, '${ids.Diretoria}' from public.sprints;
  insert into public.sprint_tarefas (sprint_id, titulo, pronto_quando, prazo, criado_por)
  select id, 'Documentar a pinagem do ESP32', 'tabela no documento de interfaces', current_date - 1, '${ids.Diretoria}' from public.sprints;
  insert into public.sprint_tarefas (titulo, pronto_quando, criado_por)
  values ('Escrever o guia de gravação do ESP32', 'artigo publicado na base de conhecimento', '${ids.Revisor}');
  insert into public.modulos (nivel, titulo, codigo, area, pontos, criterio_aceite) values
    ('Fundamental', 'Gravar firmware no ESP32', 'EMB-01', 'Sistemas Embarcados', 10, 'Vídeo do LED piscando a 1 Hz com o código no repositório'),
    ('Fundamental', 'Publicar e assinar tópicos no ROS 2', 'ROS-01', 'ROS 2', 10, 'Nó publicador e assinante rodando; print do ros2 topic echo'),
    ('Principal', 'Calibrar câmera com OpenCV', 'VIS-01', 'Visão Computacional', 20, 'Matriz intrínseca e erro de reprojeção abaixo de 0,5 px'),
    ('Principal', 'Controle PID de velocidade', 'CTL-01', 'Controle', 20, 'Gráfico de resposta ao degrau com sobressinal abaixo de 10%');
  insert into public.progresso (usuario_id, modulo_id, estado, evidencia_url, enviada_em)
  select '${ids.Membro}', id, 'Enviada', 'https://github.com/GEAR-UFSCar/exemplo-esp32', now() - interval '3 days' from public.modulos where codigo = 'EMB-01';
  -- fase 3: ciclo atual, principal do membro, pautas abertas, gasto acima do limite, material atrasado
  insert into public.ciclos (nome, inicio, fim, meta_pontos) values ('[Teste] Ciclo atual', current_date - 4, current_date + 9, 30);
  update public.sprint_tarefas set tipo = 'principal', ciclo_id = (select id from public.ciclos limit 1) where titulo = 'Calibrar a câmera';
  update public.sprint_tarefas set nivel = 'Fundamental', area = 'Sistemas Embarcados',
         roteiro = E'1. Abra o datasheet do ESP32\n2. Anote no documento de interfaces os GPIOs usados' where titulo = 'Documentar a pinagem do ESP32';
  insert into public.sprint_tarefas (titulo, pronto_quando, nivel, area, roteiro, criado_por) values
    ('Montar o chassi do OSOYOO', 'chassi montado e foto no documento do projeto', 'Fundamental', 'Mecânica', E'1. Retire o kit no inventário\n2. Siga o manual do fabricante', '${ids.Diretoria}'),
    ('Nó ROS 2 de teleoperação', 'rover anda pelo teclado; vídeo no link', 'Principal', 'ROS 2', E'1. Leia o guia Como instalar o ROS 2\n2. Use teleop_twist_keyboard', '${ids.Diretoria}');
  insert into public.pedidos_compra (item, valor_estimado, comprovante_url, solicitante_id, status, data_gasto)
  values ('[Teste] Sensor LiDAR', 320, 'https://exemplo.org/nota', '${ids.Membro}', 'Aguardando aprovação', current_date - 1),
         ('[Teste] Jumpers', 18.5, 'https://exemplo.org/nota2', '${ids.Revisor}', 'Registrado', current_date - 3);
  update public.patrimonio set status = 'Emprestado', emprestado_para = '${ids.Revisor}', responsavel_atual = '[Teste] Revisora',
         devolucao_prevista = current_date - 2 where codigo = 'GEAR-002';
  insert into public.emprestimos (item_id, usuario_id, prazo, retirado_em)
  select id, '${ids.Revisor}', current_date - 2, now() - interval '9 days' from public.patrimonio where codigo = 'GEAR-002';
  insert into public.eventos (titulo, tipo, escopo, data_inicio, criado_por)
  values ('[Teste] Reunião geral', 'Reunião', 'Interno', now() + interval '2 days', '${ids.Admin}'),
         ('[Teste] Prazo de inscrição CBR', 'Prazo', 'Externo', now() + interval '10 days', '${ids.Admin}');
`)

// --- .env do Next apontando para o local ----------------------------------------
// .env.development.local só vale no `npm run dev` e está no .gitignore (.env*).
writeFileSync(
  path.join(RAIZ, ".env.development.local"),
  `# Gerado por scripts/dev-banco.mjs: Supabase LOCAL. Não use em produção.\nNEXT_PUBLIC_SUPABASE_URL=${api}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}\n`,
)

console.log(`\nPronto. Senha de todos: ${SENHA}`)
for (const u of USUARIOS) console.log(`  ${u.papel.padEnd(10)} ${u.email}  (${u.nivel}${u.cargo ? `, ${u.cargo}` : ""})`)
console.log("\nRode `npm run dev` e entre em http://localhost:3000/entrar")
