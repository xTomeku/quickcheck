import { useMemo } from 'react'
import type { Tables } from './database.types'
import type { DomandaCompleta, MateriaDati } from './sondaggio'
import { supabase } from './supabase'
import { useElenco } from './useElenco'

type RigaDomanda = Tables<'domande'> & {
  opzioni_risposta: { id: string; testo: string; ordine: number }[]
  collegamenti_domanda: {
    materia_id: string | null
    docente_id: string | null
    insegnamento_id: string | null
  }[]
}

type RigaMateriaCorso = {
  id: string
  anno: number
  materie: {
    id: string
    nome: string
    cfu: number | null
    attiva: boolean
    insegnamenti: {
      id: string
      docenti: { id: string; nome: string; cognome: string; attivo: boolean } | null
    }[]
  } | null
}

// Domande attive, con opzioni e collegamenti
export function useDomandeAttive() {
  const { righe, errore } = useElenco<RigaDomanda>(
    () =>
      supabase
        .from('domande')
        .select(
          '*, opzioni_risposta(id, testo, ordine), collegamenti_domanda(materia_id, docente_id, insegnamento_id)',
        )
        .eq('attiva', true),
    'domande-attive',
  )
  const domande: DomandaCompleta[] | null = useMemo(
    () =>
      righe === null
        ? null
        : righe.map((d) => ({
            ...d,
            opzioni_risposta: [...d.opzioni_risposta].sort((a, b) => a.ordine - b.ordine),
          })),
    [righe],
  )
  return { domande, errore }
}

// Materie di un corso, oppure le materie con gli id indicati (mantenendo l'ordine degli id)
export function useMaterieCorso(filtro: { corsoId: string } | { ids: string[] }) {
  const chiave = 'corsoId' in filtro ? `c:${filtro.corsoId}` : `i:${filtro.ids.join(',')}`
  const { righe, errore } = useElenco<RigaMateriaCorso>(async () => {
    const base = supabase
      .from('materie_corso')
      .select(
        'id, anno, materie(id, nome, cfu, attiva, insegnamenti(id, docenti(id, nome, cognome, attivo)))',
      )
    if ('corsoId' in filtro) return await base.eq('corso_id', filtro.corsoId)
    if (filtro.ids.length === 0) return { data: [], error: null }
    return await base.in('id', filtro.ids)
  }, chiave)

  const materie: MateriaDati[] | null = useMemo(() => {
    if (righe === null) return null
    const ids = 'ids' in filtro ? filtro.ids : []
    return righe
      .flatMap((r) => {
        const m = r.materie
        if (!m || !m.attiva) return []
        const materia: MateriaDati = {
          materiaCorsoId: r.id,
          materiaId: m.id,
          nome: m.nome,
          cfu: m.cfu,
          anno: r.anno,
          insegnamenti: m.insegnamenti.flatMap((i) =>
            i.docenti && i.docenti.attivo
              ? [{ id: i.id, docente: { id: i.docenti.id, nome: i.docenti.nome, cognome: i.docenti.cognome } }]
              : [],
          ),
        }
        return [materia]
      })
      .sort((a, b) =>
        ids.length > 0
          ? ids.indexOf(a.materiaCorsoId) - ids.indexOf(b.materiaCorsoId)
          : a.anno - b.anno || a.nome.localeCompare(b.nome),
      )
    // `filtro` cambia identità a ogni render: la chiave descrive già i suoi valori
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [righe, chiave])

  return { materie, errore }
}
