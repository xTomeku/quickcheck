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

export function haRisposta(valore: Valore | undefined): boolean {
  return valore !== undefined && valore !== ''
}

// Domande obbligatorie senza risposta (i docenti saltati non contano)
export function contaMancanti(
  struttura: Struttura,
  risposte: Record<string, Valore>,
  saltati: string[],
): number {
  let mancanti = 0
  for (const d of [...struttura.generiche, ...struttura.specifiche]) {
    if (d.obbligatoria && !haRisposta(risposte[chiaveRisposta(d.id)])) mancanti++
  }
  for (const blocco of struttura.docenti) {
    if (saltati.includes(blocco.insegnamento.id)) continue
    for (const d of blocco.domande) {
      if (d.obbligatoria && !haRisposta(risposte[chiaveRisposta(d.id, blocco.insegnamento.id)])) {
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
  }[] = []

  function aggiungi(d: DomandaCompleta, insegnamentoId?: string) {
    const valore = risposte[chiaveRisposta(d.id, insegnamentoId)]
    if (!haRisposta(valore)) return
    voci.push({
      domanda_id: d.id,
      ...(insegnamentoId ? { insegnamento_id: insegnamentoId } : {}),
      ...(d.tipo_risposta === 'scala'
        ? { valore_numero: Number(valore) }
        : { opzione_id: String(valore) }),
    })
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
