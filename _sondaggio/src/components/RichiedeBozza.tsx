import { Navigate, Outlet } from 'react-router-dom'
import { useBozza } from '../lib/bozza'

// Le schermate del percorso si aprono solo dopo il benvenuto (che registra l'edizione)
export default function RichiedeBozza() {
  const { bozza } = useBozza()
  return bozza.edizioneId ? <Outlet /> : <Navigate to="/" replace />
}
