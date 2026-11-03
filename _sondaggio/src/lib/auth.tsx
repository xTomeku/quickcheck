import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Ruolo = 'admin' | 'editor' | 'lettura'

const RUOLI: Ruolo[] = ['admin', 'editor', 'lettura']

type Profilo = { userId: string; ruolo: Ruolo | null; vedeDocenti: boolean }

type Auth = {
  caricamento: boolean
  sessione: Session | null
  ruolo: Ruolo | null
  vedeDocenti: boolean
  // Restituisce un messaggio d'errore, oppure null se l'accesso è riuscito
  accedi: (email: string, password: string) => Promise<string | null>
  esci: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [sessioneCaricata, setSessioneCaricata] = useState(false)
  const [profilo, setProfilo] = useState<Profilo | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session)
      setSessioneCaricata(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nuova) => {
      setSessione(nuova)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = sessione?.user.id

  // Il ruolo si legge dalla tabella admin_utenti: senza una riga, l'utente non ha accesso
  useEffect(() => {
    if (!userId) return
    let annullato = false
    supabase
      .from('admin_utenti')
      .select('ruolo, vede_docenti')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (annullato) return
        const ruolo = RUOLI.find((r) => r === data?.ruolo) ?? null
        setProfilo({ userId, ruolo, vedeDocenti: data?.vede_docenti ?? false })
      })
    return () => {
      annullato = true
    }
  }, [userId])

  const profiloAttuale = userId && profilo?.userId === userId ? profilo : null

  const valore: Auth = {
    caricamento: !sessioneCaricata || (userId !== undefined && profiloAttuale === null),
    sessione,
    ruolo: profiloAttuale?.ruolo ?? null,
    vedeDocenti: profiloAttuale?.ruolo === 'admin' || (profiloAttuale?.vedeDocenti ?? false),
    accedi: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? 'Email o password non corretti.' : null
    },
    esci: async () => {
      await supabase.auth.signOut()
      setProfilo(null)
    },
  }

  return <AuthContext.Provider value={valore}>{children}</AuthContext.Provider>
}

export function useAuth(): Auth {
  const contesto = useContext(AuthContext)
  if (!contesto) throw new Error('useAuth va usato dentro AuthProvider')
  return contesto
}
