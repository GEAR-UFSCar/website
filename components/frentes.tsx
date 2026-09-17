
/*
 * Áreas de apoio. Existe uma só, Marketing: o recrutamento não pode ficar
 * restrito a quem programa, e quem faz divulgação precisa de um lugar na
 * página.
 *
 * Cornell Cup e ThundeRatz tratam essas áreas como pares das técnicas —
 * "Business" e "Design & Marketing" ficam ao lado de Mecânica e Software.
 *
 * O nome aqui é o de exibição e diverge de propósito de CARGOS em
 * lib/administracao.ts, que espelha um CHECK do banco e segue como
 * "Comunicação". Tesouraria continua sendo cargo atribuível lá, mas saiu do
 * site público.
 *
 * A descrição é curta de propósito: descreve a função pelo que o cargo já faz
 * na estrutura, sem inventar atribuição que a diretoria não definiu.
 */
import { Surge } from "@/components/surge"

const apoio = [
  {
    nome: "Marketing",
    texto:
      "Divulgação do que o grupo produz: redes, material de apresentação e a relação com a universidade. É quem faz o trabalho técnico chegar a quem não está na sala.",
  },
]

type Frente = {
  nome: string
  resumo: string
  detalhe: string
}

const frentes: Frente[] = [
  {
    nome: "Competição",
    resumo: "A trilha Competição prepara a equipe para disputar competições nacionais e internacionais de robótica.",
    detalhe:
      "Vamos participar de diversas competições ao longo do ano, com squad dedicado a SLAM, exploração autônoma e visão computacional — as competições específicas de cada ciclo serão anunciadas conforme forem confirmadas.",
  },
  {
    nome: "Pesquisa",
    resumo: "A trilha Pesquisa produz ciência de verdade: publicação em eventos nacionais, com orientação acadêmica formal.",
    detalhe:
      "A linha de pesquisa específica de cada ciclo é definida junto ao professor orientador conforme o interesse e a formação dos membros da trilha.",
  },
  {
    nome: "Projetos",
    resumo: "Automação aplicada, com o AI Rover como projeto piloto.",
    detalhe:
      "É a face de extensão mais direta do grupo: sistema especificado, construído e mantido. O AI Rover abre a frente — um rover autônomo dividido em três unidades que falham de forma independente: o ESP32-S3-CAM cuida da percepção e do rádio, o Arduino UNO dos reflexos, e o raciocínio roda via YOLO. Se uma parte cai, as outras não vão junto. Diferente da competição, aqui o sistema não pode só funcionar uma vez. As decisões, incluindo a odometria em malha aberta que ainda não é confiável, ficam registradas na ficha do projeto.",
  },
]

export function Frentes() {
  return (
    <>
      {/* As três frentes */}
      <section id="frentes" className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32 scroll-mt-24">
        <Surge className="mb-12">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">03 — AS TRÊS FRENTES</p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Onde você entra</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
            Toda pessoa passa pela mesma formação e só então escolhe uma frente, com repertório para
            comparar as três.
          </p>
        </Surge>
        {/*
          As três lado a lado, e não empilhadas: a página existe para a pessoa
          COMPARAR as frentes antes de escolher uma, e comparação em coluna
          única vira memória — quando se chega na terceira, a primeira já saiu
          da tela. `items-stretch` + `h-full` mantêm os três cards da mesma
          altura mesmo com textos de comprimento diferente.
        */}
        <div className="grid grid-cols-1 items-stretch gap-px bg-white/10 lg:grid-cols-3">
          {frentes.map((frente, index) => (
            <Surge
              key={frente.nome}
              delay={index * 0.05}
              className="flex h-full flex-col bg-[var(--gear-ink)] p-7 transition-colors duration-300 hover:bg-[var(--gear-navy)]"
            >
              <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)]">
                0{index + 1}
              </span>

              <h2 className="mt-4 font-sans text-3xl md:text-4xl font-light tracking-tight">
                {frente.nome}
              </h2>

              <p className="mt-4 font-sans text-base md:text-lg leading-relaxed">{frente.resumo}</p>

              <p className="mt-4 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {frente.detalhe}
              </p>
            </Surge>
          ))}
        </div>

        {/* Áreas de apoio — pares das frentes técnicas, não subordinadas */}
        <Surge className="mt-20 border-t border-white/10 pt-10">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            04 — ÁREAS DE APOIO
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Fora da bancada</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
            Robô em pista também depende de ter o trabalho divulgado, dentro e fora da
            universidade. Quem faz essa parte entra pela mesma formação e escolhe aqui, como em
            qualquer outra frente.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {apoio.map((area) => (
              <div
                key={area.nome}
                className="border border-white/10 p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
              >
                <h3 className="font-sans text-2xl font-light tracking-tight">{area.nome}</h3>
                <p className="mt-3 max-w-[62ch] font-sans text-sm font-light leading-relaxed text-muted-foreground">
                  {area.texto}
                </p>
              </div>
            ))}
          </div>
        </Surge>
      </section>
    </>
  )
}
