import { useState } from 'react'
import { Avviso, Pulsante } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import type { DomandaRif } from './dati'

export type VoceScritta = { id: string; testo: string; nascosta: boolean; etichetta?: string }

// Oltre questo numero le risposte si aprono a richiesta, per non allungare troppo la pagina
const PRIME = 5

// Le risposte scritte a una domanda. Chi può modificare le nasconde (per esempio se contengono nomi o
// offese): restano nel database ma non si mostrano e non finiscono nelle esportazioni.
export default function RisposteScritte({
  domanda,
  voci,
  onCambiato,
}: {
  domanda: DomandaRif
  voci: VoceScritta[]
  onCambiato: () => void
}) {
  const { ruolo } = useAuth()
  const puoNascondere = ruolo === 'admin' || ruolo === 'editor'
  const [tutte, setTutte] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const nascoste = voci.filter((v) => v.nascosta).length
  const mostrate = tutte ? voci : voci.slice(0, PRIME)

  async function nascondi(id: string, nascosta: boolean) {
    const { error } = await supabase.rpc('nascondi_risposta', { p_id: id, p_nascosta: nascosta })
    setErrore(error ? messaggioErrore(error) : null)
    onCambiato()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm">{domanda.testo}</p>
      <p className="text-xs text-slate-500">
        {voci.length === 0
          ? 'Nessuna risposta scritta'
          : `${voci.length} ${voci.length === 1 ? 'risposta scritta' : 'risposte scritte'}${
              nascoste > 0 ? ` · ${nascoste} ${nascoste === 1 ? 'nascosta' : 'nascoste'}` : ''
            }`}
      </p>
      {errore && (
        <div className="mt-2">
          <Avviso>{errore}</Avviso>
        </div>
      )}
      {voci.length > 0 && (
        <ul className="mt-3 space-y-2">
          {mostrate.map((v) => (
            <li
              key={v.id}
              className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                v.nascosta ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                {v.etichetta && <p className="text-xs text-slate-500">{v.etichetta}</p>}
                <p className="break-words whitespace-pre-wrap">
                  {v.nascosta && <span className="mr-2 font-semibold">[Nascosta]</span>}
                  {v.testo}
                </p>
              </div>
              {puoNascondere && (
                <Pulsante onClick={() => nascondi(v.id, !v.nascosta)}>
                  {v.nascosta ? 'Mostra' : 'Nascondi'}
                </Pulsante>
              )}
            </li>
          ))}
        </ul>
      )}
      {voci.length > PRIME && (
        <Pulsante variante="testo" className="mt-2" onClick={() => setTutte(!tutte)}>
          {tutte ? 'Mostra meno' : `Mostra tutte (${voci.length})`}
        </Pulsante>
      )}
    </div>
  )
}
