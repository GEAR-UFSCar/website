
/*
 * Quem cuida do que fica fora da bancada, como no Regimento v2 (arts. 16 e 19):
 * a Presidência responde por administração, operações e patrimônio; Marketing é
 * a única área; e a documentação é de cada trilha. Não há mais Área Técnica:
 * a Presidência coordena as trilhas e a Academia.
 */
import { Surge } from "@/components/surge"

const apoio = [
  {
    nome: "Presidência",
    texto:
      "Presidente e Vice-Presidente cuidam das pessoas, dos processos e do patrimônio: processo seletivo, calendário, frequência, inventário, empréstimos de equipamento e a logística de eventos, viagens e aquisições.",
  },
  {
    nome: "Marketing",
    texto:
      "Divulgação do que o grupo produz: site, redes, identidade visual e a relação com parceiros. É quem faz o trabalho técnico chegar a quem não está na sala.",
  },
  {
    nome: "Documentação, em cada trilha",
    texto:
      "Cada trilha mantém suas atas, manuais e arquivo, e contribui com os relatórios entregues à ProEx. É o que permite o grupo sobreviver às formaturas.",
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
    resumo: "A frente Competição prepara equipes para competições de robótica. Ainda não competimos.",
    detalhe:
      "Para 2027 são dois alvos: a categoria de drones da Competição Brasileira de Robótica (CBR) e provas de seguidor de linha. Antes de ir para a pista, a equipe treina em competições simuladas, o que também deixa o trabalho andar enquanto os voos dependem de protocolo de segurança aprovado e de parceria formalizada pela UFSCar. A frente também vai construir uma plataforma robótica própria, além dos kits que já temos.",
  },
  {
    nome: "Pesquisa",
    resumo: "A frente Pesquisa estuda tomada de decisão de robôs móveis autônomos e tem como meta publicar em eventos nacionais. Ainda não há publicação.",
    detalhe:
      "O foco inicial é aprendizado por reforço e sua versão segura, com orientação do professor orientador ou de docente indicado por ele. Ainda estamos decidindo se a frente terá linhas de pesquisa permanentes ou projetos abertos conforme o interesse dos membros.",
  },
  {
    nome: "Projetos",
    resumo: "Soluções tecnológicas para demandas internas e externas, com o AI Rover como projeto piloto.",
    detalhe:
      "Ideias viram projeto oficial depois de um pitch e da aprovação da Presidência, e o trabalho acontece em squads e sprints curtos. Pedidos de fora, inclusive de tecnologia assistiva, são registrados por escrito antes de serem aceitos, e entregamos protótipos, não produtos certificados. É a face de extensão mais direta do grupo: sistema especificado, construído e mantido. O AI Rover abre a frente: um rover autônomo dividido em três unidades que falham de forma independente: o ESP32-S3-CAM cuida da percepção e do rádio, o Arduino UNO dos reflexos, e o raciocínio roda via YOLO. Se uma parte cai, as outras não vão junto. Diferente da competição, aqui o sistema não pode só funcionar uma vez. As decisões, incluindo a odometria em malha aberta que ainda não é confiável, ficam registradas na ficha do projeto.",
  },
]

export function Frentes() {
  return (
    <>
      {/* As três frentes */}
      <section id="frentes" className="relative mx-auto max-w-6xl px-8 md:px-12 py-24 md:py-32 scroll-mt-24">
        <Surge className="mb-12">
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Onde você entra</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
            Toda pessoa passa pela mesma formação e só então escolhe uma frente, com repertório para
            comparar as três.
          </p>
        </Surge>
        {/*
          As três lado a lado, e não empilhadas: a página existe para a pessoa
          COMPARAR as frentes antes de escolher uma, e comparação em coluna
          única vira memória, quando se chega na terceira, a primeira já saiu
          da tela. `items-stretch` + `h-full` mantêm os três cards da mesma
          altura mesmo com textos de comprimento diferente.
        */}
        <div className="grid grid-cols-1 items-stretch gap-px bg-linha lg:grid-cols-3">
          {frentes.map((frente, index) => (
            <Surge
              key={frente.nome}
              delay={index * 0.05}
              className="flex h-full flex-col bg-[var(--gear-ink)] p-7 transition-colors duration-300 hover:bg-[var(--gear-navy)]"
            >
              <span className="font-mono text-xs tracking-widest text-[var(--gear-amber)]">
                0{index + 1}
              </span>

              <h3 className="mt-4 font-sans text-3xl md:text-4xl font-light tracking-tight">
                {frente.nome}
              </h3>

              <p className="mt-4 font-sans text-base md:text-lg leading-relaxed">{frente.resumo}</p>

              <p className="mt-4 font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {frente.detalhe}
              </p>
            </Surge>
          ))}
        </div>

        {/* Áreas de apoio, pares das frentes técnicas, não subordinadas */}
        <Surge className="mt-20 border-t border-linha pt-10">
          <h2 className="font-sans text-3xl md:text-5xl font-light italic">Fora da bancada</h2>
          <p className="mt-5 max-w-[62ch] font-sans text-base md:text-lg font-light leading-relaxed text-muted-foreground">
            Robô em pista também depende de gente que cuida de pessoas, documentos, equipamento e
            divulgação. A Presidência coordena as três frentes e a formação, o Marketing leva o
            trabalho para fora e cada trilha guarda a própria memória.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {apoio.map((area) => (
              <div
                key={area.nome}
                className="border border-linha p-7 transition-colors duration-300 hover:border-[var(--gear-amber)]"
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
