import { useState, type FormEvent } from 'react'
import AvvisoDocenteEsistente from '../../../components/AvvisoDocenteEsistente'
import ComboRicerca from '../../../components/ComboRicerca'
import { Avviso, Campo, Input, Pulsante } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { trovaUguale } from '../../../lib/nomi'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type DocenteBreve = { id: string; nome: string; cognome: string }
type DocenteElenco = DocenteBreve & { attivo: boolean }
type Insegnamento = { id: string; docenti: DocenteBreve | null }

// I docenti di una materia: elenco, collegamento e scollegamento
export default function DocentiMateria({
  materiaId,
  onCambiato,
}: {
  materiaId: string
  onCambiato?: () => void
}) {
  // Tutti i docenti, anche i disattivati: servono a riconoscere un nome già in memoria
  const docenti = useElenco<DocenteElenco>(
    () =>
      supabase
        .from('docenti')
        .select('id, nome, cognome, attivo')
        .order('cognome')
        .order('nome'),
    'docenti-tutti',
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

  // Il nome scritto coincide con un docente già in memoria: si aspetta la scelta di chi compila
  const [simile, setSimile] = useState<DocenteElenco | null>(null)

  // Collega a questa materia un docente che c'è già
  async function collegaEsistente(d: DocenteElenco) {
    setSimile(null)
    if (giaCollegati.has(d.id)) {
      setAvviso(`${d.cognome} ${d.nome} è già collegato a questa materia.`)
      return
    }
    setInvio(true)
    const { error } = await supabase
      .from('insegnamenti')
      .insert({ materia_id: materiaId, docente_id: d.id })
    setInvio(false)
    setAvviso(error ? messaggioErrore(error) : null)
    if (!error) {
      setCognome('')
      setNome('')
      setNuovo(false)
    }
    aggiorna()
  }

  // Un docente che non è ancora in elenco: lo crea e lo collega a questa materia.
  // Se il nome esiste già chiede prima cosa fare (`forza` = «aggiungi comunque come nuovo»).
  async function creaECollega(forza: boolean) {
    const c = cognome.trim()
    const n = nome.trim()
    if (!forza) {
      const uguale = trovaUguale(docenti.righe ?? [], { cognome: c, nome: n })
      if (uguale) {
        setAvviso(null)
        setSimile(uguale)
        return
      }
    }
    setSimile(null)
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
  const collegabili = (docenti.righe ?? []).filter((d) => d.attivo && !giaCollegati.has(d.id))

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
          <ComboRicerca
            ariaLabel="Docente da collegare"
            segnaposto="Cerca o scegli un docente da collegare…"
            valore={docenteId}
            voci={collegabili.map((d) => ({ id: d.id, etichetta: `${d.cognome} ${d.nome}` }))}
            onScegli={setDocenteId}
          />
        </div>
        <Pulsante type="submit" variante="primario" disabled={invio || !docenteId}>
          Collega
        </Pulsante>
      </form>

      {nuovo ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void creaECollega(false)
          }}
          className="space-y-3 rounded-lg border border-slate-300 bg-white p-3"
        >
          <p className="text-sm font-medium">Nuovo docente</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Cognome">
              <Input
                required
                value={cognome}
                onChange={(e) => {
                  setCognome(e.target.value)
                  setSimile(null)
                }}
              />
            </Campo>
            <Campo etichetta="Nome">
              <Input
                required
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  setSimile(null)
                }}
              />
            </Campo>
          </div>
          {simile && (
            <AvvisoDocenteEsistente
              docente={simile}
              onUsaEsistente={() => void collegaEsistente(simile)}
              onAggiungiComunque={() => void creaECollega(true)}
              onAnnulla={() => setSimile(null)}
            />
          )}
          <div className="flex gap-2">
            <Pulsante type="submit" variante="primario" disabled={invio || simile !== null}>
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
