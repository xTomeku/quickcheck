import { Outlet, useLocation } from 'react-router-dom'
import BozzaProvider from '../components/BozzaProvider'
import { Passi } from '../components/studente'
import { StudenteProvider } from '../lib/studente'

// Il passo del percorso in cui ci si trova (0 = benvenuto e conferma, dove l'indicatore non serve)
function passoDi(percorso: string) {
  if (percorso.startsWith('/corso') || percorso.startsWith('/anno')) return 1
  if (percorso.startsWith('/materie')) return 2
  if (percorso.startsWith('/compila') || percorso.startsWith('/extra')) return 3
  if (percorso.startsWith('/riepilogo')) return 4
  return 0
}

export default function StudenteLayout() {
  const { pathname } = useLocation()
  const passo = passoDi(pathname)

  return (
    <StudenteProvider>
      <BozzaProvider>
        <div className="flex min-h-screen flex-col bg-carta">
          <header className="border-b-4 border-udu-giallo bg-udu text-white">
            <div className="mx-auto max-w-xl space-y-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={`${import.meta.env.BASE_URL}udu-lecce-ingegneria.png`}
                  alt="Udu Lecce Ingegneria"
                  className="size-11 flex-none rounded-full ring-2 ring-white"
                />
                <div>
                  <p className="text-[13px] leading-tight font-medium text-white/85">
                    Ingegneria dell'Innovazione
                  </p>
                  <p className="text-lg leading-tight font-extrabold">Sondaggio studenti</p>
                </div>
              </div>
              {passo > 0 && <Passi corrente={passo} />}
            </div>
          </header>
          <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-0">
            <Outlet />
          </main>
          <footer className="mx-auto w-full max-w-xl px-4 py-6 text-center text-xs text-slate-500">
            <a href={`${import.meta.env.BASE_URL}privacy.html`} className="underline">
              Informativa sulla privacy
            </a>
          </footer>
        </div>
      </BozzaProvider>
    </StudenteProvider>
  )
}
