"use client"

import { useEffect } from "react"
import Link from "next/link"

import { botaoPrimario, botaoSecundario } from "@/lib/ui"

/*
 * Fronteira de erro das rotas. Sem ela, qualquer exceção não tratada — uma
 * consulta ao Supabase que falha, uma coluna que não existe porque a migração
 * não rodou — mostrava a tela padrão do Next, fora da identidade e sem saída.
 *
 * `reset()` remonta o segmento sem recarregar a página: erro transitório de
 * rede se resolve no botão, sem perder a sessão.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // O digest é o que liga esta tela à entrada correspondente no log do
    // servidor; a mensagem em si não é exposta ao usuário de propósito.
    console.error("Erro na rota:", error.digest ?? error.message)
  }, [error])

  return (
    <main>
      <section className="relative mx-auto max-w-4xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--gear-amber)] mb-4">ERRO</p>
        <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
          Alguma coisa
          <br />
          <span className="italic">quebrou aqui</span>
        </h1>

        <p className="mt-8 max-w-[62ch] font-sans text-lg font-light leading-relaxed text-muted-foreground">
          Não foi você. Esta parte do site falhou ao carregar — pode ser uma instabilidade
          momentânea. Tentar de novo costuma resolver; se insistir, o resto do site continua de pé.
        </p>

        {error.digest && (
          <p className="mt-6 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            Código da ocorrência: {error.digest}
          </p>
        )}

        <div className="mt-12 flex flex-col sm:flex-row gap-5">
          <button type="button" onClick={reset} data-cursor-hover className={`text-center ${botaoPrimario}`}>
            Tentar de novo
          </button>
          <Link href="/" data-cursor-hover className={`text-center ${botaoSecundario}`}>
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  )
}
