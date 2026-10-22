"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { destinosDaPaleta, type Destino } from "@/lib/navegacao"

/**
 * Diálogo de navegação por teclado. Lista as telas que o usuário pode ver
 * (derivada de GRUPOS) mais alguns atalhos de criação. Abre com Ctrl+K ou
 * Cmd+K, ou pelo botão da barra (evento "membros:paleta").
 */
export function Paleta({ comCargo }: { comCargo: boolean }) {
  const router = useRouter()
  const [aberta, setAberta] = useState(false)
  const [busca, setBusca] = useState("")
  const [indice, setIndice] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const quemAbriu = useRef<HTMLElement | null>(null)

  const destinos = useMemo(() => destinosDaPaleta(comCargo), [comCargo])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo ? destinos.filter((d) => `${d.rotulo} ${d.detalhe}`.toLowerCase().includes(termo)) : destinos
  }, [busca, destinos])

  const fechar = () => {
    setAberta(false)
    setBusca("")
    setIndice(0)
    quemAbriu.current?.focus()
  }

  useEffect(() => {
    const abrir = () => {
      quemAbriu.current = document.activeElement as HTMLElement | null
      setAberta(true)
    }
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener("keydown", tecla)
    window.addEventListener("membros:paleta", abrir)
    return () => {
      window.removeEventListener("keydown", tecla)
      window.removeEventListener("membros:paleta", abrir)
    }
  }, [])

  useEffect(() => {
    if (aberta) entrada.current?.focus()
  }, [aberta])

  if (!aberta) return null

  const ir = (d: Destino | undefined) => {
    if (!d) return
    fechar()
    router.push(d.href)
  }

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return fechar()
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndice((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndice((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      ir(filtrados[indice])
    } else if (e.key === "Tab") {
      // Foco preso: só há um campo e a lista; Tab não deve sair do diálogo.
      e.preventDefault()
    }
  }

  return (
    <div
      className="nao-imprimir fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && fechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ir para uma tela"
        onKeyDown={aoTeclar}
        className="w-full max-w-lg border border-white/15 bg-[var(--gear-ink)] shadow-2xl"
      >
        <input
          ref={entrada}
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setIndice(0)
          }}
          placeholder="Ir para…"
          aria-label="Buscar tela"
          role="combobox"
          aria-expanded="true"
          aria-controls="paleta-lista"
          aria-activedescendant={filtrados[indice] ? `paleta-${indice}` : undefined}
          className="min-h-12 w-full border-b border-white/10 bg-transparent px-4 font-sans text-base outline-none placeholder:text-muted-foreground/60"
        />
        <ul id="paleta-lista" role="listbox" className="max-h-72 overflow-y-auto py-1">
          {filtrados.length === 0 && (
            <li className="px-4 py-3 font-sans text-sm font-light text-muted-foreground">Nenhuma tela encontrada.</li>
          )}
          {filtrados.map((d, i) => (
            <li
              key={`${d.href}-${d.rotulo}`}
              id={`paleta-${i}`}
              role="option"
              aria-selected={i === indice}
              onMouseEnter={() => setIndice(i)}
              onClick={() => ir(d)}
              className={`flex min-h-11 cursor-pointer items-center justify-between px-4 font-sans text-sm ${
                i === indice ? "bg-[var(--gear-navy)] text-[var(--gear-amber)]" : "text-foreground"
              }`}
            >
              {d.rotulo}
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{d.detalhe}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
