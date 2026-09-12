import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CustomCursor } from "@/components/custom-cursor"
import { SmoothScroll } from "@/components/smooth-scroll"
import { Aviso } from "@/components/aviso"
import { TrilhaAbas } from "@/components/trilha-abas"
import { SprintStatus } from "@/components/sprint-status"
import { createClient } from "@/lib/supabase/server"
import { exigirPerfilCompleto } from "@/lib/supabase/sessao"
import { dataLonga } from "@/lib/datas"
import { STATUS_SPRINT, eDiretoria, temCargo, type TrilhaNome } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"

type Sprint = {
  id: string
  trilha: string
  titulo: string
  descricao: string
  status: string
  data_inicio: string | null
  data_fim: string | null
  updated_at: string
}

/** data_inicio/data_fim são DATE puro: parsear como local evita cair um dia. */
const dataSimples = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number)
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Conteúdo das três páginas de trilha. A trilha vem fixa da rota, não do
 * perfil de quem está vendo: qualquer membro acompanha qualquer trilha.
 */
export async function TrilhaPainel({ trilha }: { trilha: TrilhaNome }) {
  const { user, perfil } = await exigirPerfilCompleto()

  /*
   * Portão só da tela, espelhando a policy de 011: diretoria escreve em
   * qualquer trilha; qualquer outro cargo, só na própria. Sem espelhar, o
   * select ou apareceria para quem o banco vai recusar, ou sumiria para a
   * diretoria, que é justamente quem a 011 veio destravar.
   */
  const podeEscrever =
    eDiretoria(perfil?.cargo) || (temCargo(perfil?.cargo) && perfil?.trilha?.trim() === trilha)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sprints")
    .select("id, trilha, titulo, descricao, status, data_inicio, data_fim, updated_at")
    .eq("trilha", trilha)
    .order("updated_at", { ascending: false })

  const sprints = (data ?? []) as Sprint[]
  const eMinhaTrilha = perfil?.trilha?.trim() === trilha

  return (
    <SmoothScroll>
      <CustomCursor />
      <Navbar />
      <main>
        <section className="relative px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ÁREA DE MEMBROS</p>
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-balance">
            Trilha
            <br />
            <span className="italic">{trilha}</span>
          </h1>

          <TrilhaAbas atual={trilha} />

          <p className="mt-10 max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
            Os sprints da trilha {trilha}. Qualquer membro acompanha as três; mudar status é de quem
            tem cargo nesta trilha — ou da diretoria, em qualquer uma.
          </p>

          <p className="mt-8 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {sprints.length} SPRINT(S)
            {eMinhaTrilha ? " · SUA TRILHA" : ""}
          </p>

          {error && (
            <Aviso titulo="SPRINTS INDISPONÍVEIS" className="mt-10 max-w-2xl">
              {error.message}. Se a tabela não existe, rode{" "}
              <code>supabase/008_eventos_avisos_sprints.sql</code> e depois{" "}
              <code>supabase/010_sprints_por_trilha.sql</code> e{" "}
              <code>supabase/011_sprints_diretoria.sql</code> no SQL Editor do painel.
            </Aviso>
          )}

          {/* Uma seção por status, na ordem do andamento */}
          {STATUS_SPRINT.map((status, indice) => {
            const doStatus = sprints.filter((s) => s.status === status)
            if (doStatus.length === 0) return null

            return (
              <section key={status} className="mt-16 max-w-4xl">
                <div className="border-t border-white/10 pt-8">
                  <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">
                    0{indice + 1} — {status.toUpperCase()} · {doStatus.length}
                  </p>
                  <h2 className="font-sans text-2xl md:text-4xl font-light italic">{status}</h2>
                </div>

                <div className="mt-8">
                  {doStatus.map((sprint) => (
                    <article key={sprint.id} className="border-t border-white/10 py-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <h3 className="font-sans text-lg md:text-xl font-light leading-snug">
                            {sprint.titulo}
                          </h3>
                          <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                            {sprint.data_inicio ? dataSimples(sprint.data_inicio) : "sem início"}
                            {" → "}
                            {sprint.data_fim ? dataSimples(sprint.data_fim) : "sem fim"}
                          </p>
                          <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground whitespace-pre-line">
                            {sprint.descricao}
                          </p>
                          <p className="mt-3 font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                            Atualizado em {dataLonga(sprint.updated_at)}
                          </p>
                        </div>

                        {podeEscrever && (
                          <div className="w-full sm:w-44 shrink-0">
                            <SprintStatus id={sprint.id} valor={sprint.status} usuarioId={user.id} />
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}

          {!error && sprints.length === 0 && (
            <p className="mt-10 max-w-2xl font-sans text-sm font-light text-muted-foreground">
              Nenhum sprint registrado nesta trilha ainda.
            </p>
          )}

          <div className="mt-16">
            <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
              Voltar para membros
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
