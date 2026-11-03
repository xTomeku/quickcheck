import type { Ruolo } from './auth'

export type Sezione = {
  percorso: string
  nome: string
  descrizione: string
  ruoli: Ruolo[]
}

// Sezioni del pannello admin e ruoli che le vedono (vedi la mappa del pannello)
export const SEZIONI: Sezione[] = [
  {
    percorso: 'dati',
    nome: 'Dati accademici',
    descrizione: 'Corsi di laurea con le loro materie per anno, elenco materie e docenti.',
    ruoli: ['admin', 'editor'],
  },
  {
    percorso: 'domande',
    nome: 'Domande',
    descrizione: 'Elenco con filtri ed editor con anteprima.',
    ruoli: ['admin', 'editor'],
  },
  {
    percorso: 'edizioni',
    nome: 'Edizioni',
    descrizione: 'Creazione, apertura e chiusura dei cicli di compilazione.',
    ruoli: ['admin'],
  },
  {
    percorso: 'statistiche',
    nome: 'Statistiche',
    descrizione: 'Riepilogo e analisi con filtri a cascata.',
    ruoli: ['admin', 'editor', 'lettura'],
  },
  {
    percorso: 'import',
    nome: 'Import da file',
    descrizione: 'Modelli CSV scaricabili, anteprima con errori e caricamento.',
    ruoli: ['admin', 'editor'],
  },
  {
    percorso: 'impostazioni',
    nome: 'Impostazioni e utenti',
    descrizione: 'Limiti delle opzioni di risposta, utenti del pannello e ruoli.',
    ruoli: ['admin'],
  },
]
