import type { Domanda, MateriaId } from '../types'
import { argomento, materiaDi } from '../lib/dati'

export type Stato = 'bozza' | 'approvata' | 'scartata'

/** Una domanda come sta nel file: il formato della banca più lo stato della revisione. */
export type DomandaArchivio = Domanda & { stato?: Stato; fonte?: string; aggiornata?: number }

/**
 * La domanda mentre la si modifica. I campi sono tutti facoltativi perché passando da multipla
 * a completamento restano in giro quelli dell'altro tipo: `perFile` tiene solo quelli giusti.
 */
export interface Bozza {
  id: string
  argomento: string
  tipo: 'multipla' | 'completamento'
  testo: string
  opzioni?: string[]
  corretta?: number
  accettate?: string[]
  numero?: { valore: number; tolleranza: number }
  unita?: string
  spiegazione?: string
  gruppo?: string
  stato?: Stato
  fonte?: string
  aggiornata?: number
}

/** Il file di una materia: oltre alle domande tiene i campi che c'erano già, come la nota. */
export interface FileMateria {
  materia: MateriaId
  nota?: string
  domande: DomandaArchivio[]
}

/** I file scritti a mano non hanno lo stato: valgono come approvate, come in `caricaBanca`. */
export const statoDi = (d: Bozza): Stato => d.stato ?? 'approvata'

export const ETICHETTE_STATO: Record<Stato, string> = { bozza: 'Bozza', approvata: 'Approvata', scartata: 'Scartata' }

const PREFISSO: Record<MateriaId, string> = { biologia: 'bio', chimica: 'chim', fisica: 'fis' }

export function nuovoId(materia: MateriaId) {
  return `${PREFISSO[materia]}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`
}

/** Problemi che impedirebbero alla domanda di funzionare in una prova. */
export function problemi(d: Bozza, materia?: MateriaId): string[] {
  const p: string[] = []
  if (!argomento(d.argomento)) p.push('argomento non presente nel syllabus')
  else if (materia && materiaDi(d.argomento) !== materia) p.push('argomento di un’altra materia')
  if (!d.testo?.trim()) p.push('testo vuoto')
  if (d.tipo === 'multipla') {
    const op = d.opzioni ?? []
    if (op.length !== 5 || op.some((o) => !o?.trim())) p.push('servono 5 opzioni non vuote')
    if (typeof d.corretta !== 'number' || d.corretta < 0 || d.corretta >= op.length) p.push('risposta corretta non indicata')
    if (new Set(op.map((o) => o.trim().toLowerCase())).size !== op.length) p.push('opzioni ripetute')
  } else {
    if (!(d.accettate ?? []).some((a) => a.trim()) && !d.numero) p.push('nessuna risposta accettata')
    if (d.testo && !/…|\.{4,}/.test(d.testo)) p.push('nel testo manca lo spazio da completare (……)')
    // A completamento si risponde con una parola: se ne servono due, lo spazio è nel posto
    // sbagliato e la frase va riscritta ("dipendente da ……", non "segnalazione ……").
    // Vale sulla prima accettata, che è quella mostrata in correzione; le altre restano libere.
    const mostrata = (d.accettate ?? []).find((a) => a.trim())?.trim()
    if (mostrata && !d.numero && mostrata.split(/\s+/).length > 1) p.push('la risposta è più di una parola')
  }
  return p
}

/** Tiene solo i campi del tipo giusto e butta quelli vuoti, così i file restano puliti. */
export function perFile(b: Bozza): DomandaArchivio {
  const comune = {
    id: b.id,
    argomento: b.argomento,
    stato: statoDi(b),
    testo: b.testo.trim(),
    ...(b.spiegazione?.trim() ? { spiegazione: b.spiegazione.trim() } : {}),
    ...(b.gruppo?.trim() ? { gruppo: b.gruppo.trim() } : {}),
    ...(b.fonte ? { fonte: b.fonte } : {}),
    aggiornata: Date.now(),
  }
  if (b.tipo === 'multipla') {
    return { ...comune, tipo: 'multipla', opzioni: (b.opzioni ?? []).map((o) => o.trim()), corretta: b.corretta ?? 0 }
  }
  return {
    ...comune,
    tipo: 'completamento',
    accettate: (b.accettate ?? []).map((a) => a.trim()).filter(Boolean),
    ...(b.numero ? { numero: b.numero } : {}),
    ...(b.unita?.trim() ? { unita: b.unita.trim() } : {}),
  }
}

export interface Importata {
  materia: MateriaId
  domanda: DomandaArchivio
}

/**
 * Legge un lotto da importare: accetta `{ domande: [...] }` o direttamente un array, nel formato
 * della banca. La materia si ricava dal campo `materia` o dal codice dell'argomento.
 * Quello che non è a posto entra come bozza, così si rivede nel pannello invece di sparire.
 */
export function leggiImport(testo: string): { importate: Importata[]; errori: string[] } {
  let json: unknown
  try {
    json = JSON.parse(testo)
  } catch {
    return { importate: [], errori: ['Il file non è un JSON valido.'] }
  }
  const lista = Array.isArray(json) ? json : (json as { domande?: unknown })?.domande
  if (!Array.isArray(lista)) {
    return { importate: [], errori: ['Serve un array di domande, oppure un oggetto con il campo "domande".'] }
  }
  const importate: Importata[] = []
  const errori: string[] = []
  lista.forEach((grezza, i) => {
    const q = grezza as Record<string, unknown>
    const arg = String(q.argomento ?? '')
    const materia = ((q.materia as MateriaId) ?? materiaDi(arg)) as MateriaId | undefined
    if (!materia || !PREFISSO[materia]) {
      errori.push(`Domanda ${i + 1}: non capisco di che materia è (manca "materia" e l'argomento "${arg}" non è nel syllabus).`)
      return
    }
    const tipo = q.tipo === 'completamento' ? 'completamento' : 'multipla'
    const b: Bozza = {
      id: typeof q.id === 'string' && /^[\w-]{3,40}$/.test(q.id) ? q.id : nuovoId(materia),
      argomento: arg,
      tipo,
      testo: String(q.testo ?? '').trim(),
      stato: q.stato === 'approvata' || q.stato === 'scartata' ? q.stato : 'bozza',
      fonte: typeof q.fonte === 'string' ? q.fonte : 'import',
      spiegazione: typeof q.spiegazione === 'string' ? q.spiegazione : undefined,
      gruppo: typeof q.gruppo === 'string' ? q.gruppo : undefined,
    }
    if (tipo === 'multipla') {
      b.opzioni = Array.isArray(q.opzioni) ? q.opzioni.map((o) => String(o)) : []
      b.corretta = typeof q.corretta === 'number' ? q.corretta : -1
    } else {
      b.accettate = Array.isArray(q.accettate) ? q.accettate.map((a) => String(a)) : []
      const n = q.numero as { valore?: unknown; tolleranza?: unknown } | undefined
      if (n && typeof n.valore === 'number') {
        b.numero = { valore: n.valore, tolleranza: typeof n.tolleranza === 'number' ? n.tolleranza : 0 }
      }
      if (typeof q.unita === 'string' && q.unita.trim()) b.unita = q.unita.trim()
    }
    const pr = problemi(b, materia)
    if (pr.length) {
      errori.push(`Domanda ${i + 1} (${b.id}): ${pr.join(', ')}. Entra come bozza.`)
      b.stato = 'bozza'
    }
    importate.push({ materia, domanda: perFile(b) })
  })
  return { importate, errori }
}
