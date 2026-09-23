"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  FileText,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react"

import { ABAS, abaAtual, migalha } from "@/lib/navegacao"

const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  ChartNoAxesColumn,
  CalendarDays,
  GraduationCap,
  Target,
  GitBranch,
  Megaphone,
  Users,
  FileText,
  Settings,
}

type Props = {
  nome: string
  /** Cargo do perfil; vazio vira "MEMBRO" na etiqueta. */
  cargo: string | null
  comCargo: boolean
  /** Server Action de logout, definida no layout. */
  sair: () => Promise<void>
}

/**
 * Casca de navegação da área de membros: barra de identidade em cima, abas
 * embaixo. Cliente por necessidade — `usePathname` decide a aba atual e a
 * migalha, e o menu do usuário tem estado aberto/fechado.
 *
 * `sticky` e não `fixed`: as duas barras ocupam altura real no fluxo, então
 * nenhuma página precisa compensar com padding-top adivinhado — e o dia em
 * que a barra ganhar uma linha, nada abaixo dela quebra.
 */
export function MembrosShell({ nome, cargo, comCargo, sair }: Props) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const menu = useRef<HTMLDivElement>(null)

  const abas = ABAS.filter((a) => !a.exigeCargo || comCargo)
  const atual = abaAtual(pathname, abas)
  const { secao, titulo } = migalha(pathname)

  // Fecha ao clicar fora e no Esc: um menu que só fecha pelo próprio botão
  // fica aberto atrás do conteúdo quando a pessoa desiste dele.
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

  // Fecha ao navegar: sem isto o menu sobrevive à troca de aba. Ajuste
  // durante o render, não em efeito — o efeito pintava o menu aberto na rota
  // nova por um frame antes de fechá-lo.
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname)
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname)
    setAberto(false)
  }

  const inicial = nome.trim().charAt(0).toUpperCase() || "?"

  return (
    /*
     * Navy nas duas barras, ink na página (--background). Navy #0B2138 é mais
     * claro que ink #081726, então a casca se destaca do conteúdo sem precisar
     * de sombra — a borda inferior só fecha o desenho.
     *
     * `nao-imprimir` na casca inteira porque a regra de @media print esconde
     * header, nav e footer, e esta barra é uma <div>: sem a classe, a aba ProEx
     * de /membros/metricas saía em papel com a identidade e o menu do usuário
     * em cima do anexo. O <nav> das abas já sumia; a camada de cima, não.
     */
    <div className="nao-imprimir sticky top-0 z-50 border-b border-white/10 bg-[var(--gear-navy)]/95 backdrop-blur-md">
      {/* CAMADA 1 — identidade, migalha, usuário */}
      <div className="flex items-center gap-4 border-b border-white/10 px-5 py-3 md:gap-8 md:px-10">
        <Link
          href="/membros"
          data-cursor-hover
          className="flex shrink-0 items-center gap-3"
          aria-label="Área de membros da GEAR"
        >
          <Image src="/gear-icon-g.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="hidden sm:block">
            <span className="block font-sans text-lg font-semibold leading-none tracking-tight">
              GEAR
            </span>
            <span className="mt-1 block font-mono text-[10px] md:text-[9px] leading-none tracking-[0.2em] text-muted-foreground">
              ÁREA DE MEMBROS
            </span>
          </span>
        </Link>

        <Link
          href="/"
          data-cursor-hover
          className="hidden shrink-0 items-center border border-white/20 px-3 py-2 font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground transition-colors duration-300 hover:border-[var(--gear-amber)] hover:text-[var(--gear-amber)] lg:inline-flex"
        >
          Site principal ↗
        </Link>

        {/*
          A migalha é o h1 da página: ela nomeia o que está na tela, e por
          estar no layout evita que cada página repita o próprio nome logo
          abaixo da barra que já o mostra.
        */}
        <div className="min-w-0 flex-1 border-l border-white/10 pl-4 md:pl-8">
          <p className="truncate font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-[var(--gear-amber)]">
            {secao}
          </p>
          <h1 className="mt-1 truncate font-sans text-base md:text-xl font-light tracking-tight">
            {titulo}
          </h1>
        </div>

        {/* MENU DO USUÁRIO */}
        <div ref={menu} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-haspopup="menu"
            data-cursor-hover
            className="flex min-h-11 items-center gap-3 border border-transparent px-2 py-1 transition-colors duration-300 hover:border-white/20"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gear-amber)] font-sans text-sm font-semibold text-[var(--gear-ink)]"
            >
              {inicial}
            </span>
            <span className="hidden text-left md:block">
              <span className="block max-w-[12rem] truncate font-sans text-sm font-light leading-tight">
                {nome}
              </span>
              <span className="block font-mono text-[10px] md:text-[9px] leading-tight tracking-[0.2em] uppercase text-muted-foreground">
                {cargo?.trim() || "Membro"}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                aberto ? "rotate-180" : ""
              }`}
            />
          </button>

          {aberto && (
            <div
              role="menu"
              /*
                Ink, não navy: a barra passou a ser navy, e um menu da mesma
                cor do que está atrás dele perde a borda de vista. O mais
                escuro é o que faz o painel ler como camada por cima.
              */
              className="absolute right-0 top-full z-50 mt-2 w-56 border border-white/15 bg-[var(--gear-ink)] p-2 shadow-2xl"
            >
              <div className="border-b border-white/10 px-3 pb-3 pt-2 md:hidden">
                <p className="truncate font-sans text-sm font-light">{nome}</p>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {cargo?.trim() || "Membro"}
                </p>
              </div>

              <Link
                href="/membros/completar-perfil"
                role="menuitem"
                data-cursor-hover
                className="flex min-h-11 items-center px-3 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
              >
                Editar perfil
              </Link>
              <Link
                href="/"
                role="menuitem"
                data-cursor-hover
                className="flex min-h-11 items-center px-3 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)] lg:hidden"
              >
                Site principal ↗
              </Link>

              {/*
                Server Action num <form>: o logout limpa o cookie no servidor.
                Um signOut só no cliente deixaria a sessão viva para os Server
                Components até o cookie expirar.
              */}
              <form action={sair} className="border-t border-white/10 pt-1">
                <button
                  type="submit"
                  role="menuitem"
                  data-cursor-hover
                  className="flex min-h-11 w-full items-center gap-2 px-3 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground transition-colors duration-300 hover:text-[var(--gear-amber)]"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* CAMADA 2 — abas */}
      <nav aria-label="Seções da área de membros" className="overflow-x-auto">
        <ul className="flex min-w-max items-stretch px-5 md:px-10">
          {abas.map((aba) => {
            const Icone = ICONES[aba.icone]
            const ativa = atual?.href === aba.href

            return (
              <li key={aba.href}>
                <Link
                  href={aba.href}
                  aria-current={ativa ? "page" : undefined}
                  data-cursor-hover
                  /*
                   * Mesma gramática de estado de frente-abas.tsx: aria-current
                   * na ativa e âmbar como marca. O destaque é sublinhado mais
                   * uma lavagem de âmbar, não bloco cheio — numa fileira de
                   * dez, dez blocos âmbar de largura variável viram ruído, mas
                   * o sublinhado sozinho sumia contra o navy da barra.
                   */
                  className={`flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors duration-300 md:px-4 ${
                    ativa
                      ? "border-[var(--gear-amber)] bg-[var(--gear-amber)]/10 text-[var(--gear-amber)]"
                      : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icone aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>{aba.rotulo}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
