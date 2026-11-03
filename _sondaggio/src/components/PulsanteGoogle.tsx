import { useEffect, useRef, useState } from 'react'
import { caricaGoogle, GOOGLE_CLIENT_ID } from '../lib/google'
import { useStudente } from '../lib/studente'
import { Avviso } from './ui'

// Il pulsante «Accedi con Google». Se l'account non è dell'università mostra il perché.
export default function PulsanteGoogle() {
  const { imposta } = useStudente()
  const contenitore = useRef<HTMLDivElement>(null)
  const [problema, setProblema] = useState<string | null>(null)

  useEffect(() => {
    const clientId = GOOGLE_CLIENT_ID
    if (!clientId) return
    let annullato = false
    caricaGoogle()
      .then((google) => {
        if (annullato || !contenitore.current) return
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (risposta) => setProblema(imposta(risposta.credential)),
        })
        google.accounts.id.renderButton(contenitore.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          locale: 'it',
          width: 280,
        })
      })
      .catch(() => {
        if (!annullato) setProblema('Non riesco a collegarmi a Google. Controlla la connessione e riprova.')
      })
    return () => {
      annullato = true
    }
  }, [imposta])

  if (!GOOGLE_CLIENT_ID) {
    return <Avviso>L'accesso con Google non è ancora configurato.</Avviso>
  }

  return (
    <div className="space-y-3">
      <div ref={contenitore} className="min-h-11" />
      {problema && <Avviso>{problema}</Avviso>}
    </div>
  )
}
