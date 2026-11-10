import type { Valore } from './bozza'

export type Opzione = { id: string; testo: string; ordine: number }
export type Collegamento = {
  materia_id: string | null
  docente_id: string | null
  insegnamento_id: string | null
}

export type DomandaCompleta = {
  id: string
  testo: string
  categoria: string
  gruppo: string | null
  // Se presente, la domanda compare solo quando la risposta a quella domanda è una di queste opzioni
  mostra_se_domanda_id: string | null
  mostra_se_opzioni: string[]
  ambito_docente: string | null
  tipo_risposta: string
  scala_min: number | null
  scala_max: number | null
  etichetta_min: string | null
  etichetta_max: string | null
  obbligatoria: boolean
  ordine: number
  opzioni_risposta: Opzione[]
  collegamenti_domanda: Collegamento[]
}

export type Docente = { id: string; nome: string; cognome: string }
export type Insegnamento = { id: string; docente: Docente }

export type MateriaDati = {
  materiaCorsoId: string
  materiaId: string
  nome: string
  cfu: number | null
  anno: number
  insegnamenti: Insegnamento[]
}

export type BloccoDocente = { insegnamento: Insegnamento; domande: DomandaCompleta[] }

// Le domande che lo studente vede per una materia, nell'ordine in cui compaiono
export type Struttura = {
  generiche: DomandaCompleta[]
  specifiche: DomandaCompleta[]
  docenti: BloccoDocente[]
}

const perOrdine = (a: DomandaCompleta, b: DomandaCompleta) => a.ordine - b.ordine

export function costruisciStruttura(materia: MateriaDati, domande: DomandaCompleta[]): Struttura {
  const generiche = domande.filter((d) => d.categoria === 'generica').sort(perOrdine)
  const specifiche = domande
    .filter(
      (d) =>
        d.categoria === 'specifica_materia' &&
        d.collegamenti_domanda.some((c) => c.materia_id === materia.materiaId),
    )
    .sort(perOrdine)

  const docenti = [...materia.insegnamenti]
    .sort((a, b) => a.docente.cognome.localeCompare(b.docente.cognome))
    .map((insegnamento) => {
      const generiche = domande.filter((d) => d.categoria === 'generica_docente').sort(perOrdine)
      const specifiche = domande
        .filter((d) => {
          if (d.categoria !== 'specifica_docente') return false
          if (d.ambito_docente === 'docente') {
            return d.collegamenti_domanda.some((c) => c.docente_id === insegnamento.docente.id)
          }
          return d.collegamenti_domanda.some((c) => c.insegnamento_id === insegnamento.id)
        })
        .sort(perOrdine)
      return { insegnamento, domande: [...generiche, ...specifiche] }
    })

  return { generiche, specifiche, docenti }
}

export function haDomande(s: Struttura): boolean {
  return s.generiche.length + s.specifiche.length > 0 || s.docenti.some((b) => b.domande.length > 0)
}

export function chiaveRisposta(domandaId: string, insegnamentoId?: string): string {
  return insegnamentoId ? `${domandaId}:${insegnamentoId}` : domandaId
}

// In una domanda a scelta multipla il valore è l'elenco degli id delle opzioni scelte, separati da virgola
// (negli altri tipi è un solo id): così la bozza salvata nel dispositivo resta un valore semplice.
export function opzioniScelte(valore: Valore | undefined): string[] {
  return valore === undefined ? [] : String(valore).split(',').filter((o) => o !== '')
}

export function haRisposta(valore: Valore | undefined): boolean {
  return valore !== undefined && String(valore).trim() !== ''
}

// Divide le domande in gruppi con lo stesso titolo, nell'ordine in cui compaiono.
// Quelle senza gruppo vanno insieme, sotto `titoloSenza`.
export function raggruppa(
  domande: DomandaCompleta[],
  titoloSenza: string,
): { titolo: string; domande: DomandaCompleta[] }[] {
  const gruppi: { titolo: string; domande: DomandaCompleta[] }[] = []
  for (const d of domande) {
    const titolo = d.gruppo?.trim() || titoloSenza
    const esistente = gruppi.find((g) => g.titolo === titolo)
    if (esistente) esistente.domande.push(d)
    else gruppi.push({ titolo, domande: [d] })
  }
  return gruppi
}

// Domande Extra: si chiedono una sola volta alla fine, non per ogni materia
export function domandeExtra(domande: DomandaCompleta[]): DomandaCompleta[] {
  return domande.filter((d) => d.categoria === 'extra').sort(perOrdine)
}

export function contaMancantiExtra(domande: DomandaCompleta[], extra: Record<string, Valore>): number {
  return domandeExtra(domande).filter(
    (d) => d.obbligatoria && visibile(d, extra) && !haRisposta(extra[d.id]),
  ).length
}

// Risposte Extra nel formato atteso dal database (solo quelle date)
type VoceExtra = { domanda_id: string; valore_numero?: number; opzione_id?: string; testo?: string }

export function preparaExtra(domande: DomandaCompleta[], extra: Record<string, Valore>) {
  return domandeExtra(domande).flatMap((d): VoceExtra[] => {
    const valore = extra[d.id]
    if (!haRisposta(valore) || !visibile(d, extra)) return []
    if (d.tipo_risposta === 'scala') return [{ domanda_id: d.id, valore_numero: Number(valore) }]
    if (d.tipo_risposta === 'testo') return [{ domanda_id: d.id, testo: String(valore).trim() }]
    return [{ domanda_id: d.id, opzione_id: String(valore) }]
  })
}

// Una domanda condizionata si vede solo se la risposta alla domanda da cui dipende è una di quelle indicate.
// Le risposte date a una domanda nascosta (ad esempio cambiando idea prima) non contano e non si inviano.
export function visibile(
  d: DomandaCompleta,
  risposte: Record<string, Valore>,
  insegnamentoId?: string,
): boolean {
  if (!d.mostra_se_domanda_id) return true
  const valore = risposte[chiaveRisposta(d.mostra_se_domanda_id, insegnamentoId)]
  return opzioniScelte(valore).some((o) => d.mostra_se_opzioni.includes(o))
}

// Domande obbligatorie senza risposta (i docenti saltati e le domande nascoste non contano)
export function contaMancanti(
  struttura: Struttura,
  risposte: Record<string, Valore>,
  saltati: string[],
): number {
  let mancanti = 0
  for (const d of [...struttura.generiche, ...struttura.specifiche]) {
    if (d.obbligatoria && visibile(d, risposte) && !haRisposta(risposte[chiaveRisposta(d.id)])) {
      mancanti++
    }
  }
  for (const blocco of struttura.docenti) {
    if (saltati.includes(blocco.insegnamento.id)) continue
    const idIns = blocco.insegnamento.id
    for (const d of blocco.domande) {
      if (
        d.obbligatoria &&
        visibile(d, risposte, idIns) &&
        !haRisposta(risposte[chiaveRisposta(d.id, idIns)])
      ) {
        mancanti++
      }
    }
  }
  return mancanti
}

// Dati da inviare per una materia, nel formato atteso dal database
export function preparaInvio(
  materia: MateriaDati,
  struttura: Struttura,
  risposte: Record<string, Valore>,
  saltati: string[],
) {
  const voci: {
    domanda_id: string
    insegnamento_id?: string
    valore_numero?: number
    opzione_id?: string
    testo?: string
  }[] = []

  function aggiungi(d: DomandaCompleta, insegnamentoId?: string) {
    const valore = risposte[chiaveRisposta(d.id, insegnamentoId)]
    if (!haRisposta(valore) || !visibile(d, risposte, insegnamentoId)) return
    const base = { domanda_id: d.id, ...(insegnamentoId ? { insegnamento_id: insegnamentoId } : {}) }
    if (d.tipo_risposta === 'scala') voci.push({ ...base, valore_numero: Number(valore) })
    else if (d.tipo_risposta === 'testo') voci.push({ ...base, testo: String(valore).trim() })
    // Scelta multipla: una voce per ogni opzione segnata
    else for (const opzione of opzioniScelte(valore)) voci.push({ ...base, opzione_id: opzione })
  }

  for (const d of [...struttura.generiche, ...struttura.specifiche]) aggiungi(d)
  for (const blocco of struttura.docenti) {
    if (saltati.includes(blocco.insegnamento.id)) continue
    for (const d of blocco.domande) aggiungi(d, blocco.insegnamento.id)
  }

  return {
    materia_corso_id: materia.materiaCorsoId,
    risposte: voci,
    blocchi_saltati: saltati.filter((id) => materia.insegnamenti.some((i) => i.id === id)),
  }
}
