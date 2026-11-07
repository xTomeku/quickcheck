import { useEffect, useState } from 'react'
import { useBozza } from './bozza'
import { chiamaServer } from './server'
import { useStudente } from './studente'

// `scelta`: corso e anno registrati al primo invio dell'edizione (assente con il server vecchio)
export type SceltaStudente = { corso_id: string; anno: number | 'fuori_corso' }
export type StatoStudente = { compilate: string[]; extra_inviate: boolean; scelta?: SceltaStudente | null }

// Cosa ha già inviato questa persona nell'edizione (materie e domande Extra), chiesto al server
export function useStatoStudente() {
  const { bozza } = useBozza()
  const { accesso } = useStudente()
  const [stato, setStato] = useState<StatoStudente | null>(null)
  const [errore, setErrore] = useState<{ stato: number; errore: string } | null>(null)
  const edizioneId = bozza.edizioneId
  const idToken = accesso?.idToken

  useEffect(() => {
    if (!edizioneId || !idToken) return
    let annullato = false
    chiamaServer<StatoStudente>('stato', idToken, edizioneId).then((esito) => {
      if (annullato) return
      if (esito.ok) {
        setErrore(null)
        setStato(esito.dati)
      } else {
        setErrore({ stato: esito.stato, errore: esito.errore })
      }
    })
    return () => {
      annullato = true
    }
  }, [edizioneId, idToken])

  return { stato, errore }
}
