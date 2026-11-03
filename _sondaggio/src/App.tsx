import { lazy, Suspense, type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PaginaDaCostruire from './components/PaginaDaCostruire'
import RequireRole from './components/RequireRole'
import RichiedeBozza from './components/RichiedeBozza'
import StudenteLayout from './layouts/StudenteLayout'
import { SEZIONI } from './lib/sezioni'
import Benvenuto from './pages/studente/Benvenuto'
import Compila from './pages/studente/Compila'
import Conferma from './pages/studente/Conferma'
import CorsoAnno from './pages/studente/CorsoAnno'
import Riepilogo from './pages/studente/Riepilogo'
import ScegliMaterie from './pages/studente/ScegliMaterie'

// Il pannello admin si scarica solo quando serve, così gli studenti ricevono meno codice
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const ImpostaPassword = lazy(() => import('./pages/admin/ImpostaPassword'))
const DatiAccademici = lazy(() => import('./pages/admin/dati/DatiAccademici'))
const Domande = lazy(() => import('./pages/admin/domande/Domande'))
const Edizioni = lazy(() => import('./pages/admin/Edizioni'))
const Import = lazy(() => import('./pages/admin/import/Import'))
const Impostazioni = lazy(() => import('./pages/admin/impostazioni/Impostazioni'))
const Statistiche = lazy(() => import('./pages/admin/statistiche/Statistiche'))

// Sezioni del pannello già realizzate; le altre mostrano ancora il segnaposto
const PAGINE: Record<string, ReactElement> = {
  dati: <DatiAccademici />,
  domande: <Domande />,
  edizioni: <Edizioni />,
  import: <Import />,
  impostazioni: <Impostazioni />,
  statistiche: <Statistiche />,
}

export default function App() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-500">Caricamento…</p>}>
    <Routes>
      <Route element={<StudenteLayout />}>
        <Route index element={<Benvenuto />} />
        <Route element={<RichiedeBozza />}>
          <Route path="corso" element={<CorsoAnno />} />
          <Route path="materie" element={<ScegliMaterie />} />
          <Route path="compila/:indice" element={<Compila />} />
          <Route path="riepilogo" element={<Riepilogo />} />
        </Route>
        <Route path="conferma" element={<Conferma />} />
      </Route>

      <Route path="imposta-password" element={<ImpostaPassword />} />

      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        {SEZIONI.map((s) => (
          <Route
            key={s.percorso}
            path={s.percorso}
            element={
              <RequireRole ruoli={s.ruoli}>
                {PAGINE[s.percorso] ?? (
                  <PaginaDaCostruire titolo={s.nome} descrizione={s.descrizione} />
                )}
              </RequireRole>
            }
          />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
