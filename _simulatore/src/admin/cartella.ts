import type { MateriaId } from '../types'
import { ORDINE_MATERIE } from '../lib/dati'
import type { DomandaArchivio, FileMateria } from './modello'

// La File System Access API non è ancora nei tipi standard di TypeScript: qui il minimo che serve.
interface ManicoFile {
  getFile(): Promise<File>
  createWritable(): Promise<{ write(dati: string): Promise<void>; close(): Promise<void> }>
}

export interface ManicoCartella {
  name: string
  getFileHandle(nome: string, opzioni?: { create?: boolean }): Promise<ManicoFile>
  queryPermission?(d: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(d: { mode: 'readwrite' }): Promise<PermissionState>
}

declare global {
  interface Window {
    showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<ManicoCartella>
  }
}

/** Solo Chrome ed Edge sanno aprire una cartella dalla pagina. */
export const supportata = () => typeof window.showDirectoryPicker === 'function'

export async function scegliCartella(): Promise<ManicoCartella> {
  if (!window.showDirectoryPicker) throw new Error('Questo browser non sa aprire una cartella: serve Chrome o Edge.')
  return window.showDirectoryPicker({ mode: 'readwrite', id: 'domande-simulatore' })
}

async function conPermesso(c: ManicoCartella) {
  const ora = (await c.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'
  if (ora === 'granted') return
  const dopo = (await c.requestPermission?.({ mode: 'readwrite' })) ?? 'denied'
  if (dopo !== 'granted') throw new Error('Senza il permesso di scrittura non posso salvare le domande.')
}

async function leggiUno(c: ManicoCartella, materia: MateriaId): Promise<FileMateria> {
  let testo: string
  try {
    testo = await (await (await c.getFileHandle(`${materia}.json`)).getFile()).text()
  } catch {
    // il file può non esserci ancora: si crea al primo salvataggio
    return { materia, domande: [] }
  }
  let json: Partial<FileMateria>
  try {
    json = JSON.parse(testo) as Partial<FileMateria>
  } catch {
    throw new Error(`${materia}.json non è un JSON valido.`)
  }
  if (!Array.isArray(json.domande)) throw new Error(`${materia}.json: manca il campo "domande".`)
  return { ...json, materia, domande: json.domande as DomandaArchivio[] }
}

/** Legge i tre file della cartella. Quelli che mancano contano come banca vuota. */
export async function leggiCartella(c: ManicoCartella): Promise<Record<MateriaId, FileMateria>> {
  await conPermesso(c)
  const letti = await Promise.all(ORDINE_MATERIE.map(async (m) => [m, await leggiUno(c, m)] as const))
  return Object.fromEntries(letti) as Record<MateriaId, FileMateria>
}

/**
 * Riscrive il file di una materia. Rientra anche quello che c'era già oltre alle domande
 * (la nota in cima), e l'indentazione resta quella dei file scritti a mano.
 */
export async function scriviFile(c: ManicoCartella, file: FileMateria): Promise<void> {
  await conPermesso(c)
  const manico = await c.getFileHandle(`${file.materia}.json`, { create: true })
  const scrittura = await manico.createWritable()
  await scrittura.write(JSON.stringify(file, null, 1) + '\n')
  await scrittura.close()
}
