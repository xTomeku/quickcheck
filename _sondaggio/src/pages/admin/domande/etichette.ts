import type { Tables } from '../../../lib/database.types'

// Ordine in cui lo studente vede le categorie
export const CATEGORIE = [
  { id: 'generica', nome: 'Generica' },
  { id: 'specifica_materia', nome: 'Specifica per materia' },
  { id: 'generica_docente', nome: 'Generica sui docenti' },
  { id: 'specifica_docente', nome: 'Specifica per docente' },
  { id: 'extra', nome: 'Extra (una volta sola, alla fine)' },
] as const

export const NOME_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIE.map((c) => [c.id, c.nome]),
)

export const NOME_TIPO: Record<string, string> = {
  scala: 'Scala numerica',
  scelta_singola: 'Scelta singola',
  testo: 'Risposta scritta',
}

export const NOME_AMBITO: Record<string, string> = {
  docente: 'Solo docente (compare in ogni materia in cui insegna)',
  insegnamento: 'Docente in una materia (compare solo in quella coppia)',
}

export type DomandaElenco = Tables<'domande'> & {
  collegamenti_domanda: { count: number }[]
  risposte: { count: number }[]
  risposte_extra: { count: number }[]
}

// Risposte già raccolte per una domanda, sia per materia sia Extra
export const nRisposteDi = (d: Pick<DomandaElenco, 'risposte' | 'risposte_extra'>) =>
  (d.risposte[0]?.count ?? 0) + (d.risposte_extra[0]?.count ?? 0)
