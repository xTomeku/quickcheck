import { createContext, useContext } from 'react'

export type Valore = number | string

// Tutto ciò che lo studente ha scelto e risposto, finché non invia: resta solo sul suo dispositivo
export type Bozza = {
  edizioneId: string | null
  corsoId: string | null
  anno: number | 'fuori_corso' | null
  // Vero quando corso e anno vengono dal server: registrati al primo invio, non si cambiano più
  corsoBloccato: boolean
  // id di materie_corso, nell'ordine in cui verranno compilate
  materieScelte: string[]
  // per ogni materia_corso: chiave domanda (o domanda:insegnamento) -> valore (numero o id opzione)
  risposte: Record<string, Record<string, Valore>>
  // per ogni materia_corso: insegnamenti dichiarati «non ho seguito questo docente»
  saltati: Record<string, string[]>
  // risposte alle domande Extra (una volta sola, non legate a una materia): id domanda -> valore o testo
  extra: Record<string, Valore>
}

export const BOZZA_VUOTA: Bozza = {
  edizioneId: null,
  corsoId: null,
  anno: null,
  corsoBloccato: false,
  materieScelte: [],
  risposte: {},
  saltati: {},
  extra: {},
}

const CHIAVE = 'sondaggio-bozza-v1'

export function leggiBozza(): Bozza {
  try {
    const testo = localStorage.getItem(CHIAVE)
    return testo ? { ...BOZZA_VUOTA, ...JSON.parse(testo) } : BOZZA_VUOTA
  } catch {
    return BOZZA_VUOTA
  }
}

export function salvaBozza(bozza: Bozza) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(bozza))
  } catch {
    // Archiviazione non disponibile (ad esempio navigazione privata): la bozza resta in memoria
  }
}

export function cancellaBozza() {
  try {
    localStorage.removeItem(CHIAVE)
  } catch {
    // Niente da cancellare
  }
}

type Contesto = {
  bozza: Bozza
  aggiorna: (modifica: (b: Bozza) => Bozza) => void
  azzera: () => void
}

export const BozzaContext = createContext<Contesto | null>(null)

export function useBozza(): Contesto {
  const contesto = useContext(BozzaContext)
  if (!contesto) throw new Error('useBozza va usato dentro BozzaProvider')
  return contesto
}
