"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { campoBase } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"
import { acaoAmbar } from "@/components/tarefa-item"

/**
 * Documento de interfaces do projeto (042): o "contrato" entre subsistemas
 * (tópicos ROS 2 e mensagens, pinagem, dimensões) ou um link para ele. Quem
 * participa do projeto edita; mudar o contrato é "avisa, mas não espera".
 */
export function SprintInterfaces({ id, valor, podeEditar }: { id: string; valor: string | null; podeEditar: boolean }) {
  const router = useRouter()
  const original = valor ?? ""
  const [rascunho, setRascunho] = useState(original)
  const [salvando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  if (!podeEditar && !original.trim()) return null

  const gravar = async () => {
    setErro(null)
    const { data, error } = await createClient()
      .from("sprints")
      .update({ documento_interfaces: rascunho.trim() || null })
      .eq("id", id)
      .select("id")
    if (error) return setErro(mensagemSegura(error))
    if (!data?.length) return setErro("Nada mudou: você precisa participar do projeto.")
    iniciar(() => router.refresh())
  }

  return (
    <details className="mt-6 border-t border-linha pt-5">
      <summary className="cursor-pointer font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-[var(--gear-amber)]">
        Documento de interfaces{original.trim() ? "" : " · vazio"}
      </summary>
      {podeEditar ? (
        <div className="mt-3 grid gap-2">
          <label htmlFor={`interfaces-${id}`} className="sr-only">Documento de interfaces</label>
          <textarea
            id={`interfaces-${id}`}
            rows={8}
            maxLength={20000}
            value={rascunho}
            placeholder={"/cmd_vel  geometry_msgs/Twist  (navegação → base)\nESP32 GPIO 25 → PWM motor esquerdo\nChassi: 240 × 180 mm\n…ou o link do documento"}
            onChange={(e) => setRascunho(e.target.value)}
            disabled={salvando}
            className={`${campoBase} font-mono text-xs placeholder:text-muted-foreground/40`}
          />
          <button type="button" onClick={() => void gravar()} disabled={salvando || rascunho === original} className={`${acaoAmbar} justify-self-start`}>
            Salvar contrato
          </button>
        </div>
      ) : (
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{original}</pre>
      )}
      {erro && <p role="alert" className="mt-1 font-mono text-[10px] text-[var(--gear-amber)]">{erro}</p>}
    </details>
  )
}
