import assert from "node:assert/strict"
import {
  combinaBusca, dobrarLinha, ehDiaValido, empilhar, escaparICS, gerarICS, instanteGear, isoParaLocal,
  janelaDeHoras, linkGoogleAgenda, linkSeguro, localParaISO, numeroDoDia, diaDoNumero, diaDaSemana,
  ocorrenciaEm, ocorrencias, partesGear, rotuloDaRecorrencia, rotuloDoHorario, segmentos, somarDias,
} from "../lib/calendario.ts"
import { diaGear, horaGear } from "../lib/datas.ts"

// ---------------------------------------------------------------- dias
assert.equal(diaDoNumero(numeroDoDia("2026-10-21")), "2026-10-21")
assert.equal(somarDias("2026-10-31", 1), "2026-11-01")
assert.equal(somarDias("2026-12-31", 1), "2027-01-01")
assert.equal(somarDias("2028-03-01", -1), "2028-02-29") // ano bissexto
assert.equal(diaDaSemana("2026-10-21"), 3) // quarta
assert.equal(diaDaSemana("2026-10-18"), 0) // domingo
assert.equal(ehDiaValido("2026-02-31"), false)
assert.equal(ehDiaValido("2026-02-28"), true)
assert.equal(ehDiaValido("lixo"), false)

// ---------------------------------------------------------------- Brasília
// 22h30 em Sorocaba é 01h30 UTC do dia seguinte: o dia tem de ser o de Brasília.
assert.deepEqual(partesGear("2026-10-22T01:30:00Z"), { dia: "2026-10-21", minutos: 22 * 60 + 30, hora: "22:30" })
assert.equal(instanteGear("2026-10-21", 22 * 60 + 30), "2026-10-22T01:30:00.000Z")
assert.equal(instanteGear("2026-10-21"), "2026-10-21T03:00:00.000Z")
assert.equal(localParaISO("2026-10-21T14:30"), "2026-10-21T17:30:00.000Z")
assert.equal(isoParaLocal("2026-10-21T17:30:00.000Z"), "2026-10-21T14:30")

// Tem de concordar com lib/datas.ts (que usa Intl) em instantes de vários horários e viradas de dia.
for (const iso of [
  "2026-10-21T02:59:59Z", "2026-10-21T03:00:00Z", "2026-12-31T23:30:00Z", "2027-01-01T02:59:00Z",
  "2026-02-28T12:00:00Z", "2026-07-15T00:00:00Z", "2026-10-21T17:05:00Z",
]) {
  assert.equal(partesGear(iso).dia, diaGear(iso), `dia de ${iso}`)
  assert.equal(partesGear(iso).hora, horaGear(iso), `hora de ${iso}`)
}

// ---------------------------------------------------------------- ocorrências
const base = {
  id: "e1", titulo: "Reunião", descricao: null, tipo: "Reunião", frente_vinculada: null,
  data_inicio: instanteGear("2026-10-07", 19 * 60), data_fim: instanteGear("2026-10-07", 20 * 60 + 30),
}
const diasDe = (lista) => lista.map((o) => o.dia)

// Único: dentro, fora, na borda.
assert.deepEqual(diasDe(ocorrencias(base, "2026-10-01", "2026-10-31")), ["2026-10-07"])
assert.deepEqual(diasDe(ocorrencias(base, "2026-10-08", "2026-10-31")), [])
assert.deepEqual(diasDe(ocorrencias(base, "2026-10-07", "2026-10-07")), ["2026-10-07"])

// Semanal: quarta-feira, só as que caem na janela.
const semanal = { ...base, recorrencia: "semanal" }
assert.deepEqual(diasDe(ocorrencias(semanal, "2026-10-19", "2026-11-01")), ["2026-10-21", "2026-10-28"])
// Janela longe da base (sem percorrer semana por semana desde o início).
assert.deepEqual(diasDe(ocorrencias(semanal, "2027-01-01", "2027-01-07")), ["2027-01-06"])
// Janela antes do início: nada (a repetição não vai para trás).
assert.deepEqual(diasDe(ocorrencias(semanal, "2026-09-01", "2026-10-06")), [])
// Termina em `recorrencia_ate`, inclusive.
assert.deepEqual(
  diasDe(ocorrencias({ ...semanal, recorrencia_ate: "2026-10-21" }, "2026-10-01", "2026-12-31")),
  ["2026-10-07", "2026-10-14", "2026-10-21"],
)
// O horário se preserva e o fim acompanha a duração.
const o21 = ocorrencias(semanal, "2026-10-21", "2026-10-21")[0]
assert.equal(o21.inicioISO, "2026-10-21T22:00:00.000Z")
assert.equal(o21.fimISO, "2026-10-21T23:30:00.000Z")
assert.equal(o21.fimMin, 20 * 60 + 30)

// Quinzenal: de duas em duas semanas a partir da base.
assert.deepEqual(
  diasDe(ocorrencias({ ...base, recorrencia: "quinzenal" }, "2026-10-01", "2026-11-30")),
  ["2026-10-07", "2026-10-21", "2026-11-04", "2026-11-18"],
)

// Mensal no dia 31 pula os meses sem dia 31 (é o que o .ics também faz).
const dia31 = { ...base, data_inicio: instanteGear("2026-01-31", 600), data_fim: null, recorrencia: "mensal" }
assert.deepEqual(diasDe(ocorrencias(dia31, "2026-03-01", "2026-06-30")), ["2026-03-31", "2026-05-31"])
// Mensal atravessa a virada de ano.
const dia15 = { ...base, data_inicio: instanteGear("2026-11-15", 600), data_fim: null, recorrencia: "mensal" }
assert.deepEqual(diasDe(ocorrencias(dia15, "2026-12-01", "2027-02-28")), ["2026-12-15", "2027-01-15", "2027-02-15"])

// Evento das 22h30 em Brasília (01h30 UTC do dia seguinte): cada ocorrência fica no dia de Brasília.
const noturno = { ...base, data_inicio: instanteGear("2026-10-07", 22 * 60 + 30), data_fim: null, recorrencia: "semanal" }
assert.deepEqual(diasDe(ocorrencias(noturno, "2026-10-19", "2026-10-25")), ["2026-10-21"])
assert.equal(ocorrencias(noturno, "2026-10-21", "2026-10-21")[0].inicioISO, "2026-10-22T01:30:00.000Z")

// Dia inteiro de vários dias: aparece em todos os dias do intervalo, inclusive pela janela que pega só o fim.
const viagem = {
  ...base, titulo: "Competição", dia_inteiro: true,
  data_inicio: instanteGear("2026-11-13", 0), data_fim: instanteGear("2026-11-15", 0),
}
const [ov] = ocorrencias(viagem, "2026-11-01", "2026-11-30")
assert.equal(ov.dia, "2026-11-13")
assert.equal(ov.diaFim, "2026-11-15")
assert.deepEqual(ocorrencias(viagem, "2026-11-15", "2026-11-20").length, 1) // só o último dia na janela
assert.deepEqual(ocorrencias(viagem, "2026-11-16", "2026-11-20").length, 0)
assert.deepEqual(segmentos(ov, "2026-11-14", "2026-11-30").map((s) => s.dia), ["2026-11-14", "2026-11-15"])
assert.equal(segmentos(ov, "2026-11-01", "2026-11-30")[0].inicioMin, null)
assert.equal(rotuloDoHorario(ov), "Dia inteiro · 13/11 a 15/11")

// Dia inteiro e recorrente de 2 dias: janela que começa no 2º dia de uma ocorrência a encontra.
const duasNoites = {
  ...viagem, recorrencia: "semanal",
  data_inicio: instanteGear("2026-11-02", 0), data_fim: instanteGear("2026-11-03", 0),
}
assert.deepEqual(diasDe(ocorrencias(duasNoites, "2026-11-10", "2026-11-10")), ["2026-11-09"])

// Atravessa a meia-noite: 22h às 2h vira dois segmentos.
const virada = { ...base, data_inicio: instanteGear("2026-10-07", 22 * 60), data_fim: instanteGear("2026-10-08", 2 * 60) }
const [ovir] = ocorrencias(virada, "2026-10-07", "2026-10-08")
assert.equal(ovir.diaFim, "2026-10-08")
const segs = segmentos(ovir, "2026-10-07", "2026-10-08")
assert.deepEqual(segs.map((s) => [s.dia, s.inicioMin, s.fimMin]), [["2026-10-07", 1320, 1440], ["2026-10-08", 0, 120]])
assert.deepEqual(segs.map((s) => [s.continuaDeOntem, s.continuaAmanha]), [[false, true], [true, false]])
assert.equal(rotuloDoHorario(ovir), "07/10 22:00 – 08/10 02:00")

// Termina à meia-noite em ponto: um bloco só, até 24:00, sem segmento vazio no dia seguinte.
const ateMeiaNoite = { ...base, data_inicio: instanteGear("2026-10-07", 22 * 60), data_fim: instanteGear("2026-10-08", 0) }
const [om] = ocorrencias(ateMeiaNoite, "2026-10-07", "2026-10-09")
assert.equal(om.diaFim, "2026-10-07")
assert.equal(om.fimMin, 1440)
assert.equal(segmentos(om, "2026-10-07", "2026-10-09").length, 1)

// Sem fim: o bloco usa 1h só para desenhar (e avisa), e não passa da meia-noite.
const semFim = { ...base, data_fim: null }
const sf = segmentos(ocorrencias(semFim, "2026-10-07", "2026-10-07")[0], "2026-10-07", "2026-10-07")[0]
assert.deepEqual([sf.inicioMin, sf.fimMin, sf.semFim], [1140, 1200, true])
const tarde = { ...base, data_inicio: instanteGear("2026-10-07", 23 * 60 + 30), data_fim: null }
assert.equal(segmentos(ocorrencias(tarde, "2026-10-07", "2026-10-07")[0], "2026-10-07", "2026-10-07")[0].fimMin, 1440)

// Recorrência desconhecida (lixo no banco) é tratada como evento único.
assert.deepEqual(diasDe(ocorrencias({ ...base, recorrencia: "diaria" }, "2026-10-01", "2026-12-31")), ["2026-10-07"])

// ---------------------------------------------------------------- grade
const b = (id, inicio, fim) => ({ id, inicio, fim })
const pos = (lista) => Object.fromEntries(empilhar(lista).map((x) => [x.id, [x.coluna, x.colunas]]))

// Isolado: largura toda.
assert.deepEqual(pos([b("a", 540, 600)]), { a: [0, 1] })
// Dois que se sobrepõem: lado a lado.
assert.deepEqual(pos([b("a", 540, 660), b("b", 600, 720)]), { a: [0, 2], b: [1, 2] })
// Encadeado: C reaproveita a coluna de A (A termina quando C começa), mas o grupo continua de 2 colunas.
assert.deepEqual(pos([b("a", 540, 660), b("b", 600, 720), b("c", 660, 780)]), { a: [0, 2], b: [1, 2], c: [0, 2] })
// Separados: cada grupo com sua largura.
assert.deepEqual(pos([b("a", 540, 600), b("b", 600, 660)]), { a: [0, 1], b: [0, 1] })
// Três ao mesmo tempo.
assert.deepEqual(pos([b("a", 540, 600), b("b", 540, 600), b("c", 540, 600)]), { a: [0, 3], b: [1, 3], c: [2, 3] })
// Bloco curtinho ocupa 30 min visuais: 9h00 (5 min) e 9h10 se encostam.
assert.deepEqual(pos([b("a", 540, 545), b("b", 550, 610)]), { a: [0, 2], b: [1, 2] })
// Entrada fora de ordem dá o mesmo resultado.
assert.deepEqual(pos([b("b", 600, 720), b("a", 540, 660)]), { a: [0, 2], b: [1, 2] })
// Não muta a entrada.
const entrada = [b("b", 600, 720), b("a", 540, 660)]
empilhar(entrada)
assert.equal(entrada[0].id, "b")

assert.deepEqual(janelaDeHoras([]), { de: 7, ate: 22 })
assert.deepEqual(janelaDeHoras([b("a", 5 * 60 + 30, 8 * 60)]), { de: 5, ate: 22 })
assert.deepEqual(janelaDeHoras([b("a", 21 * 60, 23 * 60 + 30)]), { de: 7, ate: 24 })

// ---------------------------------------------------------------- texto
assert.equal(rotuloDoHorario(ocorrenciaEm(base, "2026-10-07")), "19:00–20:30")
assert.equal(rotuloDoHorario(ocorrenciaEm(semFim, "2026-10-07")), "19:00")
assert.equal(rotuloDoHorario(ocorrenciaEm({ ...base, dia_inteiro: true, data_fim: null }, "2026-10-07")), "Dia inteiro")

assert.equal(rotuloDaRecorrencia({ ...base, recorrencia: null }), null)
assert.equal(rotuloDaRecorrencia({ ...base, recorrencia: "semanal" }), "Toda quarta-feira")
assert.equal(rotuloDaRecorrencia({ ...base, recorrencia: "quinzenal" }), "A cada 2 semanas, às quartas-feiras")
assert.equal(rotuloDaRecorrencia({ ...base, recorrencia: "mensal" }), "Todo dia 7 do mês")
assert.equal(
  rotuloDaRecorrencia({ ...base, recorrencia: "semanal", recorrencia_ate: "2026-12-15" }),
  "Toda quarta-feira, até 15 de dezembro",
)
const sabado = { data_inicio: instanteGear("2026-10-10", 600), recorrencia: "semanal" }
assert.equal(rotuloDaRecorrencia(sabado), "Todo sábado")
assert.equal(rotuloDaRecorrencia({ ...sabado, recorrencia: "quinzenal" }), "A cada 2 semanas, aos sábados")

// Busca: sem acento, sem caixa, todas as palavras.
assert.equal(combinaBusca(["Reunião geral", "Sala 3"], "reuniao"), true)
assert.equal(combinaBusca(["Reunião geral", "Sala 3"], "REUNIÃO sala"), true)
assert.equal(combinaBusca(["Reunião geral", null], "reuniao laboratorio"), false)
assert.equal(combinaBusca(["x"], "   "), true)

// Link: só http(s).
assert.equal(linkSeguro("https://meet.google.com/abc"), "https://meet.google.com/abc")
assert.equal(linkSeguro("javascript:alert(1)"), null)
assert.equal(linkSeguro("data:text/html,x"), null)
assert.equal(linkSeguro("meet.google.com/abc"), null)
assert.equal(linkSeguro(null), null)

// ---------------------------------------------------------------- .ics
assert.equal(escaparICS("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne")

// Dobra respeitando bytes UTF-8 e sendo reversível.
const longa = "DESCRIPTION:" + "ação, reunião; ".repeat(20)
const dobrada = dobrarLinha(longa)
for (const parte of dobrada.split("\r\n")) assert.ok(new TextEncoder().encode(parte).length <= 75, "linha > 75 bytes")
assert.equal(dobrada.replace(/\r\n /g, ""), longa)
assert.equal(dobrarLinha("curta"), "curta")

const AGORA = "2026-10-21T12:00:00.000Z"
const ics = gerarICS({
  nome: "GEAR — agenda",
  agora: AGORA,
  eventos: [
    { ...semanal, id: "aaa", titulo: "Reunião, geral", local: "Sala 3; bloco B", link: "https://meet.google.com/x", recorrencia_ate: "2026-12-16", descricao: "Pauta\nde hoje" },
    { ...viagem, id: "bbb", frente_vinculada: "Competição" },
  ],
})
assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"))
assert.ok(ics.endsWith("END:VCALENDAR\r\n"))
assert.ok(ics.includes("DTSTAMP:20261021T120000Z"))
// Horário em UTC; evento semanal com fim e UNTIL ao fim do último dia em Brasília (02:59Z do dia seguinte).
assert.ok(ics.includes("DTSTART:20261007T220000Z"))
assert.ok(ics.includes("DTEND:20261007T233000Z"))
assert.ok(ics.includes("RRULE:FREQ=WEEKLY;UNTIL=20261217T025900Z"))
assert.ok(ics.includes("SUMMARY:Reunião\\, geral"))
assert.ok(ics.includes("LOCATION:Sala 3\\; bloco B"))
assert.ok(ics.includes("URL:https://meet.google.com/x"))
// Dia inteiro: datas sem hora, e o fim é EXCLUSIVO (dia seguinte ao último).
assert.ok(ics.includes("DTSTART;VALUE=DATE:20261113"))
assert.ok(ics.includes("DTEND;VALUE=DATE:20261116"))
assert.ok(ics.includes("CATEGORIES:Reunião,Competição"))
// Feed não leva alarme; o download de um evento, sim.
assert.ok(!ics.includes("VALARM"))
const comAlarme = gerarICS({ nome: "x", agora: AGORA, lembreteMin: 15, eventos: [base, viagem] })
assert.equal(comAlarme.match(/BEGIN:VALARM/g).length, 1) // só o evento com hora
assert.ok(comAlarme.includes("TRIGGER:-PT15M"))
// Nenhuma linha física passa de 75 bytes, e toda quebra é CRLF.
for (const linha of ics.split("\r\n")) assert.ok(new TextEncoder().encode(linha).length <= 75)
assert.ok(!/[^\r]\n/.test(ics))
// Sem fim: duração padrão em vez de DTEND.
assert.ok(gerarICS({ nome: "x", agora: AGORA, eventos: [semFim] }).includes("DURATION:PT60M"))
// Mensal e quinzenal.
assert.ok(gerarICS({ nome: "x", agora: AGORA, eventos: [{ ...base, recorrencia: "quinzenal" }] }).includes("RRULE:FREQ=WEEKLY;INTERVAL=2"))
assert.ok(gerarICS({ nome: "x", agora: AGORA, eventos: [{ ...base, recorrencia: "mensal" }] }).includes("RRULE:FREQ=MONTHLY"))
// Recorrência com data de fim em evento de dia inteiro usa a data pura.
assert.ok(
  gerarICS({ nome: "x", agora: AGORA, eventos: [{ ...viagem, recorrencia: "semanal", recorrencia_ate: "2026-12-01" }] })
    .includes("RRULE:FREQ=WEEKLY;UNTIL=20261201"),
)

// ---------------------------------------------------------------- Google Agenda
const g = new URL(linkGoogleAgenda(ocorrenciaEm({ ...semanal, local: "Sala 3", link: "https://x.com/y" }, "2026-10-21")))
assert.equal(g.origin + g.pathname, "https://calendar.google.com/calendar/render")
assert.equal(g.searchParams.get("action"), "TEMPLATE")
assert.equal(g.searchParams.get("text"), "Reunião")
assert.equal(g.searchParams.get("dates"), "20261021T220000Z/20261021T233000Z")
assert.equal(g.searchParams.get("location"), "Sala 3")
assert.equal(g.searchParams.get("recur"), "RRULE:FREQ=WEEKLY")
assert.equal(g.searchParams.get("ctz"), "America/Sao_Paulo")
assert.ok(g.searchParams.get("details").includes("https://x.com/y"))
const gd = new URL(linkGoogleAgenda(ocorrenciaEm(viagem, "2026-11-13")))
assert.equal(gd.searchParams.get("dates"), "20261113/20261116")
assert.equal(gd.searchParams.get("recur"), null)

console.log("calendario: ok")
