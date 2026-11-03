import type { Agg, RigaStat } from '../../../lib/statistiche'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import { argomenti, type Filtri } from './filtri'

export type EdizioneRif = { id: string; nome: string; aperta: boolean; created_at: string }
export type CorsoRif = { id: string; nome: string; durata_anni: number }
export type MateriaRif = { id: string; nome: string }
export type MateriaCorsoRif = { id: string; materia_id: string; corso_id: string; anno: number }
export type DocenteRif = { id: string; nome: string; cognome: string }
export type InsegnamentoRif = { materia_id: string; docente_id: string }
export type DomandaRif = {
  id: string
  testo: string
  categoria: string
  tipo_risposta: string
  scala_min: number | null
  scala_max: number | null
  ordine: number
  opzioni_risposta: { id: string; testo: string; ordine: number }[]
}

// Le voci del grafico: i valori della scala oppure le opzioni, con quante risposte ha ricevuto ciascuna
export function voci(domanda: DomandaRif, agg: Agg | undefined) {
  if (domanda.tipo_risposta === 'scala') {
    const min = domanda.scala_min ?? 1
    const max = domanda.scala_max ?? 5
    return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => {
      const valore = String(min + i)
      return { etichetta: valore, conteggio: agg?.distribuzione[valore] ?? 0 }
    })
  }
  return [...domanda.opzioni_risposta]
    .sort((a, b) => a.ordine - b.ordine)
    .map((o) => ({ etichetta: o.testo, conteggio: agg?.distribuzione[o.id] ?? 0 }))
}

// Elenchi usati per i filtri e per dare un nome a ciò che torna dal database
export function useRiferimenti() {
  const edizioni = useElenco<EdizioneRif>(
    () =>
      supabase
        .from('edizioni')
        .select('id, nome, aperta, created_at')
        .order('created_at', { ascending: false }),
    'rif-edizioni',
  )
  const corsi = useElenco<CorsoRif>(
    () => supabase.from('corsi_di_laurea').select('id, nome, durata_anni').order('nome'),
    'rif-corsi',
  )
  const materie = useElenco<MateriaRif>(
    () => supabase.from('materie').select('id, nome').order('nome'),
    'rif-materie',
  )
  const materieCorso = useElenco<MateriaCorsoRif>(
    () => supabase.from('materie_corso').select('id, materia_id, corso_id, anno'),
    'rif-materie-corso',
  )
  const docenti = useElenco<DocenteRif>(
    () => supabase.from('docenti').select('id, nome, cognome').order('cognome').order('nome'),
    'rif-docenti',
  )
  const insegnamenti = useElenco<InsegnamentoRif>(
    () => supabase.from('insegnamenti').select('materia_id, docente_id'),
    'rif-insegnamenti',
  )
  const domande = useElenco<DomandaRif>(
    () =>
      supabase
        .from('domande')
        .select('id, testo, categoria, tipo_risposta, scala_min, scala_max, ordine, opzioni_risposta(id, testo, ordine)')
        .order('ordine'),
    'rif-domande',
  )

  const tutti = [edizioni, corsi, materie, materieCorso, docenti, insegnamenti, domande]
  const pronto = tutti.every((x) => x.righe !== null)
  return {
    pronto,
    errore: tutti.find((x) => x.errore)?.errore ?? null,
    edizioni: edizioni.righe ?? [],
    corsi: corsi.righe ?? [],
    materie: materie.righe ?? [],
    materieCorso: materieCorso.righe ?? [],
    docenti: docenti.righe ?? [],
    insegnamenti: insegnamenti.righe ?? [],
    domande: domande.righe ?? [],
  }
}

export type Gruppo = 'domanda' | 'domanda_materia' | 'domanda_docente'

export function useStatRisposte(f: Filtri, gruppo: Gruppo, attivo: boolean) {
  const args = argomenti(f)
  return useElenco<RigaStat>(async () => {
    if (!attivo || !f.edizione) return { data: [], error: null }
    return await supabase.rpc('stat_risposte', { ...args, p_gruppo: gruppo })
  }, JSON.stringify(['risposte', gruppo, args, attivo]))
}

export function useStatSaltati(f: Filtri, attivo: boolean) {
  const args = argomenti(f)
  return useElenco<{ docente_id: string; materia_id: string; n: number }>(async () => {
    if (!attivo || !f.edizione) return { data: [], error: null }
    return await supabase.rpc('stat_saltati', args)
  }, JSON.stringify(['saltati', args, attivo]))
}

export function useStatCompilazioni(f: Filtri) {
  const { p_docente: _docente, ...args } = argomenti(f)
  return useElenco<{ materia_id: string; corso_id: string; anno: number; n: number }>(async () => {
    if (!f.edizione) return { data: [], error: null }
    return await supabase.rpc('stat_compilazioni', args)
  }, JSON.stringify(['compilazioni', args]))
}
