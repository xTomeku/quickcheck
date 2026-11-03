import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

// Pagina raggiunta dal link ricevuto per email (invito o recupero) e dal menu del pannello
export default function ImpostaPassword() {
  return (
    <AuthProvider>
      <Modulo />
    </AuthProvider>
  )
}

function Modulo() {
  const { caricamento, sessione } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    if (password.length < 8) {
      setErrore('La password deve avere almeno 8 caratteri.')
      return
    }
    if (password !== conferma) {
      setErrore('Le due password non coincidono.')
      return
    }
    setInvio(true)
    const { error } = await supabase.auth.updateUser({ password })
    setInvio(false)
    if (error) {
      setErrore('Non è stato possibile salvare la password. Riprova o richiedi un nuovo link.')
      return
    }
    navigate('/admin')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      {caricamento ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : !sessione ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Link non valido o scaduto</h1>
          <p className="mt-2 text-slate-600">
            Chiedi a un admin di inviarti un nuovo link o di reimpostare la password.
          </p>
          <Link
            to="/admin"
            className="mt-6 inline-block rounded-lg bg-udu px-4 py-2.5 font-medium text-white"
          >
            Vai all'accesso
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Scegli la password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Account: {sessione.user.email}. Usa almeno 8 caratteri e salvala in un gestore di
            password.
          </p>

          <label className="mt-5 block text-sm font-medium" htmlFor="nuova">
            Nuova password
          </label>
          <input
            id="nuova"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="conferma">
            Ripeti la password
          </label>
          <input
            id="conferma"
            type="password"
            autoComplete="new-password"
            required
            value={conferma}
            onChange={(e) => setConferma(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          {errore && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {errore}
            </p>
          )}

          <button
            type="submit"
            disabled={invio}
            className="mt-6 w-full rounded-lg bg-udu px-4 py-2.5 font-medium text-white hover:bg-udu-scuro disabled:opacity-60"
          >
            {invio ? 'Salvataggio…' : 'Salva la password'}
          </button>
        </form>
      )}
    </div>
  )
}
