"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Bell, ChevronDown, GraduationCap, Home, LogOut, Search, Settings, Target, Users, type LucideIcon } from "lucide-react"

import { Paleta } from "@/components/membros/paleta"
import { abaAtual, grupoAtual, gruposVisiveis, titulo as tituloDaRota } from "@/lib/navegacao"
import { iniciais } from "@/lib/administracao"

/** Ícone de cada grupo na barra inferior do celular. */
const ICONES: Record<string, LucideIcon> = {
  hoje: Home,
  frente: Target,
  aprender: GraduationCap,
  equipe: Users,
  gestao: Settings,
}

type Props = {
  nome: string
  /** Cargo do perfil; vazio vira "Membro" na etiqueta. */
  cargo: string | null
  comCargo: boolean
  /** Cadastros esperando aprovação; vira contador na aba Gestão. */
  pendentes: number
  /** Novidades desde a última visita a /membros/novidades (033); vira número no sino. */
  novidades: number
  /** Server Action de logout, definida no layout. */
  sair: () => Promise<void>
}

/**
 * Casca de navegação da área de membros.
 *
 * DESKTOP: barra de 56px com os grupos e, quando o grupo tem mais de uma aba,
 * uma segunda linha com elas.
 *
 * CELULAR: a barra de cima mostra só a tela atual (os grupos não cabem em 390px
 * e Equipe/Gestão ficavam escondidos atrás de uma rolagem sem indício). Os
 * grupos vão para uma barra inferior fixa, ao alcance do polegar, e as abas do
 * grupo ganham um esmaecido na borda que avisa que há mais para rolar.
 *
 * `sticky` e não `fixed`: a barra ocupa altura real no fluxo, então nenhuma
 * página precisa compensar com padding-top. `nao-imprimir` porque a aba ProEx
 * de Métricas é feita para virar papel.
 */
export function MembrosShell({ nome, cargo, comCargo, pendentes, novidades, sair }: Props) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const menu = useRef<HTMLDivElement>(null)

  const abas = useRef<HTMLUListElement>(null)

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

  // A aba ativa precisa estar visível: com cinco abas, "Métricas" nasce fora da tela.
  useEffect(() => {
    abas.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({
      inline: "center",
      block: "nearest",
    })
  }, [pathname])

  // Fecha ao navegar, durante o render (um efeito pintaria o menu aberto por um frame).
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname)
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname)
    setAberto(false)
  }

  const inicial = iniciais(nome).charAt(0)
  const etiquetaCargo = cargo?.trim() || "Membro"

  return (
    <>
    <div className="nao-imprimir sticky top-0 z-50 border-b border-linha bg-[var(--gear-navy)]/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4 md:gap-6 md:px-8">
        <Link href="/membros" className="flex shrink-0 items-center gap-2" aria-label="GEAR, início da área de membros">
          <Image src="/gear-icon-g.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="hidden font-sans text-base font-semibold tracking-tight sm:block">GEAR</span>
        </Link>

        {/* Celular: o nome da tela. Os grupos estão na barra de baixo. */}
        <p className="min-w-0 flex-1 truncate font-sans text-base md:hidden" aria-hidden="true">
          {tituloDaRota(pathname)}
        </p>

        <nav aria-label="Grupos da área de membros" className="hidden min-w-0 flex-1 overflow-x-auto md:block">
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
                    {g.id === "gestao" && pendentes > 0 && (
                      <span
                        aria-label={`${pendentes} cadastro(s) aguardando aprovação`}
                        className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gear-amber)] px-1.5 font-mono text-[10px] text-[var(--gear-ink)]"
                      >
                        {pendentes}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <Link
          href="/membros/novidades"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={novidades > 0 ? `Novidades: ${novidades} ${novidades === 1 ? "nova" : "novas"}` : "Novidades"}
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {novidades > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 min-w-4 bg-[var(--gear-amber)] px-1 text-center font-mono text-[9px] leading-4 text-[var(--gear-ink)]"
            >
              {novidades > 9 ? "9+" : novidades}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("membros:paleta"))}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Buscar telas"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>

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
                <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gear-amber)]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--gear-amber)]" />
                  Ambiente interno
                </p>
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
        <nav
          aria-label={`Seções de ${grupo.rotulo}`}
          className="overflow-x-auto border-t border-linha [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-32px),transparent)] md:[mask-image:none]"
        >
          <ul ref={abas} className="flex min-w-max items-stretch px-4 md:px-8">
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
    {/* Celular: grupos ao alcance do polegar. `fixed` fora da barra de cima pelo mesmo motivo do backdrop-filter. */}
    <nav
      aria-label="Grupos da área de membros"
      className="nao-imprimir fixed inset-x-0 bottom-0 z-50 border-t border-linha bg-[var(--gear-navy)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch">
        {grupos.map((g) => {
          const ativo = grupo?.id === g.id
          const Icone = ICONES[g.id] ?? Home
          return (
            <li key={g.id} className="flex-1">
              <Link
                href={g.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 font-sans text-[11px] leading-none transition-colors duration-200 ${
                  ativo ? "text-[var(--gear-amber)]" : "text-muted-foreground"
                }`}
              >
                <Icone aria-hidden="true" className="h-5 w-5" strokeWidth={ativo ? 2.25 : 1.75} />
                {g.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
    {/* Fora da barra: backdrop-filter faz de um ancestral o bloco de contenção de filhos fixed. */}
    <Paleta comCargo={comCargo} />
    </>
  )
}
