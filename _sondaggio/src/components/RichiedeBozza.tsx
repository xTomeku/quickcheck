import { Navigate, Outlet } from 'react-router-dom'
import { useBozza } from '../lib/bozza'
import { useStudente } from '../lib/studente'

// Le schermate del percorso si aprono solo dopo il benvenuto (che registra l'edizione e l'accesso con
// Google). Ricaricando la pagina l'accesso va rifatto: dal benvenuto la bozza si riprende.
export default function RichiedeBozza() {
  const { bozza } = useBozza()
  const { accesso } = useStudente()
  return bozza.edizioneId && accesso ? <Outlet /> : <Navigate to="/" replace />
}
