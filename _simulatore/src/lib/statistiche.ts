import type { EsitoDomanda, MateriaId, Risultato } from '../types'
import { unitaDi } from './dati'

export interface StatArgomento {
  argomento: string
  viste: number
  corrette: number
  errate: number
  omesse: number
  /** quota di risposte non corrette, da 0 a 1 */
  quotaErrori: number
}

export function perArgomento(dettagli: EsitoDomanda[]): StatArgomento[] {
  const mappa = new Map<string, StatArgomento>()
  for (const d of dettagli) {
    const s = mappa.get(d.argomento) ?? { argomento: d.argomento, viste: 0, corrette: 0, errate: 0, omesse: 0, quotaErrori: 0 }
    s.viste++
    if (d.esito === 'corretta') s.corrette++
    else if (d.esito === 'errata') s.errate++
    else s.omesse++
    mappa.set(d.argomento, s)
  }
  for (const s of mappa.values()) s.quotaErrori = (s.errate + s.omesse) / s.viste
  return [...mappa.values()]
}

/** Una non data pesa meno di un errore: spesso a lasciare in bianco è il tempo che finisce. */
const PESO_OMESSA = 0.6

/** Domande fittizie aggiunte a ogni argomento, metà giuste e metà sbagliate, prima di giudicarlo. */
const SMORZAMENTO = 4

/** Quanto è andata male, con le non date che contano meno degli errori. Vale per argomenti e unità. */
export function quantoPesa(a: { errate: number; omesse: number }): number {
  return a.errate + PESO_OMESSA * a.omesse
}

export interface StatUnita {
  /** materia e numero insieme: le unità sono numerate da 1 dentro ogni materia */
  chiave: string
  materia: MateriaId
  numero: number
  titolo: string
  viste: number
  corrette: number
  errate: number
  omesse: number
}

/**
 * Raggruppa per unità del syllabus invece che per argomento.
 * Serve alla correzione di una prova sola: il generatore sparpaglia le domande su quasi
 * novanta argomenti diversi, quindi per argomento i conti sarebbero sempre "1 su 1".
 * Le unità sono 7 per materia, così i numeri tornano a dire qualcosa.
 */
export function perUnita(dettagli: EsitoDomanda[]): StatUnita[] {
  const mappa = new Map<string, StatUnita>()
  for (const d of dettagli) {
    const u = unitaDi(d.argomento)
    if (!u) continue
    const chiave = `${u.materia}-${u.numero}`
    const s = mappa.get(chiave) ?? { chiave, materia: u.materia, numero: u.numero, titolo: u.titolo, viste: 0, corrette: 0, errate: 0, omesse: 0 }
    s.viste++
    if (d.esito === 'corretta') s.corrette++
    else if (d.esito === 'errata') s.errate++
    else s.omesse++
    mappa.set(chiave, s)
  }
  return [...mappa.values()]
}

/**
 * Quanto c'è da preoccuparsi per un argomento, da 0 a 1.
 * La quota grezza di errori premierebbe i campioni minuscoli: 2 sbagli su 2 batterebbero 7 su 8.
 * Qui ogni argomento parte da SMORZAMENTO domande immaginarie andate a metà, quindi un argomento
 * con poche domande resta vicino al centro e sale solo quando ci sono prove che vada male davvero.
 */
export function gravita(a: { errate: number; omesse: number; viste: number }): number {
  return (quantoPesa(a) + SMORZAMENTO / 2) / (a.viste + SMORZAMENTO)
}

/** Argomenti da ripassare, dal peggiore in giù: più sbagli su più domande, più in alto. */
export function argomentiDeboli(storico: Risultato[], quanti = 5): StatArgomento[] {
  const tutti = storico.flatMap((r) => r.sezioni.flatMap((s) => s.dettaglio))
  return perArgomento(tutti)
    .filter((a) => quantoPesa(a) > 0)
    .sort((a, b) => gravita(b) - gravita(a) || quantoPesa(b) - quantoPesa(a))
    .slice(0, quanti)
}
