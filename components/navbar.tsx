"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { AuthLink } from "@/components/auth-link"

const navLinks = [
  { label: "Sobre", href: "/sobre" },
  { label: "Projetos", href: "/projetos" },
  { label: "Time", href: "/time" },
  { label: "Parceiros", href: "/parceiros" },
  { label: "Ingressar", href: "/ingressar" },
]

export function Navbar() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    // passive: o handler nunca chama preventDefault, e avisar o browser disso
    // tira o listener do caminho crítico da rolagem.
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? "bg-background/80 backdrop-blur-md border-b border-border" : ""
        }`}
      >
        <nav className="flex items-center justify-between px-6 py-4 my-0 md:px-12 md:py-5">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2" aria-label="GEAR — página inicial">
            <Image src="/gear-icon-g.svg" alt="GEAR" width={32} height={32} priority className="w-8 h-8" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent group-hover:scale-150 transition-transform duration-300" />
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link, index) => {
              const ativo = pathname === link.href

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`group relative font-mono text-xs tracking-wider transition-colors duration-300 ${
                      ativo ? "text-[var(--gear-amber)]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-accent mr-1">0{index + 1}</span>
                    {link.label.toUpperCase()}
                    {/* na rota ativa o sublinhado já nasce inteiro, em âmbar */}
                    <span
                      className={`absolute -bottom-1 left-0 h-px transition-all duration-300 ${
                        ativo
                          ? "w-full bg-[var(--gear-amber)]"
                          : "w-0 bg-foreground group-hover:w-full"
                      }`}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Entrar / Membros, conforme a sessão */}
          <AuthLink className="hidden lg:inline-block font-mono text-xs tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-300" />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Abrir menu"
            aria-expanded={isMenuOpen}
          >
            <motion.span
              animate={isMenuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
              className="w-6 h-px bg-foreground origin-center"
            />
            <motion.span
              animate={isMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
              className="w-6 h-px bg-foreground"
            />
            <motion.span
              animate={isMenuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
              className="w-6 h-px bg-foreground origin-center"
            />
          </button>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-lg lg:hidden"
          >
            <nav className="flex flex-col items-center justify-center h-full gap-8">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`group text-3xl sm:text-4xl font-sans tracking-tight ${
                      pathname === link.href ? "text-[var(--gear-amber)]" : "text-foreground"
                    }`}
                  >
                    <span className="text-accent font-mono text-sm mr-2">0{index + 1}</span>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <AuthLink
                  onNavigate={() => setIsMenuOpen(false)}
                  className="font-mono text-xs tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-300"
                />
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
