import type { Domanda, Esito, EsitoDomanda, Risposta, RisultatoSezione, Sezione } from '../types'
import { FORMATO } from './dati'

const ARTICOLI = /^(il|lo|la|i|gli|le|l'|un|uno|una|un')\s*/

/** Minuscolo, senza accenti, senza punteggiatura finale né articolo iniziale, spazi compattati. */
export function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[−–]/g, '-')
    .replace(/²/g, '2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;:!?]+$/, '')
    .replace(ARTICOLI, '')
    .trim()
}

const PAROLE_NUMERO: Record<string, number> = {
  zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
}

/** Il numero e nient'altro: niente spazi, niente unità, già in minuscolo. */
function soloNumero(s: string): number | null {
  // separatore delle migliaia all'italiana: 49.050 o 1.000.000
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '')
  s = s.replace(',', '.')
  const potenza = s.match(/^([+-]?\d*\.?\d*)?(?:[·*×x])?10\^([+-]?\d+)$/)
  if (potenza) {
    const mantissa = potenza[1] === undefined || potenza[1] === '' || potenza[1] === '+' ? 1 : potenza[1] === '-' ? -1 : Number(potenza[1])
    const esponente = Number(potenza[2])
    if (Number.isNaN(mantissa) || Number.isNaN(esponente)) return null
    return mantissa * 10 ** esponente
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return null
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}

/**
 * Interpreta un numero scritto come lo scriverebbe uno studente:
 * "49050", "49.050" (separatore delle migliaia), "0,02", "4,9·10^4", "4.9x10^4", "1e5", "10^5", "-4", "+6".
 * Un'unità di misura in coda viene ignorata, comprese quelle con cifre dentro: "20 m/s", "5 m/s^2",
 * "1000 kg/m3". Restituisce null se non è un numero.
 */
export function leggiNumero(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, '')
  if (s in PAROLE_NUMERO) return PAROLE_NUMERO[s]
  const meno = s.match(/^meno(.+)$/)
  if (meno) {
    const v = leggiNumero(meno[1])
    return v === null ? null : -v
  }
  const diretto = soloNumero(s)
  if (diretto !== null) return diretto
  // L'unità si toglie soltanto adesso, e solo se comincia per lettera: prima si prova a leggere
  // tutta la stringa come numero, altrimenti la "e" di "1e5" e il "10^" di "10^5" verrebbero
  // scambiati per unità di misura. Dentro l'unità possono stare cifre e barre: m/s^2, kg/m3, mmHg.
  const senzaUnita = s.replace(/[a-zµ°%][a-zµ°%/^·.\-²³0-9]*$/, '')
  return senzaUnita === s ? null : soloNumero(senzaUnita)
}

export function rispostaCorretta(domanda: Domanda, risposta: Risposta): boolean {
  if (domanda.tipo === 'multipla') return risposta === domanda.corretta
  if (typeof risposta !== 'string' || risposta.trim() === '') return false
  const data = normalizza(risposta)
  if (domanda.accettate.some((a) => normalizza(a) === data)) return true
  if (domanda.numero) {
    const v = leggiNumero(risposta)
    if (v === null) return false
    const { valore, tolleranza } = domanda.numero
    if (tolleranza === 0) return Math.abs(v - valore) < 1e-9
    return Math.abs(v - valore) <= Math.abs(valore) * tolleranza + 1e-12
  }
  return false
}

export function esito(domanda: Domanda, risposta: Risposta): Esito {
  const vuota = risposta === null || risposta === undefined || (typeof risposta === 'string' && risposta.trim() === '')
  if (vuota) return 'omessa'
  return rispostaCorretta(domanda, risposta) ? 'corretta' : 'errata'
}

export function puntiDa(conteggi: { corrette: number; errate: number }): number {
  const p = conteggi.corrette * FORMATO.punteggio.corretta + conteggi.errate * FORMATO.punteggio.errata
  return Math.round(p * 10) / 10
}

export function correggiSezione(sezione: Sezione, banca: Map<string, Domanda>): RisultatoSezione {
  const dettaglio: EsitoDomanda[] = sezione.domande.map(({ id }) => {
    const d = banca.get(id)
    if (!d) throw new Error(`Domanda ${id} non trovata`)
    return { id, argomento: d.argomento, tipo: d.tipo, esito: esito(d, sezione.risposte[id] ?? null) }
  })
  const corrette = dettaglio.filter((x) => x.esito === 'corretta').length
  const errate = dettaglio.filter((x) => x.esito === 'errata').length
  const omesse = dettaglio.length - corrette - errate
  return { materia: sezione.materia, punti: puntiDa({ corrette, errate }), corrette, errate, omesse, dettaglio }
}

/** Formato italiano con al massimo una cifra decimale: 24,3 */
export function formattaPunti(p: number): string {
  return p.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}
