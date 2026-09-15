
/*
 * Áreas de apoio. Os cargos Tesouraria e Comunicação existem em
 * lib/administracao.ts e aparecem no seletor de cargos, mas o site público
 * nunca os mencionava: quem faz captação, finanças ou comunicação não tinha
 * lugar nenhum, e o recrutamento ficava restrito a quem programa.
 *
 * Cornell Cup e ThundeRatz tratam essas áreas como pares das técnicas —
 * "Business" e "Design & Marketing" ficam ao lado de Mecânica e Software.
 *
 * A descrição é curta de propósito: descreve a função pelo que o cargo já faz
 * na estrutura, sem inventar atribuição que a diretoria não definiu.
 */
import { Surge } from "@/components/surge"

const apoio = [
  {
    nome: "Comunicação",
    texto:
      "Divulgação do que o grupo produz: redes, material de apresentação e a relação com a universidade. É quem faz o trabalho técnico chegar a quem não está na sala.",
  },
  {
    nome: "Tesouraria",
    texto:
      "Captação e prestação de contas. Acompanha o patrimônio da entidade, organiza as necessidades por prioridade e conduz a conversa com patrocinadores.",
  },
]

const frentes = [
  {
    nome: "Competição",
    resumo: "RoboCup Rescue Simulation — robôs de busca e resgate em ambiente simulado.",
    detalhe:
      "A liga é de simulação: o cenário de desastre, os sensores e o robô vivem no Webots, e a lógica roda em ROS 2. O problema central é navegar e mapear um ambiente desconhecido e degradado — daí o SLAM. Prazo de competição é externo e não negocia: o que não estiver pronto na data não compete.",
    ficha: [
      { label: "Liga", valor: "RoboCup Rescue Simulation" },
      { label: "Stack", valor: "Webots · ROS 2 · SLAM" },
      { label: "Squad", valor: "João (direção) · Nasser · Guilherme" },
    ],
  },
  {
    nome: "Pesquisa",
    resumo: "Aprendizado por reforço, com foco em Safe RL — pesquisa que vira artigo de verdade.",
    detalhe:
      "RL resolve controle aprendendo por tentativa; Safe RL acrescenta a pergunta que importa em robótica: como garantir que a política aprendida não viole restrições durante o próprio aprendizado. O trabalho é conduzido com método — hipótese, experimento, dado e escrita — sob orientação docente, com publicação como meta declarada.",
    ficha: [
      { label: "Linha", valor: "RL · Safe RL" },
      { label: "Orientação", valor: "Prof. Iago Pacheco Gomes" },
      { label: "Meta", valor: "Publicar na SBC e no CBA" },
      { label: "Squad", valor: "Mateus (direção) · Pedro · Thomaz" },
    ],
  },
  {
    nome: "Projetos",
    resumo: "Automação aplicada, com o AI Rover como projeto piloto.",
    detalhe:
      "É a face de extensão mais direta do grupo: sistema especificado, construído e mantido. O AI Rover abre a frente — um rover autônomo dividido em três unidades que falham de forma independente: o ESP32-S3-CAM cuida da percepção e do rádio, o Arduino UNO dos reflexos, e o raciocínio roda via YOLO. Se uma parte cai, as outras não vão junto. Diferente da competição, aqui o sistema não pode só funcionar uma vez — e as decisões, incluindo a odometria em malha aberta que ainda não é confiável, ficam registradas na ficha do projeto.",
    ficha: [
      { label: "Piloto", valor: "AI Rover" },
      { label: "Squad", valor: "Luiza (direção) · Julio · Elis" },
    ],
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
            Toda pessoa passa pela mesma formação e só então escolhe uma frente. Não é especialização
            precoce: é escolha feita com repertório.
          </p>
        </Surge>
        {/*
          As três lado a lado, e não empilhadas: a página existe para a pessoa
          COMPARAR as frentes antes de escolher uma, e comparação em coluna
          única vira memória — quando se chega na terceira, a primeira já saiu
          da tela. `items-stretch` + `h-full` mantêm os três cards da mesma
          altura, para a ficha alinhar no rodapé de cada um.
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

              {/* mt-auto prende a ficha no rodapé do card, alinhada entre os três */}
              <div className="mt-auto pt-7">
                <div className="border border-[var(--gear-amber)] bg-[var(--gear-navy)] p-5">
                  <p className="font-mono text-[10px] md:text-[9px] tracking-[0.3em] text-[var(--gear-amber)]">
                    FRENTE
                  </p>
                  <dl className="mt-4 space-y-4">
                    {frente.ficha.map((linha) => (
                      <div key={linha.label}>
                        <dt className="font-mono text-[10px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          {linha.label}
                        </dt>
                        <dd className="mt-1 font-mono text-[11px] leading-relaxed text-foreground">
                          {linha.valor}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Surge>
          ))}
        </div>

        {/* Áreas de apoio — pares das frentes técnicas, não subordinadas */}
        <Surge className="mt-20 border-t border-white/10 pt-10">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">
            04 — ÁREAS DE APOIO
          </p>
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Não é só código</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
            Robô em pista depende de verba aprovada, peça comprada e resultado divulgado. Quem faz
            essa parte entra pela mesma formação e escolhe aqui, não numa fila separada.
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
