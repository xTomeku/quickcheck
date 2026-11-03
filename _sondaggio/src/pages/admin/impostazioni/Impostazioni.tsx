import LimitiOpzioni from './LimitiOpzioni'
import UtentiPannello from './UtentiPannello'

export default function Impostazioni() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Impostazioni e utenti</h1>
        <p className="mt-1 text-sm text-slate-500">Sezione riservata agli admin.</p>
      </div>
      <LimitiOpzioni />
      <UtentiPannello />
    </div>
  )
}
