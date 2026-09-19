import type { Metadata } from "next"
import Link from "next/link"

import { ModuloCheckbox } from "@/components/modulo-checkbox"
import { AnelProgresso } from "@/components/anel-progresso"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import {
  APARENCIA_MODULO,
  COLUNAS_MODULO,
  NIVEIS_ACADEMIA,
  formatarDuracao,
  montarEstagios,
  type EstadoModulo,
  type Modulo,
  type Progresso,
} from "@/lib/academia"
import { dataDoDia, hojeISO } from "@/lib/datas"
import { prazoRelativo } from "@/lib/metas"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Aprendizagem | GEAR",
  robots: { index: false, follow: false },
}

/** Casca dos três cartões do topo, igual à de /membros. */
const cartao = "flex h-full flex-col bg-[var(--gear-navy)] p-7 md:p-8"
const rotulo = "font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gear-amber)]"

export default async function AprendizagemPage() {
  // mesmo portão de /membros: sem sessão vai ao login, perfil incompleto ao
  // formulário de primeiro acesso.
  const { user } = await exigirMembroAprovado()

  const supabase = await createClient()
  const [{ data: modulos, error: erroModulos }, { data: progresso }] = await Promise.all([
    supabase.from("modulos").select(COLUNAS_MODULO).order("ordem"),
    supabase.from("progresso").select("modulo_id, concluido_em").eq("usuario_id", user.id),
  ])

  const concluidos = new Set(
    ((progresso ?? []) as Progresso[]).filter((p) => p.concluido_em).map((p) => p.modulo_id),
  )

  const lista = (modulos ?? []) as Modulo[]
  const total = lista.length
  const feitos = lista.filter((m) => concluidos.has(m.id)).length
  const percentual = total > 0 ? Math.round((feitos / total) * 100) : 0

  const estagios = montarEstagios(lista, concluidos)
  const comModulos = estagios.filter((e) => e.total > 0)

  /*
   * Estágio atual: o primeiro inacabado — onde a pessoa parou. Terminada a
   * formação, o último, para a página nunca aparecer sem nível de referência.
   */
  const estagioAtual = comModulos.find((e) => !e.completo) ?? comModulos.at(-1)

  /*
   * A trilha achatada, na ordem da formação. É ela que dá a numeração global
   * (01…09) do grid — `modulo.ordem` reinicia em 1 a cada nível, e numerar
   * "01, 02, 03, 01, 02, 03" num grid corrido não orienta ninguém.
   */
  const trilha = comModulos.flatMap((estagio) => estagio.modulos)

  /*
   * O MÓDULO EM ANDAMENTO é o primeiro não concluído da trilha.
   *
   * Não é o "mais recente" por data porque essa data não existe: `progresso`
   * (002) guarda `concluido_em` e nada sobre início, e uma linha com
   * concluido_em null significa "desmarcado", não "começado agora". Como a
   * conclusão é sequencial — trigger da 005 dentro do nível, trava de tela
   * entre níveis — o primeiro pendente É onde a pessoa está.
   */
  const continuando = trilha.find((m) => !concluidos.has(m.id))
  const estagioDoAtual = continuando
    ? comModulos.find((e) => e.nivel === continuando.nivel)
    : undefined
  const posicaoNoNivel = continuando
    ? (estagioDoAtual?.modulos.findIndex((m) => m.id === continuando.id) ?? -1) + 1
    : 0

  /*
   * Quanto falta de trilha, somando a estimativa dos módulos pendentes. Só é
   * possível porque a 022 guarda duração em minutos e não como texto.
   * `semEstimativa` existe para o número não mentir por omissão: 3h restantes
   * com quatro módulos sem estimativa não são 3h.
   */
  const pendentes = trilha.filter((m) => !concluidos.has(m.id))
  const minutosRestantes = pendentes.reduce((soma, m) => soma + (m.duracao_estimada ?? 0), 0)
  const semEstimativa = pendentes.filter((m) => !m.duracao_estimada).length

  const prazoDoNivel = estagioAtual?.prazo ?? null

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      {erroModulos && (
        <ErroDados titulo="MÓDULOS INDISPONÍVEIS" erro={erroModulos} className="mt-10 max-w-2xl">
          Rode <code>supabase/002_academia.sql</code> no SQL Editor do painel — ele cria as
          tabelas e cadastra os 9 módulos. Se o erro fala em <code>prazo_conclusao</code> ou{" "}
          <code>duracao_estimada</code>, falta rodar{" "}
          <code>supabase/022_academia_prazo_e_duracao.sql</code>.
        </ErroDados>
      )}

      {/* Três cartões: quando fecha, onde parou, quanto andou. */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-px bg-white/10">
        {/* 01 — PRAZO DO NÍVEL ATUAL */}
        <Surge as="section" className="h-full">
          <div className={cartao}>
            <p className={rotulo}>
              Prazo {estagioAtual ? `· ${estagioAtual.nivel}` : ""}
            </p>

            {prazoDoNivel ? (
              <>
                <p className="mt-5 font-sans text-xl md:text-2xl font-light italic leading-snug">
                  Conclusão até {dataDoDia(prazoDoNivel)}
                </p>
                {/*
                  prazoRelativo() (lib/metas.ts) já diz "em 12 dias", "hoje" ou
                  "há 3 dias". Reusar em vez de escrever uma segunda contagem
                  regressiva: duas implementações da mesma conta divergem no
                  primeiro fuso ou no primeiro 29 de fevereiro.
                */}
                <p className="mt-3 font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--gear-amber)]">
                  {prazoDoNivel < hojeISO()
                    ? `Venceu ${prazoRelativo(prazoDoNivel)}`
                    : `Faltam: ${prazoRelativo(prazoDoNivel)}`}
                </p>
              </>
            ) : (
              <p className="mt-5 font-sans text-base font-light leading-relaxed text-muted-foreground">
                Sem data-alvo definida para este nível. Quem coordena a formação preenche o prazo
                de cada módulo no painel.
              </p>
            )}

            {estagioAtual && (
              <p className="mt-auto pt-6 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {estagioAtual.feitos} de {estagioAtual.total} módulos do nível
              </p>
            )}
          </div>
        </Surge>

        {/* 02 — CONTINUANDO */}
        <Surge as="section" delay={0.1} className="h-full">
          <div className={cartao}>
            <p className={rotulo}>Continuando</p>

            {continuando && estagioDoAtual ? (
              <>
                <h2 className="mt-5 font-sans text-xl md:text-2xl font-light leading-snug text-balance">
                  {continuando.titulo}
                </h2>

                <p className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {estagioDoAtual.nivel} · módulo {posicaoNoNivel} de {estagioDoAtual.total}
                  {formatarDuracao(continuando.duracao_estimada)
                    ? ` · ${formatarDuracao(continuando.duracao_estimada)}`
                    : ""}
                </p>

                {/*
                  A barra é o avanço NO NÍVEL, e o rótulo diz isso. A Academia
                  registra conclusão por módulo — não há sub-itens no banco, e
                  desenhar "43% deste módulo" seria inventar uma medida.
                */}
                <div className="mt-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Avanço no nível
                    </p>
                    <p className="font-mono text-[11px] tabular-nums">
                      {estagioDoAtual.feitos}/{estagioDoAtual.total}
                    </p>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={estagioDoAtual.feitos}
                    aria-valuemin={0}
                    aria-valuemax={estagioDoAtual.total}
                    aria-label={`Avanço no nível ${estagioDoAtual.nivel}`}
                    className="mt-2 h-2 w-full bg-white/10"
                  >
                    <div
                      className="h-full bg-[var(--gear-amber)] transition-[width] duration-500"
                      style={{
                        width: `${
                          estagioDoAtual.total > 0
                            ? Math.round((estagioDoAtual.feitos / estagioDoAtual.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {continuando.conteudo_url && (
                  <a
                    href={continuando.conteudo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor-hover
                    className="mt-auto pt-6 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline"
                  >
                    Abrir material →
                  </a>
                )}
              </>
            ) : (
              <p className="mt-5 font-sans text-base font-light leading-relaxed text-muted-foreground">
                {total > 0
                  ? "Formação concluída. Os nove módulos estão fechados."
                  : "Nenhum módulo cadastrado ainda."}
              </p>
            )}
          </div>
        </Surge>

        {/* 03 — PROGRESSO GERAL */}
        <Surge as="section" delay={0.2} className="h-full">
          <div className={cartao}>
            <p className={rotulo}>Progresso geral</p>

            <p className="mt-5 font-sans text-5xl md:text-6xl font-light leading-none tabular-nums">
              {percentual}%
            </p>

            <div
              role="progressbar"
              aria-valuenow={feitos}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="Módulos concluídos na formação"
              className="mt-5 h-2 w-full bg-white/10"
            >
              <div
                className="h-full bg-[var(--gear-amber)] transition-[width] duration-500"
                style={{ width: `${percentual}%` }}
              />
            </div>

            <p className="mt-4 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
              {feitos}/{total} módulos
            </p>

            {/*
              Sem "X/Y itens": a Academia não tem sub-itens: `progresso` (002)
              é uma linha por módulo, e inventar um denominador de itens seria
              número bonito sem nada atrás. Se um dia os módulos ganharem
              tarefas, é aqui que a segunda linha entra.
            */}
            <p className="mt-1 font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">
              Conclusão registrada por módulo — não há sub-itens
            </p>

            {minutosRestantes > 0 && (
              <p className="mt-auto pt-6 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Restam ~{formatarDuracao(minutosRestantes)} estimadas
                {semEstimativa > 0 && ` · ${semEstimativa} módulo(s) sem estimativa`}
              </p>
            )}
          </div>
        </Surge>
      </div>

      {/* GRID — Sua trilha */}
      <section className="mt-20">
        <div className="border-t border-white/10 pt-8">
          <h2 className="font-sans text-2xl md:text-3xl font-light italic">Sua trilha</h2>
          <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
            Os nove módulos na ordem da formação. Cada nível abre quando o anterior fecha — cada
            um assume o vocabulário do anterior, não é burocracia.
          </p>
        </div>

        {estagios.map((estagio) => {
          if (estagio.total === 0) return null

          return (
            <div key={estagio.nivel} className="mt-12">
              {/* Cabeçalho do nível: anel, nome e contagem. */}
              <div className="flex items-center gap-5">
                <AnelProgresso
                  feitos={estagio.feitos}
                  total={estagio.total}
                  travado={estagio.travado}
                  className="h-12 w-12"
                />
                <div className={estagio.travado ? "opacity-45" : ""}>
                  <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Estágio 0{estagio.indice + 1}
                  </p>
                  <h3 className="mt-1 font-sans text-xl md:text-2xl font-light italic">
                    {estagio.nivel}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    {estagio.feitos} de {estagio.total} módulos
                    {estagio.travado && " · bloqueado"}
                    {!estagio.travado && estagio.completo && " · concluído"}
                    {estagio.prazo && ` · até ${dataDoDia(estagio.prazo)}`}
                  </p>
                </div>
              </div>

              <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {estagio.modulos.map((modulo, indiceModulo) => {
                  const concluido = concluidos.has(modulo.id)
                  // sequencial dentro do nível E depois do nível anterior
                  const liberado =
                    !estagio.travado &&
                    estagio.modulos.slice(0, indiceModulo).every((m) => concluidos.has(m.id))

                  const estado: EstadoModulo = concluido
                    ? "Concluído"
                    : modulo.id === continuando?.id
                      ? "Em andamento"
                      : liberado
                        ? "A fazer"
                        : "Bloqueado"

                  // Módulo é binário no banco: feito ou não. A barra diz isso.
                  const preenchimento = concluido ? 100 : 0
                  const numero = String(trilha.findIndex((m) => m.id === modulo.id) + 1).padStart(2, "0")
                  const duracao = formatarDuracao(modulo.duracao_estimada)

                  return (
                    <Surge
                      as="li"
                      index={indiceModulo}
                      key={modulo.id}
                      className={`flex h-full flex-col border border-white/10 bg-[var(--gear-navy)] p-6 transition-colors duration-300 ${
                        estado === "Bloqueado" ? "opacity-45" : "hover:border-[var(--gear-amber)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-2xl font-light tabular-nums text-[var(--gear-amber)]">
                          {numero}
                        </span>
                        <span
                          className={`shrink-0 border px-2 py-1 font-mono text-[10px] tracking-[0.2em] uppercase ${APARENCIA_MODULO[estado]}`}
                        >
                          {estado}
                        </span>
                      </div>

                      <h4
                        className={`mt-4 font-sans text-lg font-light leading-snug ${
                          concluido ? "text-muted-foreground" : ""
                        }`}
                      >
                        {modulo.titulo}
                      </h4>

                      <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        {/* sem estimativa é estado real (022), e a tela diz isso */}
                        {duracao ?? "duração não estimada"}
                      </p>

                      {modulo.descricao && (
                        <p className="mt-3 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                          {modulo.descricao}
                        </p>
                      )}

                      <div className="mt-5">
                        <div
                          role="progressbar"
                          aria-valuenow={preenchimento}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progresso do módulo ${modulo.titulo}`}
                          className="h-1.5 w-full bg-white/10"
                        >
                          <div
                            className="h-full bg-[var(--gear-amber)] transition-[width] duration-500"
                            style={{ width: `${preenchimento}%` }}
                          />
                        </div>
                      </div>

                      {/* Rodapé: o controle e o material. */}
                      <div className="mt-auto flex items-center gap-4 pt-5">
                        <ModuloCheckbox
                          usuarioId={user.id}
                          moduloId={modulo.id}
                          concluido={concluido}
                          liberado={liberado}
                          motivoBloqueio={
                            estagio.travado
                              ? `Conclua o nível ${NIVEIS_ACADEMIA[estagio.indice - 1]} primeiro`
                              : "Conclua o módulo anterior primeiro"
                          }
                        />
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                          {concluido ? "Marcado" : "Marcar como feito"}
                        </span>
                      </div>

                      {modulo.conteudo_url && (
                        <a
                          href={modulo.conteudo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cursor-hover
                          className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--gear-amber)] hover:underline"
                        >
                          Abrir material →
                        </a>
                      )}
                    </Surge>
                  )
                })}
              </ul>

              {estagio.travado && (
                <p className="mt-5 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  Este estágio abre quando o anterior chegar a 100%.
                </p>
              )}
            </div>
          )
        })}
      </section>

      <div className="mt-16">
        <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Voltar para membros
        </Link>
      </div>
    </section>
  )
}
