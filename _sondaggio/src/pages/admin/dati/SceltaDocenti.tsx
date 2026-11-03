import { useState } from 'react'
import { Avviso, Campo, Input, Pulsante, Select } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type DocenteBreve = { id: string; nome: string; cognome: string }
// Un docente scelto per una materia in creazione: già in elenco (con id) oppure da creare
export type DocenteScelto = { id: string | null; nome: string; cognome: string }

const chiave = (d: { nome: string; cognome: string }) =>
  `${d.cognome} ${d.nome}`.trim().toLowerCase()

// Sezione «Docenti» dei moduli che creano una materia: scelta tra quelli in elenco o inserimento di nuovi.
// `concludi` aggiunge anche ciò che è scritto nei campi ma non ancora aggiunto, e dà l'elenco finale.
export function useSceltaDocenti() {
  const docenti = useElenco<DocenteBreve>(
    () =>
      supabase
        .from('docenti')
        .select('id, nome, cognome')
        .eq('attivo', true)
        .order('cognome')
        .order('nome'),
    'docenti-attivi',
  )
  const [scelti, setScelti] = useState<DocenteScelto[]>([])
  const [cognome, setCognome] = useState('')
  const [nome, setNome] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  function aggiungiEsistente(id: string) {
    const d = (docenti.righe ?? []).find((x) => x.id === id)
    if (d && !scelti.some((s) => chiave(s) === chiave(d))) setScelti([...scelti, d])
  }

  function concludi(): { scelti: DocenteScelto[] } | { errore: string } {
    const c = cognome.trim()
    const n = nome.trim()
    if (!c && !n) return { scelti }
    if (!c || !n) {
      const errore = 'Per aggiungere un docente servono cognome e nome.'
      setErrore(errore)
      return { errore }
    }
    setErrore(null)
    const esistente = (docenti.righe ?? []).find((d) => chiave(d) === chiave({ cognome: c, nome: n }))
    const voce: DocenteScelto = esistente ?? { id: null, cognome: c, nome: n }
    const nuovi = scelti.some((s) => chiave(s) === chiave(voce)) ? scelti : [...scelti, voce]
    setScelti(nuovi)
    setCognome('')
    setNome('')
    return { scelti: nuovi }
  }

  function azzera() {
    setScelti([])
    setCognome('')
    setNome('')
    setErrore(null)
    docenti.ricarica()
  }

  const disponibili = (docenti.righe ?? []).filter((d) => !scelti.some((s) => chiave(s) === chiave(d)))

  const campo = (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-1 text-sm font-medium">Docenti (facoltativo)</legend>

      {scelti.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {scelti.map((s) => (
            <li
              key={chiave(s)}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white py-1 pr-1 pl-3 text-sm"
            >
              {s.cognome} {s.nome}
              {!s.id && <span className="text-xs text-slate-500">nuovo</span>}
              <button
                type="button"
                aria-label={`Togli ${s.cognome} ${s.nome}`}
                onClick={() => setScelti(scelti.filter((x) => chiave(x) !== chiave(s)))}
                className="rounded-full px-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <Select
        aria-label="Docente già in elenco"
        value=""
        onChange={(e) => aggiungiEsistente(e.target.value)}
      >
        <option value="">Scegli un docente già in elenco…</option>
        {disponibili.map((d) => (
          <option key={d.id} value={d.id}>
            {d.cognome} {d.nome}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Campo etichetta="Oppure nuovo: cognome">
          <Input value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </Campo>
        <Campo etichetta="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Pulsante onClick={() => void concludi()}>Aggiungi</Pulsante>
      </div>
      {errore && <Avviso>{errore}</Avviso>}
    </fieldset>
  )

  return { campo, concludi, azzera }
}

// Crea i docenti nuovi e li collega alla materia. Restituisce un messaggio se qualcosa non è riuscito.
export async function collegaDocenti(
  materiaId: string,
  scelti: DocenteScelto[],
): Promise<string | undefined> {
  const idDocenti = scelti.filter((d) => d.id).map((d) => d.id as string)
  const daCreare = scelti.filter((d) => !d.id)
  let problema: string | undefined
  if (daCreare.length > 0) {
    const nuovi = await supabase
      .from('docenti')
      .insert(daCreare.map((d) => ({ cognome: d.cognome, nome: d.nome })))
      .select('id')
    if (nuovi.error) problema = `i docenti nuovi non sono stati creati: ${messaggioErrore(nuovi.error)}`
    else idDocenti.push(...nuovi.data.map((d) => d.id))
  }
  if (idDocenti.length > 0) {
    const { error } = await supabase
      .from('insegnamenti')
      .insert(idDocenti.map((docente_id) => ({ materia_id: materiaId, docente_id })))
    if (error) problema = `i docenti non sono stati collegati: ${messaggioErrore(error)}`
  }
  return problema
}
