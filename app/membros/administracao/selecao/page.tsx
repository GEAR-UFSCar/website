import type { Metadata } from "next"

import { AprovacaoToggle } from "@/components/aprovacao-toggle"
import { CiclosSelecao, type Ciclo } from "@/components/ciclos-selecao"
import { ErroDados } from "@/components/erro-dados"
import { ListaDeEsperaAdmin } from "@/components/lista-de-espera"
import { EstadoVazio } from "@/components/membros/estado-vazio"
import { PageHeader } from "@/components/membros/page-header"
import { Pilula } from "@/components/membros/pilula"
import { SelecaoFicha } from "@/components/selecao-ficha"
import { ETAPAS, eDiretoria } from "@/lib/administracao"
import { dataDoDia, diaGear, hojeISO } from "@/lib/datas"
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

  const [candR, fichasR, motivR, esperaR, ciclosR] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome_completo, curso, frente, created_at")
      .eq("aprovado", false)
      .not("nome_completo", "is", null)
      .order("created_at"),
    supabase.from("selecao").select("perfil_id, etapa, notas"),
    supabase.from("candidaturas").select("perfil_id, motivacao"),
    supabase.from("lista_de_espera").select("email").order("criado_em"),
    supabase.from("ciclos_selecao").select("id, titulo, inscricoes_de, inscricoes_ate, edital_url").order("inscricoes_de", { ascending: false }),
  ])
  const motivacoes = new Map((motivR.data ?? []).map((m) => [m.perfil_id, m.motivacao as string]))
  const erro = candR.error ?? fichasR.error ?? motivR.error
  const fichas = new Map((fichasR.data ?? []).map((f) => [f.perfil_id, f]))
  const candidatos = (candR.data ?? [])
    .map((c) => ({ ...c, motivacao: motivacoes.get(c.id) ?? null, etapa: fichas.get(c.id)?.etapa ?? "Inscrito", notas: fichas.get(c.id)?.notas ?? "" }))
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

      {/* O ciclo cadastrado aqui decide o que /ingressar mostra (038). */}
      <div className="mt-16 border-t border-linha pt-8">
        <h2 className="font-sans text-2xl font-light italic">Ciclos</h2>
        <p className="mt-2 mb-6 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
          Publique o ciclo com as datas do edital. Antes de abrir, /ingressar mostra as datas; durante, o botão de
          inscrição; depois, volta para a lista de espera. {ehDiretoria ? "" : "Só a diretoria publica e apaga ciclos."}
        </p>
        {ciclosR.error ? (
          <ErroDados titulo="CICLOS INDISPONÍVEIS" erro={ciclosR.error} className="max-w-2xl">
            Falta rodar <code>supabase/038_agenda_publica_e_ciclos.sql</code>.
          </ErroDados>
        ) : (
          <CiclosSelecao ciclos={(ciclosR.data ?? []) as Ciclo[]} podeEditar={ehDiretoria} hoje={hojeISO()} />
        )}
      </div>

      {/* Quem pediu, em /ingressar, para ser avisado do próximo ciclo (037). */}
      <div className="mt-16 border-t border-linha pt-8">
        <h2 className="font-sans text-2xl font-light italic">Lista de espera</h2>
        <p className="mt-2 mb-6 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
          Visitantes que deixaram o e-mail para saber quando abre o próximo ciclo. Avise todos quando o edital sair e
          apague a lista em seguida: a política de privacidade promete isso.
        </p>
        {esperaR.error ? (
          <ErroDados titulo="LISTA INDISPONÍVEL" erro={esperaR.error} className="max-w-2xl">
            Falta rodar <code>supabase/037_lista_de_espera.sql</code>.
          </ErroDados>
        ) : (
          <ListaDeEsperaAdmin emails={(esperaR.data ?? []).map((l) => l.email as string)} />
        )}
      </div>
    </section>
  )
}
