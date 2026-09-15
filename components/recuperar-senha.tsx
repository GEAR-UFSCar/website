"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"

import { Aviso } from "@/components/aviso"
import { AcessoQuadro, linkAcesso } from "@/components/acesso-quadro"
import { createClient } from "@/lib/supabase/client"
import { botaoDesabilitavel, botaoPrimario, campoGrande } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"

/** Volta do /auth/confirmar quando o link do e-mail não vale mais. */
export function RecuperarSenha({ expirado }: { expirado: boolean }) {
  const [email, setEmail] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      /*
       * window.location.origin, e não SITE_URL: em preview da Vercel e em
       * localhost o domínio é outro, e um link que aponta para produção manda
       * a pessoa trocar a senha no lugar errado. O domínio ainda precisa estar
       * na lista de Redirect URLs do painel do Supabase — sem isso o Supabase
       * ignora este parâmetro e usa a Site URL do projeto.
       */
      redirectTo: `${window.location.origin}/auth/confirmar?proximo=/entrar/nova-senha`,
    })

    if (error) {
      setErro(mensagemSegura(error))
      setCarregando(false)
      return
    }

    setEnviado(true)
    setCarregando(false)
  }

  return (
    <AcessoQuadro
      etiqueta="ACESSO"
      titulo="RECUPERAR"
      destaque="sua senha"
      corpo={
        enviado ? (
          /*
           * Mensagem deliberadamente igual para e-mail cadastrado e não
           * cadastrado. Dizer "esta conta não existe" transforma o formulário
           * num verificador de quem é membro da GEAR para qualquer pessoa na
           * internet — e a lista de membros é exatamente o que a 014 fechou.
           */
          <Aviso titulo="VERIFIQUE SEU E-MAIL" tom="neutro" role="status">
            Se houver conta para <span className="text-foreground">{email.trim()}</span>, o link de
            troca de senha chegou lá. Ele vale por uma hora e só pode ser usado uma vez.
          </Aviso>
        ) : (
          <form onSubmit={aoEnviar} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
              >
                E-mail da conta
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
              {carregando ? "Enviando…" : "Enviar link de recuperação"}
            </button>
          </form>
        )
      }
      rodape={
        <Link href="/entrar" data-cursor-hover className={linkAcesso}>
          ← Voltar para entrar
        </Link>
      }
    >
      {expirado && (
        <Aviso titulo="LINK EXPIRADO" role="alert">
          O link que você abriu já foi usado ou passou da validade. Peça um novo abaixo.
        </Aviso>
      )}
      <p>
        Informe o e-mail da sua conta. Você recebe um link que abre a tela de nova senha, já
        autenticado — não é preciso lembrar a senha antiga.
      </p>
    </AcessoQuadro>
  )
}
