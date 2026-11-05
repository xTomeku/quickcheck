import { useState } from 'react'
import AvvisoDocenteEsistente from '../../../components/AvvisoDocenteEsistente'
import ComboRicerca from '../../../components/ComboRicerca'
import { Avviso, Campo, Input, Pulsante } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { chiaveNome, trovaUguale } from '../../../lib/nomi'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type DocenteBreve = { id: string; nome: string; cognome: string; attivo: boolean }
// Un docente scelto per una materia in creazione: già in elenco (con id) oppure da creare
export type DocenteScelto = { id: string | null; nome: string; cognome: string }

// Chi è già nella lista dei scelti: i docenti in elenco per id, quelli nuovi per nome
const idVoce = (d: DocenteScelto) => d.id ?? `nuovo:${chiaveNome(d)}`

// Sezione «Docenti» dei moduli che creano una materia: scelta tra quelli in elenco o inserimento di nuovi.
// `concludi` aggiunge anche ciò che è scritto nei campi ma non ancora aggiunto, e dà l'elenco finale.
export function useSceltaDocenti() {
  // Tutti i docenti, anche i disattivati: servono a riconoscere un nome già in memoria
  const docenti = useElenco<DocenteBreve>(
    () =>
      supabase
        .from('docenti')
        .select('id, nome, cognome, attivo')
        .order('cognome')
        .order('nome'),
    'docenti-tutti',
  )
  const [scelti, setScelti] = useState<DocenteScelto[]>([])
  const [cognome, setCognome] = useState('')
  const [nome, setNome] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  // Il nome scritto coincide con un docente già in memoria: si aspetta che chi compila scelga cosa fare
  const [simile, setSimile] = useState<DocenteBreve | null>(null)

  function pulisciCampi() {
    setCognome('')
    setNome('')
    setSimile(null)
    setErrore(null)
  }

  function aggiungi(voce: DocenteScelto) {
    if (!scelti.some((s) => idVoce(s) === idVoce(voce))) setScelti([...scelti, voce])
    pulisciCampi()
  }

  function aggiungiEsistente(id: string) {
    const d = (docenti.righe ?? []).find((x) => x.id === id)
    if (d && !scelti.some((s) => s.id === d.id)) setScelti([...scelti, d])
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
    const esistente = trovaUguale(docenti.righe ?? [], { cognome: c, nome: n })
    if (esistente) {
      // Non si decide al posto di chi compila: si mostra l'avviso e si interrompe
      setSimile(esistente)
      const errore = 'Esiste già un docente con questo nome: scegli se usarlo o aggiungerne uno nuovo.'
      setErrore(errore)
      return { errore }
    }
    setErrore(null)
    const voce: DocenteScelto = { id: null, cognome: c, nome: n }
    const nuovi = scelti.some((s) => idVoce(s) === idVoce(voce)) ? scelti : [...scelti, voce]
    setScelti(nuovi)
    pulisciCampi()
    return { scelti: nuovi }
  }

  function azzera() {
    setScelti([])
    pulisciCampi()
    docenti.ricarica()
  }

  const disponibili = (docenti.righe ?? []).filter(
    (d) => d.attivo && !scelti.some((s) => s.id === d.id),
  )

  const campo = (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-1 text-sm font-medium">Docenti (facoltativo)</legend>

      {scelti.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {scelti.map((s) => (
            <li
              key={idVoce(s)}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white py-1 pr-1 pl-3 text-sm"
            >
              {s.cognome} {s.nome}
              {!s.id && <span className="text-xs text-slate-500">nuovo</span>}
              <button
                type="button"
                aria-label={`Togli ${s.cognome} ${s.nome}`}
                onClick={() => setScelti(scelti.filter((x) => idVoce(x) !== idVoce(s)))}
                className="rounded-full px-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <ComboRicerca
        ariaLabel="Docente già in elenco"
        segnaposto="Cerca o scegli un docente già in elenco…"
        valore=""
        voci={disponibili.map((d) => ({ id: d.id, etichetta: `${d.cognome} ${d.nome}` }))}
        onScegli={aggiungiEsistente}
      />

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Campo etichetta="Oppure nuovo: cognome">
          <Input
            value={cognome}
            onChange={(e) => {
              setCognome(e.target.value)
              setSimile(null)
            }}
          />
        </Campo>
        <Campo etichetta="Nome">
          <Input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setSimile(null)
            }}
          />
        </Campo>
        <Pulsante onClick={() => void concludi()}>Aggiungi</Pulsante>
      </div>
      {simile ? (
        <AvvisoDocenteEsistente
          docente={simile}
          onUsaEsistente={() => aggiungi(simile)}
          onAggiungiComunque={() => aggiungi({ id: null, cognome: cognome.trim(), nome: nome.trim() })}
          onAnnulla={pulisciCampi}
        />
      ) : (
        errore && <Avviso>{errore}</Avviso>
      )}
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
