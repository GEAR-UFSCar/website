"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { AcessoQuadro, linkAcesso } from "@/components/acesso-quadro"
import { createClient } from "@/lib/supabase/client"
import { botaoDesabilitavel, botaoPrimario, campoGrande } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

/** Mínimo local. O Supabase recusa abaixo de 6; 8 é a régua da entidade. */
const MINIMO = 8

export function NovaSenha({ email }: { email: string }) {
  const router = useRouter()
  const [senha, setSenha] = useState("")
  const [repetida, setRepetida] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)

    // As duas conferências antes da rede: a resposta local é imediata e a
    // mensagem é mais específica do que a que voltaria do servidor.
    if (senha.length < MINIMO) {
      setErro(`A senha precisa ter pelo menos ${MINIMO} caracteres.`)
      return
    }
    if (senha !== repetida) {
      setErro("As duas senhas não são iguais.")
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setErro(mensagemSegura(error))
      setCarregando(false)
      return
    }

    // A sessão de recuperação vira sessão comum: já entra direto, e os
    // portões de /membros levam ao lugar certo conforme o estado da conta.
    router.refresh()
    router.push("/membros")
  }

  return (
    <AcessoQuadro
      etiqueta="ACESSO"
      titulo="DEFINIR"
      destaque="nova senha"
      corpo={
        <form onSubmit={aoEnviar} className="space-y-6">
          <div>
            <label
              htmlFor="senha"
              className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
            >
              Nova senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              minLength={MINIMO}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={carregando}
              className={campoGrande}
            />
            <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
              MÍNIMO DE {MINIMO} CARACTERES
            </p>
          </div>

          <div>
            <label
              htmlFor="repetida"
              className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
            >
              Repita a nova senha
            </label>
            <input
              id="repetida"
              name="repetida"
              type="password"
              required
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              disabled={carregando}
              className={campoGrande}
            />
          </div>

          {erro && (
            <Aviso titulo="ERRO" role="alert">
              {erro}
            </Aviso>
          )}

          <button
            type="submit"
            disabled={carregando}
            data-cursor-hover
            className={`w-full ${botaoPrimario} ${botaoDesabilitavel}`}
          >
            {carregando ? "Salvando…" : "Salvar senha e entrar"}
          </button>
        </form>
      }
      rodape={
        <Link href="/entrar" data-cursor-hover className={linkAcesso}>
          ← Voltar para entrar
        </Link>
      }
    >
      <p>
        Você chegou por um link de recuperação e está autenticado como{" "}
        <span className="text-foreground">{email}</span>. Defina a senha nova para concluir.
      </p>
    </AcessoQuadro>
  )
}
