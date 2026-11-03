import { useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { accedi } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    setErrore(await accedi(email.trim(), password))
    setInvio(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
        <img
          src={`${import.meta.env.BASE_URL}udu-lecce-ingegneria.png`}
          alt="Udu Lecce Ingegneria"
          className="mb-4 size-16 rounded-full"
        />
        <h1 className="text-xl font-bold">Pannello admin</h1>
        <p className="mt-1 text-sm text-slate-500">Accedi con le credenziali del tuo account.</p>

        <label className="mt-5 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {invio ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
    </div>
  )
}
