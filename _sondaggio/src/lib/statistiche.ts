import type { Database, Json } from './database.types'

export type RigaStat = Database['public']['Functions']['stat_risposte']['Returns'][number]

// Risposte raccolte per una domanda: quante, somma dei valori (per le scale) e quante per ogni valore o opzione
export type Agg = { n: number; somma: number; distribuzione: Record<string, number> }

export const AGG_VUOTO: Agg = { n: 0, somma: 0, distribuzione: {} }

// Sotto questa soglia i dati si mostrano lo stesso, ma segnalati: sono poco affidabili e rischiano
// di rendere riconoscibile chi ha risposto
export const SOGLIA_POCHE_RISPOSTE = 5

export function daRiga(r: { n: number; somma: number; distribuzione: Json }): Agg {
  return { n: r.n, somma: r.somma, distribuzione: r.distribuzione as Record<string, number> }
}

export function unisci(a: Agg, b: Agg): Agg {
  const distribuzione = { ...a.distribuzione }
  for (const [k, v] of Object.entries(b.distribuzione)) distribuzione[k] = (distribuzione[k] ?? 0) + v
  return { n: a.n + b.n, somma: a.somma + b.somma, distribuzione }
}

export function media(a: Agg | undefined): number | null {
  return a && a.n > 0 ? a.somma / a.n : null
}

export const formatta = (x: number) => x.toFixed(2).replace('.', ',')

