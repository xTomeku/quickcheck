import { useState, type FormEvent } from 'react'
import { Avviso, Campo, Input, Pulsante, Select } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type DocenteBreve = { id: string; nome: string; cognome: string }
type Insegnamento = { id: string; docenti: DocenteBreve | null }

// I docenti di una materia: elenco, collegamento e scollegamento
export default function DocentiMateria({
  materiaId,
  onCambiato,
}: {
  materiaId: string
  onCambiato?: () => void
}) {
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
  const insegnamenti = useElenco<Insegnamento>(
    () =>
      supabase.from('insegnamenti').select('id, docenti(id, nome, cognome)').eq('materia_id', materiaId),
    `insegnamenti-${materiaId}`,
  )
  const [docenteId, setDocenteId] = useState('')
  const [avviso, setAvviso] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  function aggiorna() {
    insegnamenti.ricarica()
    onCambiato?.()
  }

  async function collega(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    const { error } = await supabase
      .from('insegnamenti')
      .insert({ materia_id: materiaId, docente_id: docenteId })
    setInvio(false)
    setAvviso(error ? messaggioErrore(error) : null)
    if (!error) setDocenteId('')
    aggiorna()
  }

  async function scollega(i: Insegnamento) {
    const nome = i.docenti ? `${i.docenti.cognome} ${i.docenti.nome}` : 'il docente'
    if (!window.confirm(`Scollegare ${nome} da questa materia?`)) return
    const { error } = await supabase.from('insegnamenti').delete().eq('id', i.id)
    setAvviso(error ? messaggioErrore(error) : null)
    aggiorna()
  }

  const [nuovo, setNuovo] = useState(false)
  const [cognome, setCognome] = useState('')
  const [nome, setNome] = useState('')

  // Un docente che non è ancora in elenco: lo crea e lo collega a questa materia
  async function creaECollega(e: FormEvent) {
    e.preventDefault()
    const c = cognome.trim()
    const n = nome.trim()
    const uguale = (docenti.righe ?? []).find(
      (d) => d.cognome.toLowerCase() === c.toLowerCase() && d.nome.toLowerCase() === n.toLowerCase(),
    )
    if (uguale) {
      setAvviso(`${uguale.cognome} ${uguale.nome} è già in elenco: sceglilo dal menu qui sopra.`)
      return
    }
    setInvio(true)
    const creato = await supabase.from('docenti').insert({ cognome: c, nome: n }).select('id').single()
    if (creato.error) {
      setInvio(false)
      setAvviso(messaggioErrore(creato.error))
      return
    }
    const { error } = await supabase
      .from('insegnamenti')
      .insert({ materia_id: materiaId, docente_id: creato.data.id })
    setInvio(false)
    setAvviso(
      error ? `Docente creato, ma non collegato: ${messaggioErrore(error)}` : null,
    )
    if (!error) {
      setCognome('')
      setNome('')
      setNuovo(false)
    }
    docenti.ricarica()
    aggiorna()
  }

  const righe = insegnamenti.righe ?? []
  const giaCollegati = new Set(righe.map((r) => r.docenti?.id))
  const collegabili = (docenti.righe ?? []).filter((d) => !giaCollegati.has(d.id))

  return (
    <div className="space-y-3">
      {(docenti.errore ?? insegnamenti.errore) && <Avviso>{docenti.errore ?? insegnamenti.errore}</Avviso>}
      {avviso && <Avviso>{avviso}</Avviso>}

      {insegnamenti.righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : righe.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun docente collegato.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {righe.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <p className="flex-1">{i.docenti ? `${i.docenti.cognome} ${i.docenti.nome}` : '?'}</p>
              <Pulsante variante="pericolo" onClick={() => scollega(i)}>
                Scollega
              </Pulsante>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={collega} className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          <Select
            required
            aria-label="Docente da collegare"
            value={docenteId}
            onChange={(e) => setDocenteId(e.target.value)}
          >
            <option value="">Collega un docente…</option>
            {collegabili.map((d) => (
              <option key={d.id} value={d.id}>
                {d.cognome} {d.nome}
              </option>
            ))}
          </Select>
        </div>
        <Pulsante type="submit" variante="primario" disabled={invio || !docenteId}>
          Collega
        </Pulsante>
      </form>

      {nuovo ? (
        <form
          onSubmit={creaECollega}
          className="space-y-3 rounded-lg border border-slate-300 bg-white p-3"
        >
          <p className="text-sm font-medium">Nuovo docente</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Cognome">
              <Input required value={cognome} onChange={(e) => setCognome(e.target.value)} />
            </Campo>
            <Campo etichetta="Nome">
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
          </div>
          <div className="flex gap-2">
            <Pulsante type="submit" variante="primario" disabled={invio}>
              Crea e collega
            </Pulsante>
            <Pulsante variante="testo" onClick={() => setNuovo(false)}>Annulla</Pulsante>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setNuovo(true)}
          className="text-sm text-slate-700 underline"
        >
          Il docente non è in elenco? Aggiungilo
        </button>
      )}
    </div>
  )
}
