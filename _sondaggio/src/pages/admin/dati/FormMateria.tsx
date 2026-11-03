import { useState, type FormEvent } from 'react'
import { ANELLO_APERTO, Avviso, Campo, Input, Pulsante, useAlApertura } from '../../../components/ui'
import type { Tables } from '../../../lib/database.types'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { collegaDocenti, useSceltaDocenti } from './SceltaDocenti'

export default function FormMateria({
  materia,
  onAnnulla,
  onSalvato,
}: {
  materia: Tables<'materie'> | null
  onAnnulla: () => void
  // `problema` è valorizzato se la materia è stata creata ma i docenti no, del tutto o in parte
  onSalvato: (idNuova?: string, problema?: string) => void
}) {
  const [nome, setNome] = useState(materia?.nome ?? '')
  const [cfu, setCfu] = useState(materia?.cfu != null ? String(materia.cfu) : '')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const ref = useAlApertura<HTMLFormElement>()
  const docenti = useSceltaDocenti()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    const valori = { nome: nome.trim(), cfu: cfu === '' ? null : Number(cfu) }

    if (materia) {
      setInvio(true)
      const { error } = await supabase.from('materie').update(valori).eq('id', materia.id)
      setInvio(false)
      if (error) setErrore(messaggioErrore(error))
      else onSalvato()
      return
    }

    const scelta = docenti.concludi()
    if ('errore' in scelta) return
    setInvio(true)
    const creata = await supabase.from('materie').insert(valori).select('id').single()
    if (creata.error) {
      setInvio(false)
      setErrore(messaggioErrore(creata.error))
      return
    }
    // Da qui in poi un errore non annulla ciò che è già salvato: si segnala e si prosegue dal pannello dei docenti
    const problema = await collegaDocenti(creata.data.id, scelta.scelti)
    setInvio(false)
    onSalvato(creata.data.id, problema && `Materia creata, ma ${problema}`)
  }

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={`space-y-4 rounded-xl border border-slate-300 bg-white p-4 ${ANELLO_APERTO}`}
    >
      <h3 className="font-semibold">{materia ? 'Modifica materia' : 'Nuova materia'}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Campo etichetta="Nome">
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
        </div>
        <Campo etichetta="CFU (facoltativo)">
          <Input type="number" min={1} value={cfu} onChange={(e) => setCfu(e.target.value)} />
        </Campo>
      </div>

      {!materia && docenti.campo}

      {errore && <Avviso>{errore}</Avviso>}
      <div className="flex gap-2">
        <Pulsante type="submit" variante="primario" disabled={invio}>
          {invio ? 'Salvataggio…' : 'Salva'}
        </Pulsante>
        <Pulsante variante="testo" onClick={onAnnulla}>Annulla</Pulsante>
      </div>
    </form>
  )
}
