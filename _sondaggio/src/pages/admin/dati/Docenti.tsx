import { useState, type FormEvent } from 'react'
import PulsanteElimina from '../../../components/PulsanteElimina'
import {
  ANELLO_APERTO,
  Avviso,
  Azioni,
  Campo,
  Input,
  Pulsante,
  StatoPill,
  TestataSezione,
  useAlApertura,
} from '../../../components/ui'
import type { Tables } from '../../../lib/database.types'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type Docente = Tables<'docenti'> & { insegnamenti: { count: number }[] }

export default function Docenti() {
  const { righe, errore, ricarica } = useElenco<Docente>(
    () =>
      supabase
        .from('docenti')
        .select('*, insegnamenti(count)')
        .order('cognome')
        .order('nome'),
    'docenti',
  )
  const [modifica, setModifica] = useState<Docente | 'nuovo' | null>(null)
  const [cerca, setCerca] = useState('')
  const [avviso, setAvviso] = useState<string | null>(null)

  async function cambiaStato(d: Docente) {
    const n = d.insegnamenti[0]?.count ?? 0
    if (d.attivo && n > 0) {
      const ok = window.confirm(
        `Il docente è collegato a ${n} materie. Disattivandolo non comparirà più agli studenti. Continuare?`,
      )
      if (!ok) return
    }
    const { error } = await supabase.from('docenti').update({ attivo: !d.attivo }).eq('id', d.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  const filtrati = (righe ?? []).filter((d) =>
    `${d.cognome} ${d.nome}`.toLowerCase().includes(cerca.trim().toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <TestataSezione
        titolo="Docenti"
        aiuto="L'anagrafica dei docenti. Per assegnarli a una materia vai in «Materie»."
      >
        <Pulsante variante="primario" onClick={() => setModifica('nuovo')}>
          Nuovo docente
        </Pulsante>
      </TestataSezione>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modifica && (
        <FormDocente
          docente={modifica === 'nuovo' ? null : modifica}
          onAnnulla={() => setModifica(null)}
          onSalvato={() => {
            setModifica(null)
            setAvviso(null)
            ricarica()
          }}
        />
      )}

      <Input
        placeholder="Cerca per nome o cognome"
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
      />

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : filtrati.length === 0 ? (
        <Avviso tipo="info">
          {righe.length === 0 ? 'Nessun docente inserito.' : 'Nessun docente corrisponde alla ricerca.'}
        </Avviso>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {filtrati.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p
                    className={`text-[17px] font-bold ${d.attivo ? '' : 'text-slate-400 line-through'}`}
                  >
                    {d.cognome} {d.nome}
                  </p>
                  <StatoPill attivo={d.attivo} />
                </div>
                <p className="text-sm text-slate-500">{d.insegnamenti[0]?.count ?? 0}{' '}
                  {d.insegnamenti[0]?.count === 1 ? 'materia' : 'materie'}
                </p>
              </div>
              <Azioni>
                <Pulsante onClick={() => setModifica(d)}>Modifica</Pulsante>
                <Pulsante variante={d.attivo ? 'pericolo' : 'secondario'} onClick={() => cambiaStato(d)}>
                  {d.attivo ? 'Disattiva' : 'Riattiva'}
                </Pulsante>
                <PulsanteElimina
                  tipo="docente"
                  id={d.id}
                  nome={`${d.cognome} ${d.nome}`}
                  onEliminata={ricarica}
                  onMessaggio={setAvviso}
                />
              </Azioni>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FormDocente({
  docente,
  onAnnulla,
  onSalvato,
}: {
  docente: Docente | null
  onAnnulla: () => void
  onSalvato: () => void
}) {
  const ref = useAlApertura<HTMLFormElement>()
  const [nome, setNome] = useState(docente?.nome ?? '')
  const [cognome, setCognome] = useState(docente?.cognome ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const valori = { nome: nome.trim(), cognome: cognome.trim() }
    const { error } = docente
      ? await supabase.from('docenti').update(valori).eq('id', docente.id)
      : await supabase.from('docenti').insert(valori)
    setInvio(false)
    if (error) setErrore(messaggioErrore(error))
    else onSalvato()
  }

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={`space-y-4 rounded-xl border border-slate-300 bg-white p-4 ${ANELLO_APERTO}`}
    >
      <h3 className="font-semibold">{docente ? 'Modifica docente' : 'Nuovo docente'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <Campo etichetta="Nome">
          <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo etichetta="Cognome">
          <Input required value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </Campo>
      </div>
      {errore && <Avviso>{errore}</Avviso>}
      <div className="flex gap-2">
        <Pulsante type="submit" variante="primario" disabled={invio}>
          {invio ? 'Salvataggio…' : 'Salva'}
        </Pulsante>
        <Pulsante variante="testo" onClick={onAnnulla}>
          Annulla
        </Pulsante>
      </div>
    </form>
  )
}
