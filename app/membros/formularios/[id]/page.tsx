import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormularioRegistro } from "@/components/formulario-registro"
import { BotaoApagar } from "@/components/membros/botao-apagar"
import { BotaoImprimir } from "@/components/membros/botao-imprimir"
import { Pilula } from "@/components/membros/pilula"
import { RegistroDecisao } from "@/components/registro-decisao"
import { RegistroVisualizacao } from "@/components/registro-visualizacao"
import { eDiretoria, temCargo } from "@/lib/administracao"
import { dataDoDia, dataHora, diaGear } from "@/lib/datas"
import { modeloPorId, numeroRegistro } from "@/lib/formularios"
import { COLUNAS_REGISTRO, ROTULO_STATUS, type Registro } from "@/lib/registros"
import { createClient } from "@/lib/supabase/server"
import { exigirMembroAprovado } from "@/lib/supabase/sessao"
import { paginaMembros } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Registro | GEAR",
  robots: { index: false, follow: false },
}

export default async function RegistroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await exigirMembroAprovado()
  const supabase = await createClient()

  const { data } = await supabase.from("registros").select(COLUNAS_REGISTRO).eq("id", id).maybeSingle()
  const registro = data as Registro | null
  const modelo = registro ? modeloPorId(registro.modelo) : undefined
  if (!registro || !modelo) notFound()

  const { data: pessoas } = await supabase.from("perfis").select("id, nome_completo").order("nome_completo")
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.nome_completo ?? "Sem nome"]))

  const souAutor = registro.autor_id === user.id
  const editavel = souAutor && (registro.status === "rascunho" || registro.status === "devolvido")
  const decide = Boolean(modelo.aprovacao) && registro.status === "enviado" && temCargo(perfil?.cargo) && !souAutor
  const apaga = (souAutor && registro.status === "rascunho") || eDiretoria(perfil?.cargo)
  const numero = numeroRegistro(modelo, registro.ano, registro.numero)

  return (
    <section className={paginaMembros}>
      <Link href="/membros/formularios" className="nao-imprimir font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        ← Formulários
      </Link>

      <header className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gear-amber)] print:text-black">
          GEAR · UFSCar Sorocaba · {numero}
        </p>
        <h1 className="mt-3 font-sans text-3xl font-light">{registro.titulo}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Pilula tom={registro.status === "devolvido" ? "alerta" : registro.status === "enviado" ? "ativo" : "neutro"}>{ROTULO_STATUS[registro.status]}</Pilula>
          <span>
            {registro.anonimo ? "Anônimo" : nomes.get(registro.autor_id ?? "") ?? "ex-membro"} · {dataDoDia(diaGear(registro.created_at))}
          </span>
          <span>{modelo.fonte}</span>
        </div>
      </header>

      {registro.decisao_por && (
        <p className="mt-6 border-l-2 border-[var(--gear-amber)] pl-3 font-sans text-sm">
          {ROTULO_STATUS[registro.status]} por {nomes.get(registro.decisao_por) ?? "ex-membro"}
          {registro.decisao_em && ` em ${dataHora(registro.decisao_em)}`}
          {registro.decisao_nota && <span className="mt-1 block whitespace-pre-line font-light">{registro.decisao_nota}</span>}
        </p>
      )}

      {decide && <div className="mt-8"><RegistroDecisao id={registro.id} rotulo={modelo.aprovacao!} /></div>}

      <div className="mt-10 max-w-3xl">
        {editavel ? (
          <FormularioRegistro modeloId={modelo.id} pessoas={(pessoas ?? []).filter((p) => p.nome_completo)} registro={registro} />
        ) : (
          <RegistroVisualizacao modelo={modelo} dados={registro.dados} nomes={nomes} />
        )}
      </div>

      <div className="nao-imprimir mt-10 flex flex-wrap items-center gap-3">
        <BotaoImprimir rotulo="Imprimir para assinar" />
        {apaga && <BotaoApagar tabela="registros" id={registro.id} descricao={numero} />}
      </div>
    </section>
  )
}
