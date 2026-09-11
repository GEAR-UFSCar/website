"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

/*
 * Mosaico do Portas Abertas. Para mudar a quantidade de fotos, basta editar
 * esta lista — o grid se ajusta sozinho. As proporções são fixas de propósito:
 * dão as alturas variadas do mosaico e evitam o layout pular enquanto as
 * imagens carregam. `legenda` vazia cai num texto neutro.
 */
const FOTOS = [
  { arquivo: "foto-01.jpg", proporcao: "aspect-[4/5]", legenda: "" },
  { arquivo: "foto-02.jpg", proporcao: "aspect-[1/1]", legenda: "" },
  { arquivo: "foto-03.jpg", proporcao: "aspect-[3/4]", legenda: "" },
  { arquivo: "foto-04.jpg", proporcao: "aspect-[4/3]", legenda: "" },
  { arquivo: "foto-05.jpg", proporcao: "aspect-[1/1]", legenda: "" },
  { arquivo: "foto-06.jpg", proporcao: "aspect-[3/4]", legenda: "" },
  { arquivo: "foto-07.jpg", proporcao: "aspect-[4/5]", legenda: "" },
  { arquivo: "foto-08.jpg", proporcao: "aspect-[4/3]", legenda: "" },
]

const PASTA = "/fotos/portas-abertas/"

export function PortasAbertas() {
  /** Fotos que deram 404 — o lugar vira um marcador com o nome do arquivo. */
  const [ausentes, setAusentes] = useState<Record<string, boolean>>({})

  // Verifica as fotos no mount: evita o piscar de imagem quebrada e já deixa
  // em cache as que existem.
  useEffect(() => {
    FOTOS.forEach(({ arquivo }) => {
      const img = document.createElement("img")
      img.onerror = () => setAusentes((anterior) => ({ ...anterior, [arquivo]: true }))
      img.src = PASTA + arquivo
    })
  }, [])

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
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">05 — PORTAS ABERTAS 2026</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">A GEAR no mundo real</h2>
        <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">
          Portas Abertas UFSCar Sorocaba — 2026
        </p>
      </motion.div>

      {/* Mosaico: colunas CSS dão as alturas desencontradas do masonry */}
      <div className="columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:balance]">
        {FOTOS.map((foto, index) => {
          const numero = String(index + 1).padStart(2, "0")
          const faltando = ausentes[foto.arquivo]

          return (
            <motion.figure
              key={foto.arquivo}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: (index % 4) * 0.08 }}
              className="group relative mb-4 break-inside-avoid overflow-hidden border border-white/10"
            >
              <div className={`relative ${foto.proporcao}`}>
                {faltando ? (
                  /* marcador do lugar, para saber qual arquivo falta */
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--gear-navy)]">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                      {foto.arquivo}
                    </span>
                  </div>
                ) : (
                  <img
                    src={PASTA + foto.arquivo}
                    alt={foto.legenda || `Portas Abertas 2026 — foto ${numero}`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    onError={() => setAusentes((anterior) => ({ ...anterior, [foto.arquivo]: true }))}
                  />
                )}

                {/* overlay navy com a legenda */}
                <figcaption className="absolute inset-0 flex items-end bg-[var(--gear-navy)]/70 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="font-mono text-[10px] leading-snug tracking-[0.15em] text-foreground">
                    {foto.legenda || `PORTAS ABERTAS 2026 · ${numero}`}
                  </span>
                </figcaption>
              </div>
            </motion.figure>
          )
        })}
      </div>
    </section>
  )
}
