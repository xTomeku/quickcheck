import type { Prova, Risultato } from '../types'

// Tutto resta sul dispositivo. Ogni accesso è protetto: in finestre private o con i dati
// del sito bloccati localStorage può lanciare eccezioni, e l'app deve funzionare comunque.
const CHIAVI = {
  inCorso: 'sf.prova-in-corso.v1',
  storico: 'sf.storico.v1',
  viste: 'sf.domande-viste.v1',
}

function leggi<T>(chiave: string, predefinito: T): T {
  try {
    const raw = localStorage.getItem(chiave)
    return raw ? (JSON.parse(raw) as T) : predefinito
  } catch {
    return predefinito
  }
}

function scrivi(chiave: string, valore: unknown) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore))
  } catch {
    /* archiviazione non disponibile: si continua senza salvare */
  }
}

function rimuovi(chiave: string) {
  try {
    localStorage.removeItem(chiave)
  } catch {
    /* niente da fare */
  }
}

export const archivio = {
  provaInCorso: () => leggi<Prova | null>(CHIAVI.inCorso, null),
  salvaProvaInCorso: (p: Prova) => scrivi(CHIAVI.inCorso, p),
  chiudiProvaInCorso: () => rimuovi(CHIAVI.inCorso),

  storico: () => leggi<Risultato[]>(CHIAVI.storico, []),
  aggiungiRisultato(r: Risultato) {
    const s = leggi<Risultato[]>(CHIAVI.storico, []).filter((x) => x.id !== r.id)
    scrivi(CHIAVI.storico, [r, ...s].slice(0, 200))
  },
  eliminaRisultato(id: string) {
    scrivi(CHIAVI.storico, leggi<Risultato[]>(CHIAVI.storico, []).filter((x) => x.id !== id))
  },
  svuotaStorico: () => rimuovi(CHIAVI.storico),

  /** Ultime domande viste, per farle uscire meno spesso nelle prove successive. */
  viste: () => new Set(leggi<string[]>(CHIAVI.viste, [])),
  segnaViste(ids: string[]) {
    const precedenti = leggi<string[]>(CHIAVI.viste, []).filter((id) => !ids.includes(id))
    scrivi(CHIAVI.viste, [...ids, ...precedenti].slice(0, 600))
  },
}
