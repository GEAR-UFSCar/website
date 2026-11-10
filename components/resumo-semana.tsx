"use client"

import { useState } from "react"

import { botaoSecundario } from "@/lib/ui"

/**
 * Copia o resumo da semana da trilha, já montado no servidor. É o que vai
 * para o grupo: o site guarda o registro, o grupo recebe o aviso.
 */
export function ResumoSemana({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<"parado" | "copiado" | "manual">("parado")

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setEstado("copiado")
    } catch {
      // sem permissão de área de transferência: mostra o texto para copiar à mão
      setEstado("manual")
    }
  }

  return (
    <div className="mt-8">
      <button type="button" onClick={copiar} data-cursor-hover className={botaoSecundario}>
        {estado === "copiado" ? "Resumo copiado" : "Copiar resumo da semana"}
      </button>
      <p aria-live="polite" className="mt-2 font-mono text-[10px] text-muted-foreground">
        {estado === "copiado" && "Cole no grupo da trilha."}
      </p>
      {estado === "manual" && (
        <textarea readOnly value={texto} rows={10} aria-label="Resumo da semana" className="mt-2 w-full max-w-2xl border border-linha bg-transparent p-3 font-mono text-[11px]" />
      )}
    </div>
  )
}
