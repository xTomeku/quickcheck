export type MateriaId = 'biologia' | 'chimica' | 'fisica'

export interface DomandaMultipla {
  id: string
  argomento: string
  tipo: 'multipla'
  testo: string
  opzioni: string[]
  corretta: number
  spiegazione?: string
  gruppo?: string
}

export interface DomandaCompletamento {
  id: string
  argomento: string
  tipo: 'completamento'
  testo: string
  accettate: string[]
  numero?: { valore: number; tolleranza: number }
  unita?: string
  spiegazione?: string
  gruppo?: string
}

export type Domanda = DomandaMultipla | DomandaCompletamento

export interface Argomento {
  id: string
  titolo: string
  unita: number
  peso: number
}

export interface Materia {
  id: MateriaId
  nome: string
  unita: { numero: number; titolo: string; cfu: number }[]
  argomenti: Argomento[]
}

/** Una domanda dentro una prova: per le multiple l'ordine mescolato delle opzioni. */
export interface DomandaInProva {
  id: string
  ordine?: number[]
}

export type Risposta = number | string | null

export interface Sezione {
  materia: MateriaId
  domande: DomandaInProva[]
  risposte: Record<string, Risposta>
  dubbi: string[]
  /** timestamp ms di fine sezione, null finché non è iniziata */
  scadenza: number | null
  consegnata: boolean
}

export type Modalita = 'completa' | 'materia' | 'ripasso'

export interface Prova {
  id: string
  modalita: Modalita
  creata: number
  sezioni: Sezione[]
  corrente: number
  conclusa: boolean
}

export type Esito = 'corretta' | 'errata' | 'omessa'

export interface EsitoDomanda {
  id: string
  argomento: string
  tipo: Domanda['tipo']
  esito: Esito
}

export interface RisultatoSezione {
  materia: MateriaId
  punti: number
  corrette: number
  errate: number
  omesse: number
  dettaglio: EsitoDomanda[]
}

export interface Risultato {
  id: string
  modalita: Modalita
  data: number
  sezioni: RisultatoSezione[]
}
