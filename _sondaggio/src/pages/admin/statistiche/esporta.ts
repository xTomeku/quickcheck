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

// Le risposte scritte, una per riga (quelle nascoste non si esportano)
export type TestiEsportazione = {
  titoli: string[]
  righe: { colonne: (string | number)[]; domanda: string; testo: string }[]
}

type Esportazione = {
  nomeFile: string
  contesto: Contesto
  // Titoli delle colonne iniziali, uno per ogni valore di `colonne`
  titoliColonne: string[]
  voci: VoceEsportazione[]
  testi?: TestiEsportazione
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
  const scelte = elenco.filter(
    (v) => v.domanda.tipo_risposta === 'scelta_singola' || v.domanda.tipo_risposta === 'scelta_multipla',
  )
  if (scelte.length === 0) return null

  const intestazione: Row = [
    ...titoliIniziali(titoliColonne, scelte),
    titolo('Domanda'),
    titolo('Risposta'),
    titoloNumero('Risposte (n)'),
    titoloNumero('Risposte (%)'),
  ]
  // Un blocco per domanda: categoria e domanda solo sulla prima riga (le altre restano vuote, così
  // filtri e ordinamento di Excel funzionano ancora), un filo sopra ogni blocco, la risposta più
  // scelta in grassetto e in fondo il totale su cui sono calcolate le percentuali
  const righe: Row[] = scelte.flatMap(({ colonne, domanda, agg }) => {
    const n = agg?.n ?? 0
    const opzioni = voci(domanda, agg)
    const massimo = Math.max(0, ...opzioni.map((x) => x.conteggio))
    const larghezza = colonne.length + 4
    const filo = { topBorderStyle: 'medium', topBorderColor: '#64748b' } as const
    const conFilo = (riga: Row) => riga.map((c) => ({ ...(c && typeof c === 'object' ? c : {}), ...filo }))

    const blocco: Row[] = opzioni.map((x, i) => {
      const prima = i === 0
      const piuScelta = massimo > 0 && x.conteggio === massimo
      const evidenza = piuScelta ? ({ fontWeight: 'bold' } as const) : {}
      // «1», «2», «3» scritti come numeri: Excel non li segnala più come numeri memorizzati come testo
      const etichetta: Cell = /^\d+$/.test(x.etichetta)
        ? { value: Number(x.etichetta), type: Number, align: 'left', alignVertical: 'top', ...evidenza }
        : { ...(testo(x.etichetta) as object), ...evidenza }
      const riga: Row = [
        ...(prima ? colonne.map(testo) : colonne.map(() => null)),
        prima ? { ...(testo(domanda.testo) as object), fontWeight: 'bold' } : null,
        etichetta,
        { ...(numero(x.conteggio) as object), ...evidenza },
        n > 0 ? { ...(numero(x.conteggio / n, '0%') as object), ...evidenza } : null,
      ]
      return prima ? conFilo(riga) : riga
    })

    const totale: Row = [
      ...Array.from({ length: larghezza - 3 }, () => null),
      { value: 'Totale', type: String, fontStyle: 'italic', textColor: '#475569' },
      { ...(numero(n) as object), fontStyle: 'italic', textColor: '#475569' },
      n > 0 ? { ...(numero(1, '0%') as object), fontStyle: 'italic', textColor: '#475569' } : null,
    ]
    return [...(blocco.length > 0 ? blocco : [conFilo(totale)]), ...(blocco.length > 0 ? [totale] : [])]
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

function foglioTesti(testi: TestiEsportazione | undefined): Sheet<unknown> | null {
  if (!testi || testi.righe.length === 0) return null
  return {
    sheet: 'Risposte scritte',
    data: [
      [...testi.titoli.map((t) => titolo(t)), titolo('Domanda'), titolo('Risposta')],
      ...testi.righe.map((r) => [...r.colonne.map(testo), testo(r.domanda), testo(r.testo)]),
    ],
    stickyRowsCount: 1,
    columns: [...larghezzaColonne(testi.titoli.length), { width: 45 }, { width: 80 }],
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
export async function esportaExcel({ nomeFile, contesto, titoliColonne, voci, testi }: Esportazione) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const fogli = [
    foglioScale(titoliColonne, voci),
    foglioScelte(titoliColonne, voci),
    foglioTesti(testi),
    foglioInformazioni(contesto),
  ].filter((f): f is Sheet<unknown> => f !== null)
  await writeXlsxFile(fogli as Sheet<Blob>[]).toFile(nomeFile)
}
