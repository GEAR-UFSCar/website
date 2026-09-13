import type { Metadata } from "next"
import Link from "next/link"

import { AtaForm } from "@/components/ata-form"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { exigirUsuario } from "@/lib/supabase/sessao"
import { botaoSecundario } from "@/lib/ui"
import { Surge } from "@/components/surge"

export const metadata: Metadata = {
  title: "Atas | GEAR",
  robots: { index: false, follow: false },
}

type Ata = {
  id: string
  tipo: string
  data_reuniao: string
  presentes: string
  pauta: string
  decisoes: string
  pendencias: string | null
}

export default async function AtasPage() {
  // o layout já garantiu sessão e cargo; aqui só reaproveitamos o usuário
  const user = await exigirUsuario()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("atas")
    .select("id, tipo, data_reuniao, presentes, pauta, decisoes, pendencias")
    .order("data_reuniao", { ascending: false })

  const atas = (data ?? []) as Ata[]

  // data_reuniao é DATE puro: parsear como local evita cair no dia anterior
  const formatar = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number)
    return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  }

  return (
    <section className="relative mx-auto max-w-5xl px-8 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
      <Surge>
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">ADMINISTRAÇÃO</p>
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-tight text-balance">Atas</h1>
      <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">
        {atas.length} ATA(S) REGISTRADA(S)
      </p>
      </Surge>

      {error && (
        <ErroDados titulo="ATAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/003_administracao.sql</code>.
        </ErroDados>
      )}

      <div className="mt-12 max-w-4xl">
        {atas.length === 0 && !error && (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma ata registrada ainda.</p>
        )}

        {atas.map((ata, i) => (
          <Surge as="article" index={i} key={ata.id} className="border-t border-white/10 py-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <h2 className="font-sans text-xl md:text-2xl font-light tracking-tight">
                <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--gear-amber)] mr-3">
                  {ata.tipo.toUpperCase()}
                </span>
                {formatar(ata.data_reuniao)}
              </h2>
            </div>

            <dl className="mt-5 space-y-4">
              {[
                { rotulo: "Presentes", valor: ata.presentes },
                { rotulo: "Pauta", valor: ata.pauta },
                { rotulo: "Decisões", valor: ata.decisoes },
                ...(ata.pendencias ? [{ rotulo: "Pendências", valor: ata.pendencias }] : []),
              ].map((linha) => (
                <div key={linha.rotulo}>
                  <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                    {linha.rotulo}
                  </dt>
                  <dd className="mt-1 max-w-[62ch] font-sans text-sm font-light leading-relaxed whitespace-pre-line">
                    {linha.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </Surge>
        ))}
      </div>

      <div className="mt-14 max-w-4xl">
        <AtaForm usuarioId={user.id} />
      </div>

      <Link href="/membros/administracao" data-cursor-hover
        className={`mt-14 inline-block ${botaoSecundario}`}>
        Voltar ao painel
      </Link>
    </section>
  )
}
