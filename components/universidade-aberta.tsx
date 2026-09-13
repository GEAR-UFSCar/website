"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

/*
 * Ordem de exibição definida pelo conteúdo de cada foto, não alfabética:
 * abertura em plano geral, destaque da equipe no meio, e as duas fotos do
 * mesmo instante (03 e 04) separadas para não parecerem repetição.
 *
 * Células de tamanho fixo com object-cover. A composição fecha exata: 6 células
 * quadradas (1 coluna) + 2 largas (2 colunas, 2:1) = 10 unidades = 2 fileiras
 * de 5, sem sobra. A célula larga tem a mesma altura da quadrada, então as
 * fileiras alinham. As largas vão para as fotos horizontais, que é onde o
 * corte do cover é menor.
 * `largura`/`altura` são as dimensões medidas no arquivo (marcador SOF).
 */
const FOTOS = [
  {
    arquivo: "foto-01.jpg",
    largura: 1600,
    altura: 1200, // horizontal — abertura
    alt: "Laboratório de informática com estudantes em computadores durante a Universidade Aberta UFSCar",
  },
  {
    arquivo: "foto-05.jpg",
    largura: 1200,
    altura: 1600,
    alt: "Robô Mecanum sendo demonstrado numa mesa com pista de linha",
  },
  {
    arquivo: "foto-02.jpg",
    largura: 900,
    altura: 1600,
    alt: "Grupo de estudantes ouvindo apresentação sobre a GEAR",
  },
  {
    arquivo: "foto-03.jpg",
    largura: 900,
    altura: 1600,
    alt: "Membro da GEAR explicando o funcionamento de um robô a um grupo de visitantes",
  },
  {
    arquivo: "foto-06.jpg",
    largura: 1600,
    altura: 900, // horizontal — destaque do meio
    alt: "Equipe da GEAR reunida durante a Universidade Aberta UFSCar 2026",
  },
  {
    arquivo: "foto-04.jpg",
    largura: 1200,
    altura: 1600,
    alt: "Robô Navegador Mecanum sobre a pista de testes durante demonstração",
  },
  // sem descrição informada — ver nota ao time
  { arquivo: "foto-07.jpg", largura: 900, altura: 1600, alt: "" },
  { arquivo: "foto-08.jpg", largura: 1200, altura: 1600, alt: "" },
]

const PASTA = "/fotos/universidade-aberta/"

export function UniversidadeAberta() {
  const [ausentes, setAusentes] = useState<Record<string, boolean>>({})

  return (
    <section className="relative py-32 px-8 md:px-12 md:py-24">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-16"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
          05 — UNIVERSIDADE ABERTA UFSCAR
        </p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">A GEAR no mundo real</h2>
        <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">
          Universidade Aberta UFSCar — 2026
        </p>
      </motion.div>

      {/* Composição fixa: quadradas + duas largas, fechando fileiras exatas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {FOTOS.map((foto) => {
          const faltando = ausentes[foto.arquivo]
          const larga = foto.largura > foto.altura

          return (
            <div
              key={foto.arquivo}
              className={`relative overflow-hidden bg-[var(--gear-ink)] ${
                /*
                 * No mobile todas as fotos ficam quadradas em 2 colunas: a
                 * composição de 5 colunas só existe a partir de md, e uma foto
                 * larga sozinha ocupando a linha inteira quebrava o ritmo da
                 * grade. object-cover centraliza o corte.
                 */
                larga ? "aspect-square md:col-span-2 md:aspect-[2/1]" : "aspect-square"
              }`}
            >
              {faltando ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                    {foto.arquivo}
                  </span>
                </div>
              ) : (
                <Image
                  src={PASTA + foto.arquivo}
                  alt={foto.alt || `Universidade Aberta UFSCar 2026 — foto ${foto.arquivo.replace(/\D/g, "")}`}
                  width={foto.largura}
                  height={foto.altura}
                  /*
                   * Sem sizes, o Next escolhe o candidato do srcset pela
                   * largura INTRÍNSECA (até 1600px) e não pela renderizada —
                   * um celular baixava a foto inteira para exibi-la em ~180px.
                   * O grid é 2 colunas no mobile e 5 a partir de md; as largas
                   * ocupam o dobro.
                   */
                  sizes={larga ? "(min-width: 768px) 40vw, 100vw" : "(min-width: 768px) 20vw, 50vw"}
                  className="absolute inset-0 h-full w-full origin-center object-cover transition-transform duration-500 ease-out hover:scale-105"
                  onError={() => setAusentes((anterior) => ({ ...anterior, [foto.arquivo]: true }))}
                />
              )}
            </div>
          )
        })}
      </div>

    </section>
  )
}
