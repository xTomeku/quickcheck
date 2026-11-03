import type { ReactNode } from 'react'
import { useAuth, type Ruolo } from '../lib/auth'

type Props = {
  ruoli: Ruolo[]
  children: ReactNode
}

// Mostra la sezione solo ai ruoli indicati
export default function RequireRole({ ruoli, children }: Props) {
  const { ruolo } = useAuth()
  if (!ruolo || !ruoli.includes(ruolo)) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
        Il tuo ruolo non ha accesso a questa sezione.
      </p>
    )
  }
  return <>{children}</>
}
