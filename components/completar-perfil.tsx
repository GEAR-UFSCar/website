"use client"

import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"

import { Aviso } from "@/components/aviso"
import { AcessoQuadro, linkAcesso } from "@/components/acesso-quadro"
import { createClient } from "@/lib/supabase/client"
import { FRENTES } from "@/lib/administracao"
import { botaoDesabilitavel, botaoPrimario, campoGrande } from "@/lib/ui"
import { mensagemSegura } from "@/lib/erros"


type Props = {
  userId: string
  nomeInicial: string
  cursoInicial: string
  frenteInicial: string
  /** Quem tem cargo não troca a própria frente — o banco recusa (023). */
  frenteTravada?: boolean
}

export function CompletarPerfil({ userId, nomeInicial, cursoInicial, frenteInicial, frenteTravada = false }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(nomeInicial)
  const [curso, setCurso] = useState(cursoInicial)
  const [frente, setFrente] = useState(frenteInicial)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const supabase = createClient()

    /*
     * UPSERT, e não UPDATE. UPDATE em linha inexistente não é erro: afeta zero
     * linhas e volta calado. Quem tinha conta no auth sem linha em `perfis`
     * preenchia isto, era devolvido para cá e não tinha como sair — o primeiro
     * acesso era um beco sem saída, e a mensagem mandava a pessoa rodar SQL.
     *
     * A policy "perfis: criar o próprio" (001) já autorizava o insert; o
     * trigger guardar_perfil_novo() (018) garante que a linha criada assim
     * nasça do próprio dono, não aprovada e sem cargo.
     */
    const { data, error } = await supabase
      .from("perfis")
      .upsert(
        {
          id: userId,
          nome_completo: nome.trim(),
          curso: curso.trim(),
          // "Ainda não decidido" grava null: é o que o CHECK da coluna aceita
          frente: frente === "" ? null : frente,
        },
        { onConflict: "id" },
      )
      .select("id")

    if (error) {
      setErro(mensagemSegura(error))
      setCarregando(false)
      return
    }

    // Com upsert isto é quase inalcançável, mas "quase" não é "nunca": a RLS
    // pode recusar sem erro se a sessão expirar entre abrir a página e enviar.
    if (!data || data.length === 0) {
      setErro("Não foi possível salvar. Sua sessão pode ter expirado — entre novamente.")
      setCarregando(false)
      return
    }

    router.refresh()
    router.push("/membros")
  }

  /*
   * Saída de emergência. Esta tela é obrigatória — os portões de /membros
   * mandam para cá quem não tem nome preenchido — e até agora não tinha
   * nenhuma porta: quem chegasse por engano, ou com a conta errada, ficava
   * sem ação possível a não ser apagar o cookie na mão.
   */
  const sair = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push("/")
  }

  return (
    <AcessoQuadro
      etiqueta="PRIMEIRO ACESSO"
      titulo="COMPLETE"
      destaque="seu perfil"
      corpo={
        <form onSubmit={aoEnviar} className="space-y-6">
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
              htmlFor="frente"
              className="block font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3"
            >
              Frente
            </label>
            <select
              id="frente"
              name="frente"
              value={frente}
              onChange={(e) => setFrente(e.target.value)}
              disabled={carregando || frenteTravada}
              aria-describedby={frenteTravada ? "frente-travada" : undefined}
              className={campoGrande}
            >
              <option value="">Ainda não decidido</option>
              {FRENTES.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
            {frenteTravada && (
              <p id="frente-travada" className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
                COM CARGO, A FRENTE É DEFINIDA PELA DIRETORIA
              </p>
            )}
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
      }
      rodape={
        <button type="button" onClick={sair} data-cursor-hover className={linkAcesso}>
          Sair desta conta
        </button>
      }
    >
      <p>
        Faltam alguns dados antes de você entrar na área de membros. A frente pode ficar em aberto —
        ela é escolhida ao fim da formação.
      </p>
    </AcessoQuadro>
  )
}
