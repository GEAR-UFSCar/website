/**
 * Formatação de data em pt-BR, num lugar só. Estava copiada em cada página
 * que mostra data — mural, documentação e calendário usavam exatamente as
 * mesmas opções de toLocaleString.
 *
 * Roda no servidor, então usa o fuso do servidor, não o de quem lê. Para o
 * uso atual (datas da entidade, precisão de dia) isso não muda nada; se um
 * dia a hora exata importar por fuso, o lugar de resolver é aqui.
 *
 * `saudacao()` é o primeiro caso em que importa — e resolve aqui, fixando o
 * fuso da entidade em vez de confiar no relógio do servidor.
 */

/**
 * Fuso da entidade. A GEAR é da UFSCar Sorocaba: quem abre o painel está em
 * horário de Brasília, e é esse o "horário local" que a saudação precisa.
 *
 * Fixar o fuso é o que torna a saudação correta num Server Component. Em
 * produção (Vercel) o servidor roda em UTC — às 18h de Sorocaba seriam 21h no
 * relógio do processo, e a tela diria "Boa noite" no meio da tarde.
 */
export const FUSO_GEAR = "America/Sao_Paulo"

/*
 * As duas abaixo fixam FUSO_GEAR, e isso conserta um erro que estava em
 * produção: sem `timeZone`, `toLocaleString` usa o relógio do processo, que na
 * Vercel é UTC — um evento das 18h em Sorocaba era impresso como 21h.
 *
 * A outra razão é de renderização: desde que o diário do sprint passou a
 * formatar data dentro de um Client Component, a mesma chamada roda no
 * servidor (SSR) e no navegador. Com o fuso solto, as duas passadas produzem
 * textos diferentes e o React acusa divergência de hidratação. Fixo, não há
 * duas respostas possíveis.
 */

/** 11 de setembro de 2026 */
export const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: FUSO_GEAR,
  })

/** 11 de setembro de 2026, 14:30 */
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_GEAR,
  })

/** 14:30, no horário de Brasília. */
export const horaGear = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_GEAR })

/**
 * Timestamp → "YYYY-MM-DD" do dia em que ele cai em Brasília.
 *
 * Um evento às 22h de Sorocaba é 01h do dia seguinte em UTC; ler o dia com
 * getDate() no servidor da Vercel o colocaria na célula errada do calendário.
 */
export const diaGear = (iso: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: FUSO_GEAR,
  }).format(new Date(iso))

/**
 * Deslocamento de Brasília em relação a UTC. Fixo porque o Brasil não tem
 * horário de verão desde 2019 — se ele voltar, este é o único lugar a mudar.
 */
const OFFSET_GEAR = "-03:00"

/** "YYYY-MM-DD" → ISO do instante em que esse dia começa em Brasília. */
export const inicioDoDiaGear = (chave: string) =>
  new Date(`${chave.slice(0, 10)}T00:00:00${OFFSET_GEAR}`).toISOString()

/**
 * Corte para "próximos eventos": meia-noite de hoje, não o instante atual —
 * um evento que começou às 9h ainda é do dia de hoje às 15h.
 *
 * Meia-noite de BRASÍLIA. Com setHours(0) no servidor (UTC) o corte caía às
 * 21h do dia anterior e, depois das 21h, pulava para o dia seguinte.
 */
export function inicioDeHoje() {
  return inicioDoDiaGear(hojeISO())
}

/**
 * Instante atual em ISO, para comparar com coluna `timestamptz`.
 *
 * Irmã de `inicioDeHoje()`, e a escolha entre as duas é de sentido, não de
 * gosto: "próximos eventos" quer o dia inteiro (uma reunião das 9h ainda é
 * pauta de hoje às 15h), mas "próximo compromisso" quer o relógio — um
 * compromisso que já começou não é o próximo.
 */
export function agoraISO() {
  return new Date().toISOString()
}

/*
 * As duas abaixo são para colunas `date` (sem hora), como metas.prazo. Elas
 * NÃO podem passar por `new Date(iso)`: "2026-09-20" é interpretado como
 * meia-noite em UTC, que no fuso de Sorocaba (UTC-3) é dia 19 às 21h. O prazo
 * apareceria um dia antes do que a pessoa digitou — e uma meta para hoje
 * nasceria vencida.
 */

/** "2026-09-20" → "20 de setembro de 2026", sem o recuo de fuso. */
export function dataDoDia(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Hoje como "YYYY-MM-DD" em Brasília, para comparar com coluna `date` — no
 * banco, no filtro do PostgREST e na tela, sempre a mesma string.
 *
 * O FUSO É O DA ENTIDADE, não o do processo. Lendo o relógio do servidor, a
 * Vercel (UTC) vira o dia às 21h de Sorocaba: das 21h à meia-noite, "hoje"
 * seria amanhã. O efeito não é cosmético — é uma meta com prazo de hoje
 * sumindo do painel três horas antes da hora, e um prazo vencendo cedo na
 * contagem regressiva da Academia.
 *
 * `en-CA` porque é o locale cujo formato de data curta JÁ é "YYYY-MM-DD" —
 * montar a string com `format` em vez de `formatToParts` é o caminho curto
 * para o mesmo resultado.
 */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: FUSO_GEAR,
  }).format(new Date())
}

/**
 * "Bom dia" / "Boa tarde" / "Boa noite" pela hora de Brasília.
 *
 * Os cortes são os do uso corrente do português: 6h–11h manhã, 12h–17h tarde,
 * 18h em diante noite. A MADRUGADA (0h–5h) volta para "Boa noite", que é o que
 * se diz às 3h — quem está no painel a essa hora não está começando o dia. Sem
 * essa faixa, `hora < 12` cumprimentaria com "Bom dia" às duas da manhã.
 *
 * A hora sai de `Intl`, não de `getHours()`, porque só ela aplica o fuso sem
 * depender do relógio do processo. `hourCycle: "h23"` evita o "24" que o
 * formato padrão devolve à meia-noite e que cairia fora de toda faixa.
 */
export function saudacao(agora = new Date()): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: FUSO_GEAR,
    }).format(agora),
  )

  if (hora < 6) return "Boa noite"
  if (hora < 12) return "Bom dia"
  if (hora < 18) return "Boa tarde"
  return "Boa noite"
}
