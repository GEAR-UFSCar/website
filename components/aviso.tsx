import type { ReactNode } from "react"

type Props = {
  /** Linha mono em maiúsculas no topo da caixa. */
  titulo: string
  /** "alerta" destaca em âmbar; "neutro" é só informativo. */
  tom?: "alerta" | "neutro"
  /** Espaçamento e largura ficam com quem usa. */
  className?: string
  children: ReactNode
  /** Erro real da aplicação vira role="alert" para o leitor de tela. */
  role?: "alert" | "status"
}

/**
 * Caixa de aviso da identidade GEAR. Era o mesmo bloco de seis linhas
 * repetido em cada página que precisava explicar um erro ou uma pendência.
 */
export function Aviso({ titulo, tom = "alerta", className = "", children, role }: Props) {
  const borda = tom === "alerta" ? "border-[var(--gear-amber)]" : "border-white/20"
  const corTitulo = tom === "alerta" ? "text-[var(--gear-amber)]" : "text-muted-foreground"
  // Erro que a pessoa precisa ler agora vai em contraste cheio; explicação de
  // estado (pendência, aviso de configuração) fica no tom secundário.
  const corTexto = role ? "text-foreground" : "text-muted-foreground"

  return (
    <div role={role} className={`border ${borda} bg-[var(--gear-navy)] p-5 ${className}`}>
      <p className={`font-mono text-[9px] tracking-[0.3em] ${corTitulo} mb-2`}>{titulo}</p>
      <div className={`font-sans text-sm font-light leading-relaxed ${corTexto}`}>
        {children}
      </div>
    </div>
  )
}
