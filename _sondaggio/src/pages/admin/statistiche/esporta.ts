import type { Cell, Row, Sheet } from 'write-excel-file/browser'
import { normalizza } from '../../../lib/nomi'
import { media, SOGLIA_POCHE_RISPOSTE, type Agg } from '../../../lib/statistiche'
import { voci, type DomandaRif } from './dati'

// Edizione e filtri con cui sono stati calcolati i dati: finiscono nel foglio «Informazioni»
export type Contesto = [string, string][]

// Una domanda da esportare, con le colonne che la precedono (categoria, docente, materia…)
export type VoceEsportazione = {
  colonne: (string | number)[]
  domanda: DomandaRif
  agg: Agg | undefined
}

type Esportazione = {
  nomeFile: string
  contesto: Contesto
  // Titoli delle colonne iniziali, uno per ogni valore di `colonne`
  titoliColonne: string[]
  voci: VoceEsportazione[]
}

// Riga dei titoli: inchiostro scuro e testo bianco, così si stacca dai dati.
// I titoli delle colonne di numeri sono centrati come i numeri sotto.
const titolo = (testo: string, centrato = false): Cell => ({
  value: testo,
  fontWeight: 'bold',
  textColor: '#ffffff',
  backgroundColor: '#1b6580',
  alignVertical: 'center',
  align: centrato ? 'center' : 'left',
  wrap: true,
})

const titoloNumero = (testo: string) => titolo(testo, true)

const testo = (valore: string | number): Cell =>
  typeof valore === 'number'
    ? { value: valore, type: Number, align: 'center', alignVertical: 'top' }
    : { value: valore, type: String, wrap: true, alignVertical: 'top' }

const numero = (valore: number | null, format?: string): Cell =>
  valore === null ? null : { value: valore, type: Number, format, align: 'center', alignVertical: 'top' }

// Le colonne iniziali che contengono numeri (come «Non l'hanno seguito») hanno il titolo centrato
const titoliIniziali = (titoli: string[], elenco: VoceEsportazione[]) =>
  titoli.map((t, i) => (elenco.some((v) => typeof v.colonne[i] === 'number') ? titoloNumero(t) : titolo(t)))

const larghezzaColonne = (n: number) => Array.from({ length: n }, () => ({ width: 22 }))

export function nomeFile(tipo: string, nome?: string) {
  return `statistiche-${tipo}${nome ? `-${normalizza(nome).replace(/ /g, '-')}` : ''}.xlsx`
}

// Domande a scala: una riga per domanda, prima le percentuali per valore e poi i conteggi
function foglioScale(titoliColonne: string[], elenco: VoceEsportazione[]): Sheet<unknown> | null {
  const scale = elenco.filter((v) => v.domanda.tipo_risposta === 'scala')
  if (scale.length === 0) return null
  const valori = [...new Set(scale.flatMap((v) => voci(v.domanda, v.agg).map((x) => x.etichetta)))].sort(
    (a, b) => Number(a) - Number(b),
  )

  const intestazione: Row = [
    ...titoliIniziali(titoliColonne, scale),
    titolo('Domanda'),
    titoloNumero('Risposte'),
    titoloNumero('Media'),
    ...valori.map((v) => titoloNumero(`${v} (%)`)),
    ...valori.map((v) => titoloNumero(`${v} (n)`)),
  ]
  const righe: Row[] = scale.map(({ colonne, domanda, agg }) => {
    const n = agg?.n ?? 0
    const conteggi = new Map(voci(domanda, agg).map((x) => [x.etichetta, x.conteggio]))
    return [
      ...colonne.map(testo),
      testo(domanda.testo),
      numero(n),
      numero(media(agg), '0.00'),
      ...valori.map((v) => numero(n > 0 && conteggi.has(v) ? (conteggi.get(v) ?? 0) / n : null, '0%')),
      ...valori.map((v) => numero(conteggi.has(v) ? (conteggi.get(v) ?? 0) : null)),
    ]
  })

  return {
    sheet: 'Domande a scala',
    data: [intestazione, ...righe],
    stickyRowsCount: 1,
    columns: [
      ...larghezzaColonne(titoliColonne.length),
      { width: 60 },
      { width: 10 },
      { width: 8 },
      ...valori.flatMap(() => [{ width: 7 }]),
      ...valori.flatMap(() => [{ width: 7 }]),
    ],
  }
}

// Domande a scelta: una riga per opzione, con quante l'hanno scelta e la percentuale
function foglioScelte(titoliColonne: string[], elenco: VoceEsportazione[]): Sheet<unknown> | null {
  const scelte = elenco.filter((v) => v.domanda.tipo_risposta === 'scelta_singola')
  if (scelte.length === 0) return null

  const intestazione: Row = [
    ...titoliIniziali(titoliColonne, scelte),
    titolo('Domanda'),
    titolo('Risposta'),
    titoloNumero('Risposte (n)'),
    titoloNumero('Risposte (%)'),
  ]
  const righe: Row[] = scelte.flatMap(({ colonne, domanda, agg }) => {
    const n = agg?.n ?? 0
    return voci(domanda, agg).map((x) => [
      ...colonne.map(testo),
      testo(domanda.testo),
      testo(x.etichetta),
      numero(x.conteggio),
      numero(n > 0 ? x.conteggio / n : null, '0%'),
    ])
  })

  return {
    sheet: 'Domande a scelta',
    data: [intestazione, ...righe],
    stickyRowsCount: 1,
    columns: [
      ...larghezzaColonne(titoliColonne.length),
      { width: 60 },
      { width: 28 },
      { width: 12 },
      { width: 12 },
    ],
  }
}

function foglioInformazioni(contesto: Contesto): Sheet<unknown> {
  const oggi = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  return {
    sheet: 'Informazioni',
    data: [
      [titolo('Voce'), titolo('Valore')],
      ...contesto.map(([voce, valore]) => [testo(voce), testo(valore)]),
      [testo('Esportato il'), testo(oggi)],
      [
        testo('Attenzione'),
        testo(
          `Sotto le ${SOGLIA_POCHE_RISPOSTE} risposte i dati sono poco affidabili e possono rendere riconoscibile chi ha risposto.`,
        ),
      ],
    ],
    stickyRowsCount: 1,
    columns: [{ width: 22 }, { width: 70 }],
  }
}

// La libreria si carica solo qui: chi non esporta non la scarica
export async function esportaExcel({ nomeFile, contesto, titoliColonne, voci }: Esportazione) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const fogli = [
    foglioScale(titoliColonne, voci),
    foglioScelte(titoliColonne, voci),
    foglioInformazioni(contesto),
  ].filter((f): f is Sheet<unknown> => f !== null)
  await writeXlsxFile(fogli as Sheet<Blob>[]).toFile(nomeFile)
}
