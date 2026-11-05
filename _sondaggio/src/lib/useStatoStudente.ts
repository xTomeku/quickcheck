import { useEffect, useState } from 'react'
import { useBozza } from './bozza'
import { chiamaServer } from './server'
import { useStudente } from './studente'

export type StatoStudente = { compilate: string[]; extra_inviate: boolean }

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
