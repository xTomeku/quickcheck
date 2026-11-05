import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../lib/auth'
import { SEZIONI } from '../lib/sezioni'
import Login from '../pages/admin/Login'

const NOMI_RUOLO = {
  admin: 'Admin',
  editor: 'Editor',
  lettura: 'Sola lettura',
} as const

export default function AdminLayout() {
  return (
    <AuthProvider>
      <AdminAccesso />
    </AuthProvider>
  )
}

function AdminAccesso() {
  const { caricamento, sessione, ruolo, esci } = useAuth()
  const [menuAperto, setMenuAperto] = useState(false)
  const { pathname } = useLocation()
  const sezioneCorrente = SEZIONI.find((s) => pathname.startsWith(`/admin/${s.percorso}`))

  if (caricamento) {
    return <p className="p-8 text-slate-500">Caricamento…</p>
  }

  if (!sessione) {
    return <Login />
  }

  if (!ruolo) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Accesso non autorizzato</h1>
          <p className="mt-2 text-slate-600">
            L'account {sessione.user.email} non ha un ruolo nel pannello. Chiedi a un admin di
            assegnartelo.
          </p>
          <button
            onClick={esci}
            className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-semibold hover:bg-slate-50"
          >
            Esci
          </button>
        </div>
      </div>
    )
  }

  const visibili = SEZIONI.filter((s) => s.ruoli.includes(ruolo))

  return (
    <div className="min-h-screen md:flex">
      <nav className="flex flex-col border-b border-slate-200 bg-white md:w-64 md:flex-none md:border-r md:border-b-0">
        <div className="flex items-center gap-3 border-b-4 border-udu-giallo bg-udu px-4 py-3 text-white md:py-4">
          <img
            src={`${import.meta.env.BASE_URL}udu-lecce-ingegneria.png`}
            alt="Udu Lecce Ingegneria"
            className="size-10 flex-none rounded-full ring-2 ring-white md:size-12"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base leading-tight font-extrabold md:text-lg">Pannello admin</p>
            <p className="text-xs text-white/85 md:text-sm">
              <span className="md:hidden">{sezioneCorrente?.nome ?? 'Sondaggio studenti'}</span>
              <span className="hidden md:inline">Sondaggio studenti · Udu Lecce</span>
            </p>
          </div>
          <button
            type="button"
            aria-label={menuAperto ? 'Chiudi il menu' : 'Apri il menu'}
            aria-expanded={menuAperto}
            onClick={() => setMenuAperto((v) => !v)}
            className="grid size-11 flex-none place-items-center rounded-lg border border-white/60 md:hidden"
          >
            <Icona d={menuAperto ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} size={22} />
          </button>
        </div>

        <div className={`${menuAperto ? 'flex' : 'hidden'} flex-1 flex-col md:flex`}>
          <ul className="flex flex-col gap-1 px-3 py-4">
            {visibili.map((s) => (
              <li key={s.percorso}>
                <NavLink
                  to={`/admin/${s.percorso}`}
                  onClick={() => setMenuAperto(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-lg border-l-4 px-3 text-[15px] font-semibold ${
                      isActive
                        ? 'border-udu bg-udu-velo text-udu'
                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icona d={ICONE[s.percorso] ?? ICONE.dati} />
                  {s.nome}
                </NavLink>
              </li>
            ))}
            <li className="mt-2 border-t border-slate-200 pt-3">
              {/* La pagina degli studenti è la stessa applicazione, alla radice: si apre in una nuova scheda */}
              <a
                href="./#/"
                target="_blank"
                rel="noopener"
                className="flex min-h-11 items-center gap-3 rounded-lg border-l-4 border-transparent px-3 text-[15px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icona d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                Vai al sondaggio
                <span className="sr-only">(si apre in una nuova scheda)</span>
              </a>
            </li>
          </ul>
          <div className="mt-auto space-y-2 border-t border-slate-200 p-4">
            <p className="text-sm text-slate-500">
              {sessione.user.email} · {NOMI_RUOLO[ruolo]}
            </p>
            <div className="flex gap-2">
              <Link
                to="/imposta-password"
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cambia password
              </Link>
              <button
                onClick={esci}
                className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:border-inchiostro hover:bg-inchiostro-velo"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// Icone delle sezioni (tratto, 24x24)
const ICONE: Record<string, string> = {
  dati: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  domande: 'M9 9a3 3 0 1 1 4.2 2.7c-.8.4-1.2 1-1.2 1.8M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  edizioni: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  statistiche: 'M5 20V10M12 20V4M19 20v-7',
  import: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  impostazioni: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
}

function Icona({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d={d} />
    </svg>
  )
}
