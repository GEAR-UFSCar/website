"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

/*
 * Galeria de eventos. A ordem é definida pelo conteúdo, não alfabética:
 * cada evento abre em plano geral, alterna pessoas e robôs, e as fotos do
 * mesmo instante ficam separadas para não parecerem repetição. Os eventos
 * não se misturam — primeiro a Universidade Aberta, depois a SeCoT.
 *
 * LAYOUT EM FILEIRAS DE ALTURA CONSTANTE. Duas tentativas anteriores
 * falharam por motivos opostos. Grade de células fixas cortava retrato em
 * quadrado e deixava célula vazia quando a soma não fechava múltiplo de 5.
 * Colunas (masonry) não cortavam nada, mas davam a MESMA LARGURA para todas:
 * uma 16:9 ficava ~3x mais baixa que uma retrato, some na página.
 * Aqui o que é constante é a altura da fileira, não a largura da coluna —
 * então a horizontal ganha a largura que a proporção dela pede, a retrato
 * ocupa o estreito, e ninguém é cortado. O truque é flex: `flex-basis` e
 * `flex-grow` proporcionais à razão largura/altura fazem cada fileira
 * fechar exata na borda, com todos os itens na mesma altura.
 * `--altura-alvo` é essa altura; mexer nela é o único ajuste de tamanho.
 * Vale a partir de md — no mobile são duas colunas fixas, ver o contêiner.
 * O `max-width` existe só para a última fileira: sem ele, uma foto sozinha
 * na sobra esticaria para a largura inteira da tela.
 *
 * `largura`/`altura` são as dimensões medidas no arquivo (marcador SOF) e
 * reservam o espaço antes do carregamento, evitando salto de layout.
 */
const UNIVERSIDADE_ABERTA = "Universidade Aberta UFSCar 2026"
const SECOT = "SeCoT 2026"

const FOTOS = [
  {
    arquivo: "foto-01.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 1600,
    altura: 1200, // horizontal — abertura
    alt: "Laboratório de informática com estudantes em computadores durante a Universidade Aberta UFSCar",
  },
  {
    arquivo: "foto-05.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 1200,
    altura: 1600,
    alt: "Robô Mecanum sendo demonstrado numa mesa com pista de linha",
  },
  {
    arquivo: "foto-02.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 900,
    altura: 1600,
    alt: "Grupo de estudantes ouvindo apresentação sobre a GEAR",
  },
  {
    arquivo: "foto-03.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 900,
    altura: 1600,
    alt: "Membro da GEAR explicando o funcionamento de um robô a um grupo de visitantes",
  },
  {
    arquivo: "foto-06.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 1600,
    altura: 900, // horizontal — destaque do meio
    alt: "Equipe da GEAR reunida durante a Universidade Aberta UFSCar 2026",
  },
  {
    arquivo: "foto-04.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 1200,
    altura: 1600,
    alt: "Robô Navegador Mecanum sobre a pista de testes durante demonstração",
  },
  {
    arquivo: "foto-07.jpg",
    evento: UNIVERSIDADE_ABERTA,
    largura: 900,
    altura: 1600,
    alt: "Membro da GEAR de camiseta da Universidade Aberta falando a um grupo de estudantes do ensino fundamental numa sala de aula, com o Instagram da GEAR escrito no quadro",
  },
  {
    arquivo: "foto-08.jpg",
    evento: SECOT,
    largura: 1600,
    altura: 900, // horizontal — abertura da SeCoT
    alt: "Televisão exibindo a interface do GEAR AI Rover v21 em execução: feed da câmera com visão computacional à esquerda e a telemetria da decisão da IA à direita",
  },
  {
    arquivo: "foto-09.jpg",
    evento: SECOT,
    largura: 900,
    altura: 1600,
    alt: "O AI Rover v21 em primeiro plano no chão, com a câmera montada em suporte vertical, e ao fundo a TV com o feed da visão computacional",
  },
  {
    arquivo: "foto-15.jpg",
    evento: SECOT,
    largura: 1200,
    altura: 1600,
    alt: "Dois robôs de rodas mecanum lado a lado na mesa, com sensores ultrassônicos na frente e a fiação exposta",
  },
  {
    arquivo: "foto-11.jpg",
    evento: SECOT,
    largura: 1200,
    altura: 1600,
    alt: "Membro da GEAR apontando para o robô sobre a pista de linha no chão, cercado por estudantes que acompanham a demonstração",
  },
  {
    arquivo: "foto-10.jpg",
    evento: SECOT,
    largura: 1600,
    altura: 900, // horizontal — destaque do meio
    alt: "Membro operando o notebook numa mesa comprida com QR code colado, robô mecanum sobre a mesa e um grupo de visitantes em volta",
  },
  {
    arquivo: "foto-17.jpg",
    evento: SECOT,
    largura: 1200,
    altura: 1600,
    alt: "Membro da GEAR segurando um robô mecanum e ajustando a placa com uma chave, com a TV do AI Rover ao fundo",
  },
  {
    arquivo: "foto-14.jpg",
    evento: SECOT,
    largura: 1200,
    altura: 1600,
    alt: "Vista geral do estande da GEAR na SeCoT: dois membros, dois robôs no chão e a bancada com a TV e o notebook da demonstração",
  },
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
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">05 — EVENTOS</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">Onde a GEAR já esteve</h2>
        <p className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">
          Universidade Aberta UFSCar e SeCoT — 2026
        </p>
      </motion.div>

      {/*
        --altura-alvo é a altura de cada fileira: número maior, foto maior.
        É o único botão de tamanho desta seção.

        No mobile o layout é outro: duas colunas fixas (multicol). Fileira de
        altura constante não sobrevive a tela estreita — cabe uma foto por
        fileira, e uma retrato sozinha esticada fica com altura de tela
        inteira. As propriedades flex dos itens são simplesmente ignoradas
        enquanto o contêiner não é flex, então os dois layouts convivem sem
        duplicar marcação.
      */}
      <div className="columns-2 gap-2 [--altura-alvo:13rem] md:flex md:flex-wrap md:items-start md:[--altura-alvo:18rem] lg:[--altura-alvo:23rem]">
        {FOTOS.map((foto) => {
          const faltando = ausentes[foto.arquivo]
          const razao = foto.largura / foto.altura

          return (
            <div
              key={foto.arquivo}
              className="group relative mb-2 block break-inside-avoid overflow-hidden bg-[var(--gear-ink)] md:mb-0"
              style={{
                flexGrow: razao,
                flexBasis: `calc(var(--altura-alvo) * ${razao})`,
                maxWidth: `calc(var(--altura-alvo) * 1.5 * ${razao})`,
              }}
            >
              {faltando ? (
                <div
                  className="flex items-center justify-center"
                  style={{ aspectRatio: `${foto.largura} / ${foto.altura}` }}
                >
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                    {foto.arquivo}
                  </span>
                </div>
              ) : (
                <>
                  <Image
                    src={PASTA + foto.arquivo}
                    alt={foto.alt}
                    width={foto.largura}
                    height={foto.altura}
                    /*
                     * Sem sizes, o Next escolhe o candidato do srcset pela
                     * largura INTRÍNSECA (até 1600px) e não pela renderizada —
                     * um celular baixava a foto inteira para exibi-la em ~180px.
                     * A largura renderizada agora depende da proporção: numa
                     * fileira de altura fixa, a horizontal ocupa ~3x o que a
                     * retrato ocupa. Daí duas estimativas em vez de uma.
                     */
                    sizes={
                      razao > 1
                        ? "(min-width: 768px) 50vw, 50vw"
                        : "(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 50vw"
                    }
                    className="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-105"
                    onError={() => setAusentes((anterior) => ({ ...anterior, [foto.arquivo]: true }))}
                  />
                  {/* Etiqueta do evento — só aparece no hover, sem roubar o hover da imagem */}
                  <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-[var(--gear-ink)]/90 via-[var(--gear-ink)]/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100">
                    <span className="p-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gear-amber)]">
                      {foto.evento}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

    </section>
  )
}
