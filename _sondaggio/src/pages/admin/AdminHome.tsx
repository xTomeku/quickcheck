import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { SEZIONI } from '../../lib/sezioni'

// Porta alla prima sezione consentita al ruolo
export default function AdminHome() {
  const { ruolo } = useAuth()
  const prima = SEZIONI.find((s) => ruolo && s.ruoli.includes(ruolo))
  return prima ? <Navigate to={prima.percorso} replace /> : null
}
