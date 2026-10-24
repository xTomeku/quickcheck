import albero from '../data/argomenti.json'
import type { Domanda, Materia, MateriaId } from '../types'

export const FORMATO = {
  domande: 31,
  multipla: 21,
  completamento: 10,
  minutiPerSezione: 50,
  punteggio: { corretta: 1, errata: -0.1, omessa: 0 },
} as const

/** Il ripasso è una prova corta, concentrata sugli argomenti in cui si sbaglia di più. */
export const RIPASSO = { multipla: 5, completamento: 5 } as const

/** Di quanto viene moltiplicato il peso di un argomento debole nell'estrazione di un ripasso. */
export const RINFORZO_RIPASSO = 6

/** Minuti proporzionali alle domande: 50 per una sezione intera, meno per un ripasso. */
export function minutiSezione(domande: number): number {
  return Math.max(1, Math.round((domande / FORMATO.domande) * FORMATO.minutiPerSezione))
}

export const ORDINE_MATERIE: MateriaId[] = ['biologia', 'chimica', 'fisica']

export const MATERIE: Record<MateriaId, Materia> = Object.fromEntries(
  (albero.materie as Materia[]).map((m) => [m.id, m]),
) as Record<MateriaId, Materia>

export const NOMI_BREVI: Record<MateriaId, string> = {
  biologia: 'Biologia',
  chimica: 'Chimica',
  fisica: 'Fisica',
}

const argomentiPerId = new Map(
  Object.values(MATERIE).flatMap((m) => m.argomenti.map((a) => [a.id, a] as const)),
)

const materiaPerArgomento = new Map(
  Object.values(MATERIE).flatMap((m) => m.argomenti.map((a) => [a.id, m.id] as const)),
)

/** La materia di un codice del syllabus: "bio.4.2" -> "biologia". */
export function materiaDi(argomento: string): MateriaId | undefined {
  return materiaPerArgomento.get(argomento)
}

export interface UnitaSyllabus {
  materia: MateriaId
  numero: number
  titolo: string
}

const unitaPerArgomento = new Map<string, UnitaSyllabus>(
  Object.values(MATERIE).flatMap((m) =>
    m.argomenti.map(
      (a) =>
        [
          a.id,
          { materia: m.id, numero: a.unita, titolo: m.unita.find((u) => u.numero === a.unita)?.titolo ?? `Unità ${a.unita}` },
        ] as const,
    ),
  ),
)

/** L'unità del syllabus che contiene un argomento: "bio.4.2" -> biologia, unità 4. */
export function unitaDi(argomento: string): UnitaSyllabus | undefined {
  return unitaPerArgomento.get(argomento)
}

export function argomento(id: string) {
  return argomentiPerId.get(id)
}

// Le domande stanno in public/domande/<materia>.json e si scaricano solo quando servono:
// per aggiornarle basta sostituire quei file, senza ricompilare l'app.
const cache = new Map<MateriaId, Domanda[]>()

export async function caricaBanca(materia: MateriaId): Promise<Domanda[]> {
  const giaCaricata = cache.get(materia)
  if (giaCaricata) return giaCaricata
  const r = await fetch(`${import.meta.env.BASE_URL}domande/${materia}.json`, { cache: 'no-cache' })
  if (!r.ok) throw new Error(`Domande di ${materia} non disponibili (${r.status})`)
  const json = (await r.json()) as { domande: (Domanda & { stato?: string })[] }
  // entrano in prova solo le domande approvate (o senza stato, per i file scritti a mano)
  const domande = json.domande.filter((d) => d.stato === undefined || d.stato === 'approvata')
  cache.set(materia, domande)
  return domande
}
