import { useState, type FormEvent } from 'react'
import { Avviso, Campo, Input, Pulsante } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'

type Impostazione = { chiave: string; valore: string }

export default function LimitiOpzioni() {
  const { righe, errore } = useElenco<Impostazione>(
    () => supabase.from('impostazioni').select('chiave, valore'),
    'impostazioni',
  )

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">Opzioni delle domande a scelta singola</h2>
        <p className="mt-1 text-sm text-slate-500">
          Quante opzioni di risposta deve avere ogni domanda a scelta singola. Il minimo serve per
          attivare una domanda, il massimo limita quante se ne possono aggiungere. Le domande già
          create non cambiano.
        </p>
      </div>
      {errore && <Avviso>{errore}</Avviso>}
      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <FormLimiti
          minimo={righe.find((r) => r.chiave === 'opzioni_min')?.valore ?? '3'}
          massimo={righe.find((r) => r.chiave === 'opzioni_max')?.valore ?? '5'}
        />
      )}
    </section>
  )
}

function FormLimiti({ minimo, massimo }: { minimo: string; massimo: string }) {
  const [min, setMin] = useState(minimo)
  const [max, setMax] = useState(massimo)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setSalvato(false)
    const nMin = Number(min)
    const nMax = Number(max)
    if (!Number.isInteger(nMin) || !Number.isInteger(nMax) || nMin < 2 || nMax > 10) {
      setErrore('Inserisci numeri interi: minimo almeno 2, massimo al più 10.')
      return
    }
    if (nMin > nMax) {
      setErrore('Il minimo non può essere superiore al massimo.')
      return
    }
    setInvio(true)
    const a = await supabase.from('impostazioni').update({ valore: String(nMin) }).eq('chiave', 'opzioni_min')
    const b = await supabase.from('impostazioni').update({ valore: String(nMax) }).eq('chiave', 'opzioni_max')
    setInvio(false)
    const error = a.error ?? b.error
    if (error) setErrore(messaggioErrore(error))
    else setSalvato(true)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid max-w-md grid-cols-2 gap-4">
        <Campo etichetta="Minimo di opzioni">
          <Input type="number" min={2} max={10} required value={min} onChange={(e) => setMin(e.target.value)} />
        </Campo>
        <Campo etichetta="Massimo di opzioni">
          <Input type="number" min={2} max={10} required value={max} onChange={(e) => setMax(e.target.value)} />
        </Campo>
      </div>
      {errore && <Avviso>{errore}</Avviso>}
      {salvato && <Avviso tipo="info">Impostazioni salvate.</Avviso>}
      <Pulsante type="submit" variante="primario" disabled={invio}>
        {invio ? 'Salvataggio…' : 'Salva'}
      </Pulsante>
    </form>
  )
}
