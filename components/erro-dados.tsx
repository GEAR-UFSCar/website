import type { ReactNode } from "react"

import { Aviso } from "@/components/aviso"
import { detalheTecnico, mensagemSegura, type ErroDeDados } from "@/lib/erros"

type Props = {
  /** Linha mono no topo. Diz o que ficou indisponível, não o que deu errado. */
  titulo: string
  erro: ErroDeDados
  className?: string
  /**
   * Instrução para quem administra — tipicamente "rode supabase/00X.sql".
   * Renderiza SÓ em desenvolvimento: em produção, dizer a um membro comum para
   * rodar SQL não é ajuda, é ruído, e entrega a estrutura interna de graça.
   */
  children?: ReactNode
}

/**
 * A caixa de erro de dados da área de membros, num lugar só.
 *
 * Antes eram dez páginas repetindo `<Aviso>{error.message}. Se a tabela não
 * existe, rode <code>…</code></Aviso>`. Além da repetição, o padrão fazia com
 * que corrigir o vazamento de mensagem do Postgres (SEC-08) exigisse lembrar
 * de todos os dez pontos — e o décimo primeiro, escrito depois, nasceria
 * errado de novo. Agora nasce certo por construção.
 *
 * `role="alert"` vem de `Aviso`: é falha real, o leitor de tela anuncia na
 * hora, e o texto sobe para o contraste cheio.
 */
export function ErroDados({ titulo, erro, className = "", children }: Props) {
  const detalhe = detalheTecnico(erro)

  return (
    <Aviso titulo={titulo} role="alert" className={className}>
      {mensagemSegura(erro)}
      {detalhe && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground break-words">
          {detalhe}
        </p>
      )}
      {detalhe && children && (
        <div className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
    </Aviso>
  )
}
