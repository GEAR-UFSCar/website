import type { Metadata } from "next"

import { AprovacaoToggle } from "@/components/aprovacao-toggle"
import { ErroDados } from "@/components/erro-dados"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { SelecaoFicha } from "@/components/selecao-ficha"
import { ETAPAS, eDiretoria } from "@/lib/administracao"
import { dataDoDia, diaGear } from "@/lib/datas"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario, getPerfil } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Processo seletivo | GEAR",
  robots: { index: false, follow: false },
}

/**
 * Candidatos são as contas que esperam aprovação (014): o cadastro com e-mail
 * da UFSCar já é a inscrição. Aqui a banca anda com a etapa e anota; aprovar
 * continua sendo o botão da diretoria, o mesmo de Cargos.
 */
export default async function SelecaoPage() {
  const user = await exigirUsuario()
  const ehDiretoria = eDiretoria((await getPerfil()).perfil?.cargo)
  const supabase = await createClient()

  const [candR, fichasR] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome_completo, curso, frente, motivacao, created_at")
      .eq("aprovado", false)
      .not("nome_completo", "is", null)
      .order("created_at"),
    supabase.from("selecao").select("perfil_id, etapa, notas"),
  ])
  const erro = candR.error ?? fichasR.error
  const fichas = new Map((fichasR.data ?? []).map((f) => [f.perfil_id, f]))
  const candidatos = (candR.data ?? [])
    .map((c) => ({ ...c, etapa: fichas.get(c.id)?.etapa ?? "Inscrito", notas: fichas.get(c.id)?.notas ?? "" }))
    .sort((a, b) => ETAPAS.indexOf(a.etapa as (typeof ETAPAS)[number]) - ETAPAS.indexOf(b.etapa as (typeof ETAPAS)[number]))
  const porEtapa = ETAPAS.map((e) => [e, candidatos.filter((c) => c.etapa === e).length] as const)

  return (
    <section className={paginaMembros}>
      <PageHeader titulo="Processo seletivo">
        Quem criou conta e ainda não foi aprovado. Divulgue o link de cadastro do site; cada inscrição aparece aqui com a
        motivação que a pessoa escreveu.
        {` ${porEtapa.filter(([, n]) => n > 0).map(([e, n]) => `${n} em ${e}`).join(", ") || "Ninguém na fila"}.`}
      </PageHeader>

      {erro ? (
        <ErroDados titulo="SELEÇÃO INDISPONÍVEL" erro={erro} className="mt-10 max-w-2xl">
          Falta rodar <code>supabase/033_tarefas_horas_caixa_selecao.sql</code>.
        </ErroDados>
      ) : candidatos.length === 0 ? (
        <div className="mt-10"><EstadoVazio>Nenhum candidato esperando.</EstadoVazio></div>
      ) : (
        <ul className="mt-10 space-y-4">
          {candidatos.map((c) => (
            <li key={c.id} className="border border-linha p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-lg font-light">{c.nome_completo}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {[c.curso, c.frente && `quer ${c.frente}`, `inscrito em ${dataDoDia(diaGear(c.created_at))}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Pilula tom={c.etapa === "Recusado" ? "alerta" : c.etapa === "Inscrito" ? "neutro" : "ativo"}>{c.etapa}</Pilula>
              </div>
              <p className="mt-3 max-w-[70ch] whitespace-pre-line font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {c.motivacao || "Não escreveu motivação."}
              </p>
              <SelecaoFicha perfilId={c.id} etapa={c.etapa} notas={c.notas} />
              {ehDiretoria && c.etapa === "Aprovado" && (
                <div className="mt-4">
                  <AprovacaoToggle perfilId={c.id} aprovado={false} ehVoce={c.id === user.id} nome={c.nome_completo} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
