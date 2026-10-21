import type { Domanda, DomandaInProva, Materia, MateriaId, Modalita, Prova, Sezione } from '../types'
import { FORMATO } from './dati'

export type Rng = () => number

/** Generatore pseudo-casuale con seme (mulberry32), utile nei test. */
export function rngConSeme(seme: number): Rng {
  let a = seme >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function mescola<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface OpzioniEstrazione {
  /** id di domande già viste di recente: vengono estratte meno spesso */
  viste?: Set<string>
  rng?: Rng
  /** argomenti da far uscire più spesso (id -> moltiplicatore del peso): serve ai ripassi */
  rinforzo?: Map<string, number>
}

/**
 * Estrae `quante` domande di un tipo con probabilità proporzionale al peso dell'argomento.
 * Ogni domanda già presa dallo stesso argomento ne dimezza il peso, così la prova copre più argomenti;
 * domande dello stesso `gruppo` (quasi duplicati) non escono mai insieme.
 */
export function estraiPesate(
  candidate: Domanda[],
  quante: number,
  pesi: Map<string, number>,
  { viste = new Set(), rng = Math.random }: OpzioniEstrazione = {},
): Domanda[] {
  const pool = candidate.slice()
  const scelte: Domanda[] = []
  const perArgomento = new Map<string, number>()
  const gruppiUsati = new Set<string>()

  while (scelte.length < quante && pool.length > 0) {
    const punteggi = pool.map((d) => {
      if (d.gruppo && gruppiUsati.has(d.gruppo)) return 0
      const base = pesi.get(d.argomento) ?? 0.001
      const giaPrese = perArgomento.get(d.argomento) ?? 0
      return (base / 2 ** giaPrese) * (viste.has(d.id) ? 0.25 : 1)
    })
    const totale = punteggi.reduce((s, x) => s + x, 0)
    if (totale === 0) break
    let r = rng() * totale
    let i = 0
    for (; i < punteggi.length - 1; i++) {
      r -= punteggi[i]
      if (r <= 0) break
    }
    const [d] = pool.splice(i, 1)
    scelte.push(d)
    perArgomento.set(d.argomento, (perArgomento.get(d.argomento) ?? 0) + 1)
    if (d.gruppo) gruppiUsati.add(d.gruppo)
  }
  return scelte
}

/**
 * Costruisce una sezione: prima le multiple, poi i completamenti, come nella prova ufficiale.
 * `quante` serve ai ripassi, che sono più corti dei 15 + 16 della prova vera.
 */
export function generaSezione(
  materia: Materia,
  banca: Domanda[],
  opzioni: OpzioniEstrazione = {},
  quante: { multipla: number; completamento: number } = FORMATO,
): Sezione {
  const rng = opzioni.rng ?? Math.random
  // il rinforzo non esclude gli altri argomenti, li mette solo in secondo piano: con una banca
  // piccola un ripasso che peschi solo dai deboli resterebbe a corto di domande
  const pesi = new Map(materia.argomenti.map((a) => [a.id, a.peso * (opzioni.rinforzo?.get(a.id) ?? 1)]))
  const multiple = estraiPesate(banca.filter((d) => d.tipo === 'multipla'), quante.multipla, pesi, opzioni)
  const completamento = estraiPesate(
    banca.filter((d) => d.tipo === 'completamento'),
    quante.completamento,
    pesi,
    opzioni,
  )
  const domande: DomandaInProva[] = [
    ...mescola(multiple, rng).map((d) => ({
      id: d.id,
      ordine: d.tipo === 'multipla' ? mescola([...d.opzioni.keys()], rng) : undefined,
    })),
    ...mescola(completamento, rng).map((d) => ({ id: d.id })),
  ]
  return { materia: materia.id, domande, risposte: {}, dubbi: [], scadenza: null, consegnata: false }
}

export function nuovaProva(
  modalita: Modalita,
  materie: Materia[],
  banche: Record<MateriaId, Domanda[]>,
  opzioni: OpzioniEstrazione = {},
  quante?: { multipla: number; completamento: number },
): Prova {
  return {
    id: `p${Date.now().toString(36)}${Math.floor((opzioni.rng ?? Math.random)() * 1e6).toString(36)}`,
    modalita,
    creata: Date.now(),
    sezioni: materie.map((m) => generaSezione(m, banche[m.id], opzioni, quante)),
    corrente: 0,
    conclusa: false,
  }
}
