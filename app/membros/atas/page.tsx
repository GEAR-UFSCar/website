import type { Metadata } from "next"

import { AtaForm } from "@/components/ata-form"
import { RegistroEditavel } from "@/components/membros/registro-editavel"
import { ErroDados } from "@/components/erro-dados"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { eDiretoria, temCargo } from "@/lib/administracao"
import { Surge } from "@/components/surge"
import { PageHeader } from "@/components/membros/page-header"
import { paginaMembros } from "@/lib/ui"

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
  // Todo membro aprovado lê (038; Regimento art. 35, § 1º). Escrever é de quem tem cargo.
  const { user, perfil } = await exigirMembroAprovado()
  const ehDiretoria = eDiretoria(perfil?.cargo)
  const escreve = temCargo(perfil?.cargo)

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
    <section className={paginaMembros}>
      <PageHeader titulo="Atas">
        O que foi decidido em cada reunião, aberto a todo membro. {atas.length} ata(s) registrada(s).
        {!escreve && " Quem registra é quem tem cargo; se faltou uma reunião aqui, cobre da sua direção."}
      </PageHeader>

      {error && (
        <ErroDados titulo="ATAS INDISPONÍVEIS" erro={error} className="mt-10 max-w-2xl">
          Se a tabela não existe, rode <code>supabase/003_administracao.sql</code>. Se você não tem cargo e
          a lista vem vazia, falta <code>supabase/038_membros_participam.sql</code>.
        </ErroDados>
      )}

      <div className="mt-12 max-w-4xl">
        {atas.length === 0 && !error && (
          <p className="font-sans text-sm font-light text-muted-foreground">Nenhuma ata registrada ainda.</p>
        )}

        {atas.map((ata, i) => (
          <Surge as="article" index={i} key={ata.id} className="border-t border-linha py-8">
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

            {/* Apagar é só da diretoria (030); os demais cargos corrigem. */}
            {escreve && <RegistroEditavel
              tabela="atas"
              id={ata.id}
              apagavel={ehDiretoria}
              className="mt-6"
              formulario={<AtaForm usuarioId={user.id} ata={ata} />}
            />}
          </Surge>
        ))}
      </div>

      {escreve && (
        <div className="mt-14 max-w-4xl">
          <AtaForm usuarioId={user.id} />
        </div>
      )}

    </section>
  )
}
