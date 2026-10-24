/**
 * Gera o SQL que carrega o inventário no banco a partir do CSV da planilha.
 *
 *   npm run inventario:sql -- Inventario.csv > importar.sql
 *
 * O CSV é a aba "Inventário" baixada do Google Planilhas (Arquivo → Fazer
 * download → Valores separados por vírgulas) — ou a exportação do próprio site.
 * O SQL sai na saída padrão e vai para o SQL Editor do Supabase; avisos e erros
 * saem na saída de erro, para o redirecionamento não os misturar com o SQL.
 *
 * O comando gerado é UM `insert … on conflict (codigo) do nothing`:
 *   · atômico — entra tudo ou nada;
 *   · seguro de repetir — itens já cadastrados não são tocados, então o que a
 *     diretoria editou no site (localização, responsável, status) sobrevive;
 *   · só acrescenta. Para MUDAR um item que já existe, edite-o no site.
 *
 * O arquivo CSV não fica no repositório (que é público): traz o nome de quem
 * cedeu o material. Só este gerador e as regras (lib/inventario.ts) ficam.
 *
 * Sai com código 1 se alguma linha for recusada, sem imprimir SQL: importação
 * pela metade é pior que nenhuma.
 */

import { readFileSync } from "node:fs"

import { lerPlanilha, resumir, sqlDeImportacao } from "../lib/inventario.ts"

const arquivo = process.argv[2]
if (!arquivo) {
  console.error("Uso: npm run inventario:sql -- Inventario.csv > importar.sql")
  process.exit(2)
}

const { itens, avisos, erros } = lerPlanilha(readFileSync(arquivo, "utf8"))

for (const a of avisos) console.error(`aviso: ${a}`)
if (erros.length > 0) {
  for (const e of erros) console.error(`ERRO: ${e}`)
  console.error(`\n${erros.length} linha(s) recusada(s). Nada foi gerado.`)
  process.exit(1)
}

const r = resumir(itens)
console.error(`${r.itens} itens, ${r.unidades} unidades, ${r.semEstado} sem estado, ${avisos.length} aviso(s).`)
process.stdout.write(sqlDeImportacao(itens))
