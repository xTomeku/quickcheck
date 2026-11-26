import {
  AGG_VUOTO,
  daRiga,
  formatta,
  SOGLIA_POCHE_RISPOSTE,
  unisci,
  type Agg,
  type RigaStat,
} from '../../../../lib/statistiche'
import { CATEGORIE } from '../../domande/etichette'
import type { VoceClassifica } from '../Classifica'
import { classificaDocenti, classificaMaterie } from '../classifiche'
import { CATEGORIE_DOCENTE, mediaGenerale, type DomandaRif, type TestoRisposta } from '../dati'
import type { Contesto } from '../esporta'
import type { Filtri } from '../filtri'
import type { Riferimenti } from './riferimenti'

// Dai dati letti dal database al contenuto del report. Nessuna lettura qui dentro: solo conti.

export type Richiesta = { tipo: 'generale' } | { tipo: 'materia'; id: string } | { tipo: 'docente'; id: string }

export type Opzioni = {
  // Valutazioni dei singoli docenti
  docenti: boolean
  // Risposte scritte dagli studenti
  testi: boolean
  // Mostra anche i risultati sotto la soglia di risposte
  tutto: boolean
}

export type DatiGrezzi = {
  // Per materia, corso e anno della materia
  compilazioni: { materia_id: string; corso_id: string; anno: number; n: number }[]
  studenti: number | null
  perMateria: RigaStat[]
  perDocente: RigaStat[]
  saltati: { docente_id: string; materia_id: string; n: number }[]
  testi: TestoRisposta[]
  extra: { domanda_id: string; n: number; somma: number; distribuzione: unknown }[]
  testiExtra: { domanda_id: string; testo: string }[]
}

export type Tessera = { etichetta: string; valore: string; nota?: string }
export type Barra = { nome: string; valore: number }
export type Risultato = { domanda: DomandaRif; agg: Agg }
export type Sezione = { titolo: string; risultati: Risultato[] }
export type Tabella = { titolo: string; colonna: string; etichettaN: string; voci: VoceClassifica[] }
export type Distribuzione = { titolo: string; conteggi: number[] }
export type GruppoTesti = { domanda: string; gruppi: { etichetta: string; testi: string[] }[] }

export type Modello = {
  titolo: string
  contesto: Contesto
  edizioneAperta: boolean
  creatoIl: string
  tutto: boolean
  // Il report generale è lungo: classifiche e domande cominciano su un foglio nuovo
  aCapitoli: boolean
  tessere: Tessera[]
  distribuzioni: Distribuzione[]
  perCorso: Barra[]
  perAnno: Barra[]
  estremi: { alte: VoceClassifica[]; basse: VoceClassifica[] } | null
  tabelle: Tabella[]
  sezioni: Sezione[]
  extra: Risultato[]
  testi: GruppoTesti[]
  // Risposte scritte lasciate fuori perché la materia (o la domanda Extra) ha troppe poche risposte
  testiTrattenuti: number
  filtriNonPerExtra: boolean
}

const poche = (n: number) => n > 0 && n < SOGLIA_POCHE_RISPOSTE
const media = (x: number | null) => (x === null ? '—' : formatta(x))

// Sotto la soglia la voce resta in elenco ma senza media, a meno che non si chieda di vedere tutto
const proteggi = (voci: VoceClassifica[], tutto: boolean) =>
  tutto ? voci : voci.map((v) => (poche(v.n) ? { ...v, media: null } : v))

// Somma le righe di una stessa domanda (per esempio su tutte le materie)
function perDomanda(righe: RigaStat[]) {
  const mappa = new Map<string, Agg>()
  for (const r of righe) mappa.set(r.domanda_id, unisci(mappa.get(r.domanda_id) ?? AGG_VUOTO, daRiga(r)))
  return mappa
}

// Le domande che hanno almeno una risposta, nell'ordine in cui le vede lo studente
function risultati(domande: DomandaRif[], mappa: Map<string, Agg>): Risultato[] {
  return domande
    .filter((d) => d.tipo_risposta !== 'testo' && (mappa.get(d.id)?.n ?? 0) > 0)
    .sort((a, b) => a.ordine - b.ordine)
    .map((d) => ({ domanda: d, agg: mappa.get(d.id)! }))
}

// Quante volte è stato dato ogni voto, contando le domande con la scala da 1 a 5
function distribuzione(
  titolo: string,
  righe: RigaStat[],
  domande: Map<string, DomandaRif>,
  tutto: boolean,
): Distribuzione[] {
  const conteggi = [0, 0, 0, 0, 0]
  for (const r of righe) {
    const d = domande.get(r.domanda_id)
    if (d?.tipo_risposta !== 'scala' || (d.scala_min ?? 1) !== 1 || (d.scala_max ?? 5) !== 5) continue
    const agg = daRiga(r)
    for (let i = 0; i < 5; i++) conteggi[i] += agg.distribuzione[String(i + 1)] ?? 0
  }
  const totale = conteggi.reduce((a, b) => a + b, 0)
  if (totale === 0 || (!tutto && poche(totale))) return []
  return [{ titolo, conteggi }]
}

function raggruppaTesti(voci: { domanda: DomandaRif; etichetta: string; testo: string }[]): GruppoTesti[] {
  const perId = new Map<string, { domanda: DomandaRif; gruppi: Map<string, string[]> }>()
  for (const v of voci) {
    const attuale = perId.get(v.domanda.id) ?? { domanda: v.domanda, gruppi: new Map<string, string[]>() }
    attuale.gruppi.set(v.etichetta, [...(attuale.gruppi.get(v.etichetta) ?? []), v.testo])
    perId.set(v.domanda.id, attuale)
  }
  return [...perId.values()]
    .sort((a, b) => a.domanda.ordine - b.domanda.ordine)
    .map((x) => ({
      domanda: x.domanda.testo,
      gruppi: [...x.gruppi]
        .sort(([a], [b]) => a.localeCompare(b, 'it'))
        .map(([etichetta, testi]) => ({ etichetta, testi })),
    }))
}

export function componiReport({
  richiesta,
  opzioni,
  filtri,
  contesto,
  rif,
  dati,
  adesso = new Date(),
}: {
  richiesta: Richiesta
  opzioni: Opzioni
  filtri: Filtri
  contesto: Contesto
  rif: Riferimenti
  dati: DatiGrezzi
  adesso?: Date
}): Modello {
  const { tutto } = opzioni
  const domandePerId = new Map(rif.domande.map((d) => [d.id, d]))
  const nomeMateria = new Map(rif.materie.map((m) => [m.id, m.nome]))
  const nomeDocente = new Map(rif.docenti.map((d) => [d.id, `${d.cognome} ${d.nome}`]))
  const sulDocente = (domandaId: string) =>
    CATEGORIE_DOCENTE.includes(domandePerId.get(domandaId)?.categoria ?? '')

  const compilazioniPerMateria = new Map<string, number>()
  for (const c of dati.compilazioni) {
    compilazioniPerMateria.set(c.materia_id, (compilazioniPerMateria.get(c.materia_id) ?? 0) + c.n)
  }

  const modello: Modello = {
    titolo: 'Report del sondaggio',
    contesto,
    edizioneAperta: rif.edizioni.find((e) => e.id === filtri.edizione)?.aperta ?? false,
    creatoIl: adesso.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
    tutto,
    aCapitoli: richiesta.tipo === 'generale',
    tessere: [],
    distribuzioni: [],
    perCorso: [],
    perAnno: [],
    estremi: null,
    tabelle: [],
    sezioni: [],
    extra: [],
    testi: [],
    testiTrattenuti: 0,
    filtriNonPerExtra: Boolean(filtri.tipoCorso || filtri.corso || filtri.annoCorso || filtri.annoStudente),
  }

  // Le risposte scritte che si possono includere: mai quelle nascoste, e (se non si chiede tutto)
  // solo quelle di materie con abbastanza compilazioni da non rendere riconoscibile chi le ha scritte
  function aggiungiTesti(
    testi: TestoRisposta[],
    etichetta: (t: TestoRisposta) => string,
  ): void {
    if (!opzioni.testi) return
    const visibili = testi.filter((t) => !t.nascosta && domandePerId.has(t.domanda_id))
    const ammessi = visibili.filter(
      (t) => tutto || (compilazioniPerMateria.get(t.materia_id) ?? 0) >= SOGLIA_POCHE_RISPOSTE,
    )
    modello.testiTrattenuti += visibili.length - ammessi.length
    modello.testi = raggruppaTesti(
      ammessi.map((t) => ({ domanda: domandePerId.get(t.domanda_id)!, etichetta: etichetta(t), testo: t.testo })),
    )
  }

  if (richiesta.tipo === 'generale') {
    const { elenco, righePerMateria } = classificaMaterie({
      filtri,
      materie: rif.materie,
      materieCorso: rif.materieCorso,
      corsi: rif.corsi,
      domandePerId,
      compilazioni: dati.compilazioni,
      righe: dati.perMateria,
    })
    const nelleMaterie = new Set(elenco.map((v) => v.id))
    // Il filtro sul tipo di corso non è un argomento del database: si applica qui, per materia
    const corsiDelTipo = new Set(
      rif.corsi.filter((c) => !filtri.tipoCorso || c.tipo === filtri.tipoCorso).map((c) => c.id),
    )
    const materieDelTipo = new Set(
      rif.materieCorso.filter((mc) => corsiDelTipo.has(mc.corso_id)).map((mc) => mc.materia_id),
    )
    const nelTipo = (materiaId: string | null) =>
      !filtri.tipoCorso || (materiaId !== null && materieDelTipo.has(materiaId))
    const righe = dati.perMateria.filter((r) => nelTipo(r.materia_id))
    const righeMaterie = [...nelleMaterie].flatMap((id) => righePerMateria.get(id) ?? [])

    const totale = elenco.reduce((somma, v) => somma + v.n, 0)
    const conRisposte = elenco.filter((v) => v.n > 0).length
    modello.titolo = 'Report generale del sondaggio'
    modello.tessere = [
      { etichetta: 'Compilazioni', valore: String(totale), nota: 'una per ogni materia valutata' },
      {
        etichetta: 'Studenti',
        valore: dati.studenti === null ? '—' : String(dati.studenti),
        nota: dati.studenti === null ? 'non calcolabile con filtri a edizione chiusa' : 'hanno compilato',
      },
      { etichetta: 'Materie valutate', valore: String(conRisposte), nota: `su ${elenco.length}` },
      {
        etichetta: 'Media materie',
        valore: !tutto && poche(totale) ? '—' : media(mediaGenerale(righeMaterie, domandePerId)),
        nota: 'su scala da 1 a 5',
      },
    ]

    const conteggiCorso = new Map<string, number>()
    const conteggiAnno = new Map<number, number>()
    for (const c of dati.compilazioni) {
      if (!corsiDelTipo.has(c.corso_id)) continue
      conteggiCorso.set(c.corso_id, (conteggiCorso.get(c.corso_id) ?? 0) + c.n)
      conteggiAnno.set(c.anno, (conteggiAnno.get(c.anno) ?? 0) + c.n)
    }
    modello.perCorso = rif.corsi
      .filter((c) => conteggiCorso.has(c.id))
      .map((c) => ({ nome: c.nome, valore: conteggiCorso.get(c.id)! }))
      .sort((a, b) => b.valore - a.valore || a.nome.localeCompare(b.nome, 'it'))
    modello.perAnno = [...conteggiAnno]
      .sort(([a], [b]) => a - b)
      .map(([anno, valore]) => ({ nome: `${anno}° anno`, valore }))

    modello.distribuzioni = distribuzione('Voti dati alle materie', righeMaterie, domandePerId, tutto)

    // Le più alte e le più basse: solo fra quelle con abbastanza risposte, e senza ripetizioni
    const affidabili = elenco
      .filter((v) => v.media !== null && v.n >= SOGLIA_POCHE_RISPOSTE)
      .sort((a, b) => b.media! - a.media! || a.nome.localeCompare(b.nome, 'it'))
    if (affidabili.length >= 6) {
      const quante = Math.min(5, Math.floor(affidabili.length / 2))
      modello.estremi = { alte: affidabili.slice(0, quante), basse: affidabili.slice(-quante).reverse() }
    }

    modello.tabelle.push({
      titolo: 'Classifica delle materie',
      colonna: 'Materia',
      etichettaN: 'Compilazioni',
      voci: proteggi(elenco, tutto),
    })

    if (opzioni.docenti) {
      const docenti = classificaDocenti({
        filtri,
        docenti: rif.docenti,
        insegnamenti: rif.insegnamenti,
        materie: rif.materie,
        materieCorso: rif.materieCorso,
        corsi: rif.corsi,
        domandePerId,
        righe: dati.perDocente,
      })
      const valutati = new Set(docenti.filter((d) => d.n > 0).map((d) => d.id))
      const righeDocenti = dati.perDocente.filter((r) => r.docente_id && valutati.has(r.docente_id))
      modello.tessere.push(
        { etichetta: 'Docenti valutati', valore: String(valutati.size), nota: `su ${docenti.length}` },
        {
          etichetta: 'Media docenti',
          valore: !tutto && poche(docenti.reduce((s, d) => s + d.n, 0)) ? '—' : media(mediaGenerale(righeDocenti, domandePerId)),
          nota: 'su scala da 1 a 5',
        },
      )
      modello.distribuzioni.push(
        ...distribuzione('Voti dati ai docenti', righeDocenti, domandePerId, tutto),
      )
      modello.tabelle.push({
        titolo: 'Classifica dei docenti',
        colonna: 'Docente',
        etichettaN: 'Valutazioni',
        voci: proteggi(docenti, tutto),
      })
    }

    const somme = perDomanda(righe)
    modello.sezioni = CATEGORIE.filter(
      (c) => c.id !== 'extra' && (opzioni.docenti || !CATEGORIE_DOCENTE.includes(c.id)),
    )
      .map((c) => ({
        titolo: c.nome,
        risultati: risultati(
          rif.domande.filter((d) => d.categoria === c.id),
          somme,
        ),
      }))
      .filter((s) => s.risultati.length > 0)

    const sommeExtra = new Map<string, Agg>(
      dati.extra.map((r) => [r.domanda_id, daRiga(r as Parameters<typeof daRiga>[0])]),
    )
    modello.extra = risultati(
      rif.domande.filter((d) => d.categoria === 'extra'),
      sommeExtra,
    )

    aggiungiTesti(
      dati.testi.filter((t) => nelTipo(t.materia_id) && (opzioni.docenti || !sulDocente(t.domanda_id))),
      (t) =>
        [nomeMateria.get(t.materia_id) ?? '?', t.docente_id ? nomeDocente.get(t.docente_id) : null]
          .filter(Boolean)
          .join(' · '),
    )

    // Le risposte Extra non riportano corso e anno: in un documento che gira direbbero troppo
    if (opzioni.testi) {
      const perId = new Map<string, string[]>()
      for (const t of dati.testiExtra) {
        if (domandePerId.has(t.domanda_id)) perId.set(t.domanda_id, [...(perId.get(t.domanda_id) ?? []), t.testo])
      }
      const gruppi = [...perId]
        .filter(([, testi]) => {
          const ammessi = tutto || testi.length >= SOGLIA_POCHE_RISPOSTE
          if (!ammessi) modello.testiTrattenuti += testi.length
          return ammessi
        })
        .map(([id, testi]) => ({ domanda: domandePerId.get(id)!, testi }))
        .sort((a, b) => a.domanda.ordine - b.domanda.ordine)
      modello.testi.push(
        ...gruppi.map((g) => ({ domanda: g.domanda.testo, gruppi: [{ etichetta: 'Domanda Extra', testi: g.testi }] })),
      )
    }
  }

  if (richiesta.tipo === 'materia') {
    const nome = nomeMateria.get(richiesta.id) ?? 'Materia'
    const n = dati.compilazioni.filter((c) => c.materia_id === richiesta.id).reduce((s, c) => s + c.n, 0)
    // Stessi corsi mostrati sullo schermo quando c'è il filtro sul tipo di corso
    const { elenco } = classificaMaterie({
      filtri,
      materie: rif.materie.filter((m) => m.id === richiesta.id),
      materieCorso: rif.materieCorso,
      corsi: rif.corsi,
      domandePerId,
      compilazioni: dati.compilazioni,
      righe: dati.perMateria,
    })
    const sullaMateria = dati.perMateria.filter((r) => !sulDocente(r.domanda_id))
    const docentiMateria = rif.insegnamenti
      .filter((i) => i.materia_id === richiesta.id)
      .map((i) => rif.docenti.find((d) => d.id === i.docente_id))
      .filter((d) => d !== undefined)
      .sort((a, b) => a.cognome.localeCompare(b.cognome, 'it'))

    modello.titolo = nome
    modello.tessere = [
      { etichetta: 'Compilazioni', valore: String(elenco[0]?.n ?? n) },
      {
        etichetta: 'Media generale',
        valore: !tutto && poche(n) ? '—' : media(mediaGenerale(sullaMateria, domandePerId)),
        nota: 'domande sulla materia, da 1 a 5',
      },
    ]
    if (opzioni.docenti) modello.tessere.push({ etichetta: 'Docenti', valore: String(docentiMateria.length) })
    modello.distribuzioni = distribuzione('Voti dati alla materia', sullaMateria, domandePerId, tutto)

    const domandeMateria = rif.domande.filter(
      (d) => d.categoria !== 'extra' && !CATEGORIE_DOCENTE.includes(d.categoria),
    )
    const sulla = risultati(domandeMateria, perDomanda(sullaMateria))
    if (sulla.length > 0) modello.sezioni.push({ titolo: 'La materia', risultati: sulla })

    if (opzioni.docenti) {
      const domandeDocente = rif.domande.filter((d) => CATEGORIE_DOCENTE.includes(d.categoria))
      const voci: VoceClassifica[] = docentiMateria.map((doc) => {
        const suoi = dati.perDocente.filter((r) => r.docente_id === doc.id)
        const saltati = dati.saltati.find((s) => s.docente_id === doc.id)?.n ?? 0
        const lista = risultati(domandeDocente, perDomanda(suoi))
        if (lista.length > 0) modello.sezioni.push({ titolo: `${doc.cognome} ${doc.nome}`, risultati: lista })
        return {
          id: doc.id,
          nome: `${doc.cognome} ${doc.nome}`,
          dettaglio:
            saltati > 0 ? (saltati === 1 ? '1 non l’ha seguito' : `${saltati} non l’hanno seguito`) : undefined,
          n: suoi.reduce((massimo, r) => Math.max(massimo, r.n), 0),
          media: mediaGenerale(suoi, domandePerId),
        }
      })
      if (voci.length > 0) {
        modello.tabelle.push({
          titolo: 'Docenti della materia',
          colonna: 'Docente',
          etichettaN: 'Valutazioni',
          voci: proteggi(voci, tutto),
        })
      }
    }

    aggiungiTesti(
      dati.testi.filter((t) => opzioni.docenti || !sulDocente(t.domanda_id)),
      (t) => (t.docente_id ? (nomeDocente.get(t.docente_id) ?? '?') : 'Sulla materia'),
    )
  }

  if (richiesta.tipo === 'docente') {
    const righeDomanda = dati.perMateria.filter((r) => sulDocente(r.domanda_id))
    const n = dati.perDocente.reduce((massimo, r) => Math.max(massimo, r.n), 0)
    const saltati = dati.saltati.reduce((s, x) => s + x.n, 0)

    modello.titolo = nomeDocente.get(richiesta.id) ?? 'Docente'
    modello.tessere = [
      { etichetta: 'Valutazioni', valore: String(n) },
      {
        etichetta: 'Media generale',
        valore: !tutto && poche(n) ? '—' : media(mediaGenerale(righeDomanda, domandePerId)),
        nota: 'su scala da 1 a 5',
      },
      { etichetta: 'Non l’hanno seguito', valore: String(saltati) },
    ]
    modello.distribuzioni = distribuzione('Voti dati al docente', righeDomanda, domandePerId, tutto)

    const materie = [...new Set(righeDomanda.flatMap((r) => (r.materia_id ? [r.materia_id] : [])))]
    const voci: VoceClassifica[] = materie.map((id) => {
      const suoi = righeDomanda.filter((r) => r.materia_id === id)
      return {
        id,
        nome: nomeMateria.get(id) ?? '?',
        n: suoi.reduce((massimo, r) => Math.max(massimo, r.n), 0),
        media: mediaGenerale(suoi, domandePerId),
      }
    })
    if (voci.length > 0) {
      modello.tabelle.push({
        titolo: 'Materie del docente',
        colonna: 'Materia',
        etichettaN: 'Valutazioni',
        voci: proteggi(voci, tutto),
      })
    }
    const lista = risultati(
      rif.domande.filter((d) => CATEGORIE_DOCENTE.includes(d.categoria)),
      perDomanda(righeDomanda),
    )
    if (lista.length > 0) {
      modello.sezioni.push({
        titolo: materie.length > 1 ? 'Domande sul docente, tutte le materie insieme' : 'Domande sul docente',
        risultati: lista,
      })
    }

    aggiungiTesti(
      dati.testi.filter((t) => t.docente_id === richiesta.id),
      (t) => nomeMateria.get(t.materia_id) ?? '?',
    )
  }

  return modello
}
