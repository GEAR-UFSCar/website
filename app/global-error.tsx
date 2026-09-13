"use client"

/*
 * Rede de segurança do próprio layout raiz. Diferente de error.tsx, substitui
 * <html> e <body> inteiros — por isso não pode usar Navbar, Footer nem as
 * fontes, que vivem no layout que acabou de falhar. Estilo inline, sem
 * depender de nada que possa estar quebrado.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#081726",
          color: "#EDF1F4",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "36rem" }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.3em",
              color: "#FF7A2F",
              margin: 0,
            }}
          >
            GEAR · ERRO CRÍTICO
          </p>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 300, margin: "1rem 0 0" }}>
            O site não conseguiu carregar
          </h1>
          <p style={{ lineHeight: 1.7, color: "#AEBAC4", marginTop: "1.5rem" }}>
            A falha atingiu a base da aplicação. Recarregar é a primeira coisa a tentar; se
            continuar, avise a diretoria.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.7rem",
                color: "#AEBAC4",
                marginTop: "1.5rem",
              }}
            >
              Código da ocorrência: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "1rem 2rem",
              background: "transparent",
              border: "1px solid #FF7A2F",
              color: "#FF7A2F",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  )
}
