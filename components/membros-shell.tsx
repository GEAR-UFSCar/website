"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut } from "lucide-react"

import { Paleta } from "@/components/membros/paleta"
import { abaAtual, grupoAtual, gruposVisiveis } from "@/lib/navegacao"

type Props = {
  nome: string
  /** Cargo do perfil; vazio vira "Membro" na etiqueta. */
  cargo: string | null
  comCargo: boolean
  /** Server Action de logout, definida no layout. */
  sair: () => Promise<void>
}

/**
 * Casca de navegação da área de membros: uma barra de 56px com os grupos e,
 * quando o grupo tem mais de uma aba, uma segunda linha com elas.
 *
 * `sticky` e não `fixed`: a barra ocupa altura real no fluxo, então nenhuma
 * página precisa compensar com padding-top. `nao-imprimir` porque a aba ProEx
 * de Métricas é feita para virar papel.
 */
export function MembrosShell({ nome, cargo, comCargo, sair }: Props) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const menu = useRef<HTMLDivElement>(null)

  const grupos = gruposVisiveis(comCargo)
  const grupo = grupoAtual(pathname, grupos)
  const aba = abaAtual(pathname, grupo)

  // Fecha ao clicar fora e no Esc.
  useEffect(() => {
    if (!aberto) return
    const clique = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("mousedown", clique)
    document.addEventListener("keydown", tecla)
    return () => {
      document.removeEventListener("mousedown", clique)
      document.removeEventListener("keydown", tecla)
    }
  }, [aberto])

  // Fecha ao navegar, durante o render (um efeito pintaria o menu aberto por um frame).
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname)
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname)
    setAberto(false)
  }

  const inicial = nome.trim().charAt(0).toUpperCase() || "?"
  const etiquetaCargo = cargo?.trim() || "Membro"

  return (
    <>
    <div className="nao-imprimir sticky top-0 z-50 border-b border-linha bg-[var(--gear-navy)]/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4 md:gap-6 md:px-8">
        <Link href="/membros" className="flex shrink-0 items-center gap-2" aria-label="GEAR, início da área de membros">
          <Image src="/gear-icon-g.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="hidden font-sans text-base font-semibold tracking-tight sm:block">GEAR</span>
        </Link>

        <nav aria-label="Grupos da área de membros" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex min-w-max items-stretch">
            {grupos.map((g) => {
              const ativo = grupo?.id === g.id
              return (
                <li key={g.id}>
                  <Link
                    href={g.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex h-14 items-center border-b-2 px-3 font-sans text-sm transition-colors duration-200 md:px-4 ${
                      ativo
                        ? "border-[var(--gear-amber)] text-[var(--gear-amber)]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.rotulo}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("membros:paleta"))}
          className="hidden min-h-11 items-center gap-2 border border-linha-forte px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:border-white/40 hover:text-foreground md:inline-flex"
          aria-label="Abrir busca de telas (Ctrl+K)"
        >
          Ir para…
          <kbd className="border border-linha-forte px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>

        <div ref={menu} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-haspopup="menu"
            className="flex min-h-11 items-center gap-2 px-1"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gear-amber)] font-sans text-sm font-semibold text-[var(--gear-ink)]"
            >
              {inicial}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
            />
          </button>

          {aberto && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 border border-linha-forte bg-[var(--gear-ink)] p-2 shadow-2xl"
            >
              <div className="border-b border-linha px-3 pb-3 pt-2">
                <p className="truncate font-sans text-sm">{nome}</p>
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{etiquetaCargo}</p>
              </div>
              <Link
                href="/membros/completar-perfil"
                role="menuitem"
                className="flex min-h-11 items-center px-3 font-sans text-sm text-muted-foreground hover:text-[var(--gear-amber)]"
              >
                Editar perfil
              </Link>
              <Link
                href="/"
                role="menuitem"
                className="flex min-h-11 items-center px-3 font-sans text-sm text-muted-foreground hover:text-[var(--gear-amber)]"
              >
                Site principal
              </Link>
              {/* Server Action: o logout limpa o cookie de sessão no servidor. */}
              <form action={sair} className="border-t border-linha pt-1">
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center gap-2 px-3 font-sans text-sm text-muted-foreground hover:text-[var(--gear-amber)]"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {grupo && grupo.abas.length > 1 && (
        <nav aria-label={`Seções de ${grupo.rotulo}`} className="overflow-x-auto border-t border-linha">
          <ul className="flex min-w-max items-stretch px-4 md:px-8">
            {grupo.abas.map((a) => {
              const ativa = aba?.href === a.href
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    aria-current={ativa ? "page" : undefined}
                    className={`flex min-h-11 items-center border-b-2 px-3 font-sans text-sm transition-colors duration-200 ${
                      ativa
                        ? "border-[var(--gear-amber)] text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.rotulo}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

    </div>
    {/* Fora da barra: backdrop-filter faz de um ancestral o bloco de contenção de filhos fixed. */}
    <Paleta comCargo={comCargo} />
    </>
  )
}
