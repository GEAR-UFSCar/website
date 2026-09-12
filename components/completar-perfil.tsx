"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

import { Aviso } from "@/components/aviso"
import { createClient } from "@/lib/supabase/client"
import { TRILHAS } from "@/lib/administracao"
import { botaoDesabilitavel, botaoPrimario, campoGrande } from "@/lib/ui"


type Props = {
  userId: string
  nomeInicial: string
  cursoInicial: string
  trilhaInicial: string
}

export function CompletarPerfil({ userId, nomeInicial, cursoInicial, trilhaInicial }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(nomeInicial)
  const [curso, setCurso] = useState(cursoInicial)
  const [trilha, setTrilha] = useState(trilhaInicial)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("perfis")
      .update({
        nome_completo: nome.trim(),
        curso: curso.trim(),
        // "Ainda não decidido" grava null: é o que o CHECK da coluna aceita
        trilha: trilha === "" ? null : trilha,
      })
      .eq("id", userId)
      .select("id")

    if (error) {
      setErro(error.message)
      setCarregando(false)
      return
    }

    // update sem erro mas sem linha afetada = perfil não existe no banco
    if (!data || data.length === 0) {
      setErro(
        "Nenhum perfil encontrado para esta conta. Rode supabase/001_perfis.sql no SQL Editor do painel — ele cria a tabela e o perfil de quem já se cadastrou.",
      )
      setCarregando(false)
      return
    }

    router.refresh()
    router.push("/membros")
  }

  return (
    <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-md"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">PRIMEIRO ACESSO</p>
        <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">
          COMPLETE
          <br />
          <span className="italic">seu perfil</span>
        </h1>

        <p className="mt-6 font-sans text-base font-light leading-relaxed text-muted-foreground">
          Faltam alguns dados antes de você entrar na área de membros. A trilha pode ficar em aberto —
          ela é escolhida ao fim da formação.
        </p>

        <form onSubmit={aoEnviar} className="mt-10 space-y-6">
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
              className={campoGrande}
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
              className={campoGrande}
            />
          </div>

          <div>
            <label
              htmlFor="trilha"
              className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
            >
              Trilha
            </label>
            <select
              id="trilha"
              name="trilha"
              value={trilha}
              onChange={(e) => setTrilha(e.target.value)}
              disabled={carregando}
              className={campoGrande}
            >
              <option value="">Ainda não decidido</option>
              {TRILHAS.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
          </div>

          {erro && <Aviso titulo="ERRO" role="alert">{erro}</Aviso>}

          <button
            type="submit"
            disabled={carregando}
            data-cursor-hover
            className={`w-full ${botaoPrimario} ${botaoDesabilitavel}`}
          >
            {carregando ? "Salvando…" : "Salvar e continuar"}
          </button>
        </form>
      </motion.div>
    </section>
  )
}
