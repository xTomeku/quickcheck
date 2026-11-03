import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { supabase } from '../../lib/supabase'

type Stato =
  | { tipo: 'caricamento' }
  | { tipo: 'errore' }
  | { tipo: 'chiuso' }
  | { tipo: 'aperto'; edizioneId: string; nomeEdizione: string }

export default function Benvenuto() {
  const { bozza, aggiorna, azzera } = useBozza()
  const navigate = useNavigate()
  const [stato, setStato] = useState<Stato>({ tipo: 'caricamento' })

  useEffect(() => {
    let annullato = false
    supabase
      .from('edizioni')
      .select('id, nome')
      .eq('aperta', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (annullato) return
        if (error) setStato({ tipo: 'errore' })
        else if (!data) setStato({ tipo: 'chiuso' })
        else setStato({ tipo: 'aperto', edizioneId: data.id, nomeEdizione: data.nome })
      })
    return () => {
      annullato = true
    }
  }, [])

  // Una bozza di un'edizione diversa da quella aperta non è più utilizzabile
  useEffect(() => {
    if (stato.tipo === 'aperto' && bozza.edizioneId && bozza.edizioneId !== stato.edizioneId) {
      azzera()
    }
  }, [stato, bozza.edizioneId, azzera])

  if (stato.tipo === 'caricamento') {
    return <p className="text-slate-500">Caricamento…</p>
  }

  if (stato.tipo === 'errore') {
    return <Avviso>Non riesco a collegarmi al sondaggio. Riprova tra qualche minuto.</Avviso>
  }

  if (stato.tipo === 'chiuso') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sondaggio non aperto</h1>
        <p className="mt-2 text-slate-600">
          Il sondaggio non è al momento aperto. [Quando riapre o a chi rivolgersi]
        </p>
      </div>
    )
  }

  const edizioneId = stato.edizioneId
  const inCorso = bozza.edizioneId === edizioneId && bozza.corsoId !== null

  function inizia() {
    aggiorna((b) => (b.edizioneId === edizioneId ? b : { ...b, edizioneId }))
    navigate('/corso')
  }

  function ricomincia() {
    azzera()
    aggiorna((b) => ({ ...b, edizioneId }))
    navigate('/corso')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-500">{stato.nomeEdizione}</p>
      <h1 className="mt-1 text-2xl font-semibold">Valuta i tuoi corsi e i tuoi docenti</h1>
      <p className="mt-3 text-slate-600">
        Questo sondaggio raccoglie le opinioni degli studenti di Ingegneria dell'Innovazione sui
        corsi e sui docenti. Le risposte sono anonime: non vengono collegate al tuo nome né al tuo
        indirizzo email. Puoi scegliere a quali materie rispondere, anche solo ad alcune, e
        modificare le risposte fino all'invio.
      </p>
      <p className="mt-3 text-sm text-slate-400">
        [Durata stimata: X minuti] [Chi promuove il sondaggio e come verranno usati i risultati]
        [Link all'informativa sulla privacy]
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Pulsante grande variante="primario" onClick={inizia}>
          {inCorso ? 'Riprendi da dove eri rimasto' : 'Inizia'}
        </Pulsante>
        {inCorso && (
          <Pulsante grande onClick={ricomincia}>
            Ricomincia da capo
          </Pulsante>
        )}
      </div>
    </div>
  )
}
