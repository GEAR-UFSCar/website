import type { Metadata } from "next"
import Link from "next/link"

import { ErroDados } from "@/components/erro-dados"
import { EventoForm } from "@/components/evento-form"
import { CalendarioMensal } from "@/components/calendario-mensal"
import { Surge } from "@/components/surge"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { temCargo } from "@/lib/administracao"
import { botaoSecundario } from "@/lib/ui"
import { hojeISO } from "@/lib/datas"
import { COLUNAS_META, estaVencida, type Meta } from "@/lib/metas"
import {
  chaveDeMesValida,
  chaveDoTimestamp,
  dataDaChave,
  intervaloDaGrade,
  mesDaChave,
  type ItemAgenda,
} from "@/lib/agenda"

export const metadata: Metadata = {
  title: "Calendário | GEAR",
  robots: { index: false, follow: false },
}

type Evento = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  data_inicio: string
  data_fim: string | null
  frente_vinculada: string | null
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { user, perfil } = await exigirMembroAprovado()
  // Portão só da tela; a RLS de 008 é quem barra de fato.
  const podeEscrever = temCargo(perfil?.cargo)

  const hoje = hojeISO()
  const mes = chaveDeMesValida((await searchParams).mes, mesDaChave(hoje))

  /*
   * A consulta cobre a GRADE, não o mês: a primeira e a última semana trazem
   * dias do mês vizinho, e eles são células reais da tela. Buscar só o mês
   * deixaria a última linha sempre vazia, o que se lê como "nada marcado".
   */
  const { primeira, ultima } = intervaloDaGrade(mes)
  const inicio = dataDaChave(primeira)
  const fimExclusivo = dataDaChave(ultima)
  fimExclusivo.setDate(fimExclusivo.getDate() + 1)

  const supabase = await createClient()

  /*
   * Três consultas, nenhum join — o mesmo motivo do mural e de /membros/metas:
   * a FK aponta para auth.users, não para perfis, e o PostgREST não tem
   * relação para embutir.
   *
   * Em `metas` não há filtro de dono: a RLS da 017 já devolve exatamente as
   * minhas (privadas inclusive) mais as públicas dos outros. Repetir a regra
   * aqui seria uma segunda definição do mesmo acesso, livre para divergir.
   */
  const [{ data: eventosData, error: erroEventos }, { data: metasData, error: erroMetas }, { data: pessoas }] =
    await Promise.all([
      supabase
        .from("eventos")
        .select("id, titulo, descricao, tipo, data_inicio, data_fim, frente_vinculada")
        .gte("data_inicio", inicio.toISOString())
        .lt("data_inicio", fimExclusivo.toISOString())
        .order("data_inicio", { ascending: true }),
      supabase
        .from("metas")
        .select(COLUNAS_META)
        .gte("prazo", primeira)
        .lte("prazo", ultima)
        .order("prazo", { ascending: true }),
      supabase.from("perfis").select("id, nome_completo"),
    ])

  const eventos = (eventosData ?? []) as Evento[]
  const metas = (metasData ?? []) as Meta[]

  const nomes = new Map(
    ((pessoas ?? []) as { id: string; nome_completo: string | null }[])
      .filter((p) => p.nome_completo?.trim())
      .map((p) => [p.id, p.nome_completo as string]),
  )

  /** Primeiro nome basta na etiqueta: o painel é estreito e o dia tem dono. */
  const primeiroNome = (id: string) => (nomes.get(id) ?? "Membro").split(" ")[0]

  const itens: ItemAgenda[] = [
    ...eventos.map((e) => ({
      id: `evento-${e.id}`,
      origem: "evento" as const,
      titulo: e.titulo,
      dia: chaveDoTimestamp(e.data_inicio),
      hora: hora(e.data_inicio),
      descricao: e.descricao,
      rotulo: e.tipo,
      frente: e.frente_vinculada,
    })),
    ...metas.map((m) => ({
      id: `meta-${m.id}`,
      origem: "meta" as const,
      titulo: m.titulo,
      dia: m.prazo.slice(0, 10),
      hora: null,
      descricao: m.descricao,
      rotulo: m.usuario_id === user.id ? "Sua meta" : `Meta de ${primeiroNome(m.usuario_id)}`,
      frente: m.frente_vinculada,
      atrasada: estaVencida(m),
      concluida: m.concluida,
    })),
  ].sort((a, b) => {
    // Dentro do dia: evento antes de meta (evento tem hora marcada, meta é
    // prazo do dia inteiro), e evento por horário.
    if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
    if (a.origem !== b.origem) return a.origem === "evento" ? -1 : 1
    return (a.hora ?? "").localeCompare(b.hora ?? "")
  })

  return (
    <section className="relative mx-auto max-w-6xl px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
      <Surge>
        <p className="max-w-2xl font-sans text-lg font-light leading-relaxed text-muted-foreground">
              Reuniões, sprints e prazos da GEAR na mesma grade das suas metas e das que a equipe
              tornou públicas. Criar evento é de quem tem cargo.
            </p>
      </Surge>

      {erroEventos && (
        <ErroDados titulo="CALENDÁRIO INDISPONÍVEL" erro={erroEventos} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/008_eventos_avisos_sprints.sql</code> no
          SQL Editor do painel.
        </ErroDados>
      )}

      {/* Metas são complemento: sem a 017, a grade continua de pé só com eventos. */}
      {erroMetas && (
        <ErroDados titulo="METAS FORA DA GRADE" erro={erroMetas} className="mt-6 max-w-2xl">
          A grade segue mostrando os eventos. Para as metas, rode{" "}
          <code>supabase/017_metas.sql</code>.
        </ErroDados>
      )}

      <Surge className="mt-16">
        <CalendarioMensal mes={mes} itens={itens} hoje={hoje} />
      </Surge>

      {podeEscrever && (
        <div className="mt-20 max-w-4xl">
          <EventoForm usuarioId={user.id} />
        </div>
      )}

      <div className="mt-16 flex flex-wrap gap-5">
        <Link href="/membros" data-cursor-hover className={`inline-block ${botaoSecundario}`}>
          Voltar para membros
        </Link>
        <Link
          href="/membros/metas"
          data-cursor-hover
          className={`inline-block ${botaoSecundario}`}
        >
          Minhas metas
        </Link>
      </div>
    </section>
  )
}
