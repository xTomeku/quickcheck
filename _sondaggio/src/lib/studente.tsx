import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DOMINIO_STUDENTI, leggiToken } from './google'

type Accesso = { idToken: string; email: string; scadenza: number }

type Contesto = {
  accesso: Accesso | null
  // Registra l'accesso. Restituisce un messaggio se l'account non va bene, altrimenti null
  imposta: (idToken: string) => string | null
  esci: () => void
}

const StudenteContext = createContext<Contesto | null>(null)

// L'accesso dello studente sta solo in memoria: ricaricando la pagina si torna a fare l'accesso,
// mentre la bozza delle risposte resta sul dispositivo.
export function StudenteProvider({ children }: { children: ReactNode }) {
  const [accesso, setAccesso] = useState<Accesso | null>(null)

  const imposta = useCallback((idToken: string) => {
    const dati = leggiToken(idToken)
    if (!dati) return "L'accesso non è andato a buon fine. Riprova."
    if (!dati.email.endsWith(`@${DOMINIO_STUDENTI}`)) {
      return `Serve un account @${DOMINIO_STUDENTI}. Scegli quello dell'università.`
    }
    setAccesso({ idToken, ...dati })
    return null
  }, [])

  const esci = useCallback(() => {
    setAccesso(null)
    window.google?.accounts.id.disableAutoSelect()
  }, [])

  const valore = useMemo(() => ({ accesso, imposta, esci }), [accesso, imposta, esci])
  return <StudenteContext.Provider value={valore}>{children}</StudenteContext.Provider>
}

export function useStudente() {
  const contesto = useContext(StudenteContext)
  if (!contesto) throw new Error('useStudente va usato dentro StudenteProvider')
  return contesto
}

// Vero se l'accesso c'è e non è scaduto (la prova di Google dura circa un'ora)
export function accessoValido(accesso: Accesso | null) {
  return accesso !== null && accesso.scadenza > Date.now()
}
