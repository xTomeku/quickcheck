import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useBozza } from '../../lib/bozza'

export default function Conferma() {
  const { azzera } = useBozza()
  const location = useLocation()
  const inviato = Boolean(location.state?.inviato)

  // Dopo un invio riuscito la bozza sul dispositivo non serve più
  useEffect(() => {
    if (inviato) azzera()
  }, [inviato, azzera])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Grazie!</h1>
      <p className="mt-3 text-slate-600">
        Le tue risposte sono state inviate. Dopo l'invio non è possibile modificarle. [Quando e dove
        saranno visibili i risultati]
      </p>
    </div>
  )
}
