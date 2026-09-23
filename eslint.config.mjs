import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

/*
 * Configuração oficial do Next 16 (node_modules/next/dist/docs/.../03-eslint.md).
 * O script `lint` existia no package.json sem ESLint instalado nem este
 * arquivo — `npm run lint` falhava antes de olhar qualquer código.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])
