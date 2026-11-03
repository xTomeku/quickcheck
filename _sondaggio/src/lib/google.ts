// Accesso con Google (Google Identity Services). Il browser riceve una prova d'identità (id_token) che
// resta solo in memoria e viene mandata alla funzione di verifica: non finisce nel database.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
export const DOMINIO_STUDENTI = 'studenti.unisalento.it'

type ApiGoogle = {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (risposta: { credential: string }) => void
        auto_select?: boolean
      }): void
      renderButton(elemento: HTMLElement, opzioni: Record<string, unknown>): void
      disableAutoSelect(): void
    }
  }
}

declare global {
  interface Window {
    google?: ApiGoogle
  }
}

let caricamento: Promise<ApiGoogle> | null = null

export function caricaGoogle(): Promise<ApiGoogle> {
  if (window.google) return Promise.resolve(window.google)
  caricamento ??= new Promise<ApiGoogle>((ok, no) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => (window.google ? ok(window.google) : no(new Error('Google non disponibile')))
    script.onerror = () => {
      caricamento = null
      no(new Error('Google non raggiungibile'))
    }
    document.head.append(script)
  })
  return caricamento
}

// Legge email e scadenza dalla prova di Google, solo per mostrarle allo studente e per sapere quando scade.
// La verifica vera (firma, destinatario, dominio) la fa il server.
export function leggiToken(token: string): { email: string; scadenza: number } | null {
  try {
    const corpo = token.split('.')[1]
    const byte = Uint8Array.from(atob(corpo.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const dati = JSON.parse(new TextDecoder().decode(byte))
    if (typeof dati.email !== 'string' || typeof dati.exp !== 'number') return null
    return { email: dati.email.toLowerCase(), scadenza: dati.exp * 1000 }
  } catch {
    return null
  }
}
