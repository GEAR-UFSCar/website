/**
 * Anel de progresso de um estágio da Academia.
 *
 * Server Component de propósito: é geometria, não interação — nada aqui
 * precisa de estado no navegador, então não custa um byte de JS ao cliente.
 *
 * O traço tem ponta reta (`butt`, o padrão) em vez de arredondada: a mesma
 * decisão do check em modulo-checkbox.tsx, que usa strokeLinecap="square".
 * Ponta redonda suavizaria a única forma curva da página inteira, e a direção
 * estética do GEAR é brutalista — a curva já é concessão bastante.
 */

/* Raio e traço em unidades do viewBox de 48. r=21 deixa o traço de 3 inteiro
   dentro da caixa (21 + 1,5 = 22,5 < 24), sem depender de overflow visível. */
const RAIO = 21
const TRACO = 3
const VOLTA = 2 * Math.PI * RAIO

type Props = {
  /** Módulos concluídos neste nível. */
  feitos: number
  /** Total de módulos do nível. */
  total: number
  /** Nível travado pinta o anel em cinza, não em âmbar. */
  travado?: boolean
  className?: string
}

export function AnelProgresso({ feitos, total, travado = false, className }: Props) {
  const percentual = total > 0 ? Math.round((feitos / total) * 100) : 0
  const completo = total > 0 && feitos === total

  return (
    <div
      className={`relative shrink-0 ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={feitos}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${feitos} de ${total} módulos concluídos`}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden="true">
        {/* trilho */}
        <circle
          cx="24"
          cy="24"
          r={RAIO}
          fill="none"
          stroke="var(--gear-navy)"
          strokeWidth={TRACO}
        />
        {/* avanço — dashoffset vai da volta inteira (0%) a zero (100%) */}
        {percentual > 0 && (
          <circle
            cx="24"
            cy="24"
            r={RAIO}
            fill="none"
            stroke={travado ? "var(--gear-slate)" : "var(--gear-amber)"}
            strokeWidth={TRACO}
            strokeDasharray={VOLTA}
            strokeDashoffset={VOLTA * (1 - percentual / 100)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        )}
      </svg>

      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-tight ${
          travado
            ? "text-muted-foreground"
            : completo
              ? "text-[var(--gear-amber)]"
              : "text-foreground"
        }`}
      >
        {completo ? (
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path
              d="M3 8.5l3.5 3.5L13 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        ) : (
          `${percentual}%`
        )}
      </span>
    </div>
  )
}
