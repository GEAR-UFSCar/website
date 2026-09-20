"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Aviso } from "@/components/aviso"
import { AcessoQuadro, linkAcesso } from "@/components/acesso-quadro"
import { createClient, definirPreferenciaLembrar } from "@/lib/supabase/client"
import { VERSAO_TERMOS } from "@/lib/site"
import { mensagemSegura } from "@/lib/erros"
import { botaoDesabilitavel, botaoPrimario, campoGrande } from "@/lib/ui"

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


export function Entrar() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>("entrar")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [nome, setNome] = useState("")
  const [curso, setCurso] = useState("")
  const [aceitouTermos, setAceitouTermos] = useState(false)
  // Desmarcado por padrão: em computador compartilhado (e os do laboratório
  // são), o padrão seguro é a sessão morrer com o navegador.
  const [lembrar, setLembrar] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const trocarModo = (novo: Modo) => {
    setModo(novo)
    setErro(null)
    setAviso(null)
    setAceitouTermos(false)
  }

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setCarregando(true)

    const supabase = createClient()

    if (modo === "entrar") {
      /*
       * Antes do signIn, não depois: é este marcador que o setAll do cliente
       * consulta para decidir a validade dos cookies de auth já na primeira
       * gravação. Ver lib/supabase/lembrar.ts para por que a validade não vem
       * de `cookieOptions.maxAge`.
       */
      definirPreferenciaLembrar(lembrar)

      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setErro(mensagemSegura(error))
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

    /*
     * Esta é a única barreira, de propósito. `required` no checkbox dispararia
     * o balão nativo do navegador e abortaria o submit antes do onSubmit, e um
     * botão desabilitado bloquearia sem dizer por quê — nos dois casos a
     * mensagem abaixo nunca apareceria. O checkbox leva aria-required para a
     * semântica de leitor de tela sem a validação nativa junto.
     */
    if (!aceitouTermos) {
      setErro(
        "É preciso ler e aceitar o Regimento Interno, incluindo o Código de Conduta, para criar sua conta.",
      )
      setCarregando(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      /*
       * Lido por dois triggers em auth.users: handle_new_user() (001) preenche
       * public.perfis, registrar_termos_aceitos() (012) grava o aceite.
       *
       * O aceite vai por aqui, e não por um insert do cliente, porque com
       * confirmação de e-mail ligada signUp() não devolve sessão — sem
       * auth.uid(), a RLS recusaria o insert e o aceite se perderia.
       */
      options: {
        data: {
          nome_completo: nome.trim(),
          curso: curso.trim(),
          termos_versao: VERSAO_TERMOS,
        },
      },
    })
    if (error) {
      setErro(mensagemSegura(error))
      setCarregando(false)
      return
    }

    // Com confirmação de e-mail ligada (padrão), signUp não devolve sessão.
    if (data.session) {
      router.refresh()
      router.push("/membros")
      return
    }

    setAceitouTermos(false)
    setAviso(`Conta criada. Confirme o e-mail enviado para ${email} antes de entrar.`)
    setCarregando(false)
  }

  return (
    <AcessoQuadro
      etiqueta="ÁREA DE MEMBROS"
      titulo={modo === "entrar" ? "ENTRAR" : "CRIAR"}
      destaque={modo === "entrar" ? "na GEAR" : "sua conta"}
      corpo={
        <>
        {/* Alternância */}
        <div className="flex border border-white/15">
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
              className={campoGrande}
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
              className={campoGrande}
            />
          </div>

          {modo === "entrar" && (
            <label htmlFor="lembrar" className="flex items-center gap-3 cursor-pointer" data-cursor-hover>
              <input
                id="lembrar"
                name="lembrar"
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                disabled={carregando}
                aria-describedby="lembrar-ajuda"
                className="h-4 w-4 shrink-0 accent-[var(--gear-amber)]"
              />
              <span className="font-sans text-sm font-light leading-relaxed text-muted-foreground">
                Lembrar de mim
                <span id="lembrar-ajuda" className="block font-mono text-[10px] tracking-wider uppercase">
                  Mantém o acesso por 30 dias neste navegador
                </span>
              </span>
            </label>
          )}

          {modo === "criar" && (
            <div>
              <label htmlFor="termos" className="flex items-start gap-3 cursor-pointer" data-cursor-hover>
                <input
                  id="termos"
                  name="termos"
                  type="checkbox"
                  aria-required="true"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                  disabled={carregando}
                  aria-describedby="termos-versao"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--gear-amber)]"
                />
                <span className="font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  Li e aceito o Regimento Interno da GEAR, incluindo o Código de Conduta.
                </span>
              </label>
              {/* o que fica gravado em termos_aceitos.versao_documento */}
              <p id="termos-versao" className="mt-2 pl-7 font-mono text-[10px] tracking-wider text-muted-foreground">
                VERSÃO {VERSAO_TERMOS} · REGISTRADA NO SEU CADASTRO
              </p>
            </div>
          )}

          {/* Mensagem da própria API do Supabase, sem reescrever */}
          {erro && <Aviso titulo="ERRO" role="alert">{erro}</Aviso>}

          {aviso && (
            <Aviso titulo="CONFIRME SEU E-MAIL" tom="neutro" role="status">
              {aviso}
            </Aviso>
          )}

          <button
            type="submit"
            disabled={carregando}
            data-cursor-hover
            className={`w-full ${botaoPrimario} ${botaoDesabilitavel}`}
          >
            {carregando ? "Enviando…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        </>
      }
      rodape={
        /*
         * Só no modo entrar: em "criar conta" a pessoa ainda não tem senha a
         * recuperar, e oferecer a saída ali só sugere que ela já errou algo.
         */
        modo === "entrar" ? (
          <Link href="/entrar/recuperar" data-cursor-hover className={linkAcesso}>
            Esqueci minha senha
          </Link>
        ) : null
      }
    >
      {/*
        * A página tinha 46 palavras e não dizia o que há atrás do login. A
        * área de membros é mais completa que a de qualquer referência que
        * analisamos, e nenhum candidato descobria isso. Só descreve o que já
        * existe — nada aqui é promessa.
        */}
      <p>
        Atrás do login ficam o mural de avisos, o calendário da entidade, o diretório de membros, a
        documentação institucional, o quadro de sprints de cada frente e a Academia GEAR com o seu
        progresso na formação.
      </p>
      <p className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase">
        O acesso abre após a diretoria confirmar seu vínculo com a entidade
      </p>
    </AcessoQuadro>
  )
}
