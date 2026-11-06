"use client"

import { useState } from "react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"
import { CONTATO_INGRESSO_EMAIL } from "@/lib/site"
import { botaoDesabilitavel, botaoPrimario, campoGrande, linkNoTexto, rotuloBase } from "@/lib/ui"

/**
 * "Quero ser avisado" sem depender de cliente de e-mail. Grava pela RPC da
 * 037, que não diz se o e-mail já estava na lista; por isso a resposta é a
 * mesma para quem entra e para quem repete. Se o banco falhar, oferece o
 * mailto antigo em vez de deixar a pessoa sem saída.
 */
export function ListaDeEspera() {
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre")

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    // Campo-isca: invisível para gente, preenchido por robô. Finge sucesso.
    if (dados.get("site")) return setEstado("ok")

    setEstado("enviando")
    const { error } = await createClient().rpc("entrar_na_lista_de_espera", {
      p_email: String(dados.get("email") ?? ""),
    })
    setEstado(error ? "erro" : "ok")
  }

  if (estado === "ok") {
    return (
      <p role="status" className="font-sans text-base font-light leading-relaxed text-foreground">
        Anotado. Quando o próximo ciclo abrir, você recebe um e-mail nosso, e só esse.
      </p>
    )
  }

  return (
    <form onSubmit={enviar} className="max-w-xl">
      <label htmlFor="lista-email" className={rotuloBase}>
        Seu e-mail
      </label>
      <div className="flex flex-col gap-4 sm:flex-row">
        <input
          id="lista-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="voce@estudante.ufscar.br"
          className={campoGrande}
        />
        <input name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={estado === "enviando"}
          data-cursor-hover
          className={`shrink-0 ${botaoPrimario} ${botaoDesabilitavel}`}
        >
          {estado === "enviando" ? "Enviando" : "Quero ser avisado"}
        </button>
      </div>
      {estado === "erro" ? (
        <p role="alert" className="mt-3 font-sans text-sm font-light text-muted-foreground">
          Não conseguimos gravar agora.{" "}
          <a href={CONTATO_INGRESSO_EMAIL} className={linkNoTexto}>
            Mande um e-mail
          </a>{" "}
          que a gente anota à mão.
        </p>
      ) : (
        <p className="mt-3 font-sans text-sm font-light text-muted-foreground">
          Guardamos só o e-mail, para este aviso, e apagamos depois do ciclo.{" "}
          <Link href="/privacidade#lista-de-espera" className={linkNoTexto}>
            Privacidade
          </Link>
        </p>
      )}
    </form>
  )
}

/**
 * Lado da diretoria, em /membros/administracao/selecao. "Escrever para todos"
 * abre o e-mail com a lista em Cco, para ninguém ver o endereço de ninguém.
 * Apagar cumpre a promessa da política de privacidade: depois do aviso, sai.
 */
export function ListaDeEsperaAdmin({ emails }: { emails: string[] }) {
  const [restantes, setRestantes] = useState(emails)
  const [erro, setErro] = useState(false)

  async function apagar(alvo: string[]) {
    if (alvo.length > 1 && !confirm(`Apagar os ${alvo.length} e-mails da lista? Faça isso depois de avisar.`)) return
    setErro(false)
    const { error } = await createClient().from("lista_de_espera").delete().in("email", alvo)
    if (error) return setErro(true)
    setRestantes((r) => r.filter((e) => !alvo.includes(e)))
  }

  if (restantes.length === 0) {
    return <p className="font-sans text-sm font-light text-muted-foreground">Ninguém na lista de espera.</p>
  }

  const acao = "font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline"
  return (
    <div>
      <div className="flex flex-wrap gap-6">
        <a href={`mailto:?bcc=${restantes.map(encodeURIComponent).join(",")}`} className={acao}>
          Escrever para todos ({restantes.length}) →
        </a>
        <button type="button" onClick={() => apagar(restantes)} className={acao}>
          Apagar a lista
        </button>
      </div>
      {erro && <p role="alert" className="mt-3 font-sans text-sm text-muted-foreground">Não deu para apagar. Tente de novo.</p>}
      <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {restantes.map((email) => (
          <li key={email} className="flex items-center justify-between gap-4 py-3">
            <span className="break-all font-mono text-xs text-foreground">{email}</span>
            <button
              type="button"
              onClick={() => apagar([email])}
              aria-label={`Remover ${email}`}
              className="min-h-11 shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
