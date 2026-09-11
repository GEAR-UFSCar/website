"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

import { createClient } from "@/lib/supabase/client"

type Modo = "entrar" | "criar"

/*
 * Domínios institucionais aceitos no CADASTRO. O login não é filtrado: quem
 * já tem conta entra normalmente, inclusive se a conta veio de outro domínio.
 */
const DOMINIOS_PERMITIDOS = ["estudante.ufscar.br", "ufscar.br"]

function eInstitucional(email: string) {
  const dominio = email.trim().toLowerCase().split("@")[1]
  return Boolean(dominio) && DOMINIOS_PERMITIDOS.includes(dominio)
}

const campoBase =
  "w-full bg-[var(--gear-ink)] border border-white/15 px-4 py-3 font-sans text-base font-light text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors duration-300 focus:border-[var(--gear-amber)] disabled:opacity-50"

export function Entrar() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>("entrar")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [nome, setNome] = useState("")
  const [curso, setCurso] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const trocarModo = (novo: Modo) => {
    setModo(novo)
    setErro(null)
    setAviso(null)
  }

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setCarregando(true)

    const supabase = createClient()

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setErro(error.message)
        setCarregando(false)
        return
      }
      // refresh para os Server Components enxergarem o cookie novo
      router.refresh()
      router.push("/membros")
      return
    }

    // Só o cadastro exige e-mail institucional.
    if (!eInstitucional(email)) {
      setErro("Use seu e-mail institucional da UFSCar para se cadastrar.")
      setCarregando(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      // lido pelo trigger handle_new_user() para preencher public.perfis
      options: { data: { nome_completo: nome.trim(), curso: curso.trim() } },
    })
    if (error) {
      setErro(error.message)
      setCarregando(false)
      return
    }

    // Com confirmação de e-mail ligada (padrão), signUp não devolve sessão.
    if (data.session) {
      router.refresh()
      router.push("/membros")
      return
    }

    setAviso(`Conta criada. Confirme o e-mail enviado para ${email} antes de entrar.`)
    setCarregando(false)
  }

  return (
    <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-md"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
        <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
          {modo === "entrar" ? (
            <>
              ENTRAR
              <br />
              <span className="italic">na GEAR</span>
            </>
          ) : (
            <>
              CRIAR
              <br />
              <span className="italic">sua conta</span>
            </>
          )}
        </h1>

        {/* Alternância */}
        <div className="mt-10 flex border border-white/15">
          {(["entrar", "criar"] as Modo[]).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => trocarModo(opcao)}
              aria-pressed={modo === opcao}
              className={`flex-1 px-4 py-3 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                modo === opcao
                  ? "bg-[var(--gear-amber)] text-[var(--gear-ink)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opcao === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form onSubmit={aoEnviar} className="mt-8 space-y-6">
          {modo === "criar" && (
            <>
              <div>
                <label
                  htmlFor="nome"
                  className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
                >
                  Nome completo
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={carregando}
                  className={campoBase}
                />
              </div>

              <div>
                <label
                  htmlFor="curso"
                  className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
                >
                  Curso
                </label>
                <input
                  id="curso"
                  name="curso"
                  type="text"
                  required
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  disabled={carregando}
                  className={campoBase}
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="email"
              className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={carregando}
              className={campoBase}
            />
            {modo === "criar" && (
              <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
                E-MAIL INSTITUCIONAL: @{DOMINIOS_PERMITIDOS.join(" OU @")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
            >
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={carregando}
              className={campoBase}
            />
          </div>

          {/* Mensagem da própria API do Supabase, sem reescrever */}
          {erro && (
            <div role="alert" className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-4">
              <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--gear-amber)] mb-2">ERRO</p>
              <p className="font-sans text-sm font-light leading-relaxed text-foreground">{erro}</p>
            </div>
          )}

          {aviso && (
            <div role="status" className="border border-white/20 bg-[var(--gear-navy)] p-4">
              <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground mb-2">
                CONFIRME SEU E-MAIL
              </p>
              <p className="font-sans text-sm font-light leading-relaxed text-foreground">{aviso}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            data-cursor-hover
            className="w-full border border-[var(--gear-amber)] bg-transparent px-8 py-4 font-mono text-sm tracking-widest uppercase text-[var(--gear-amber)] transition-colors duration-300 hover:bg-[var(--gear-amber)] hover:text-[var(--gear-ink)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--gear-amber)]"
          >
            {carregando ? "Enviando…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </motion.div>
    </section>
  )
}
