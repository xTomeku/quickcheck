import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconaSpunta } from '../../components/studente'
import { Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { useStudente } from '../../lib/studente'

export default function Conferma() {
  const { azzera } = useBozza()
  const { esci } = useStudente()
  const navigate = useNavigate()
  const location = useLocation()
  const inviato = Boolean(location.state?.inviato)

  // Dopo un invio riuscito la bozza sul dispositivo non serve più, e si esce dall'account:
  // così nessuno resta collegato su un dispositivo condiviso
  useEffect(() => {
    if (inviato) {
      azzera()
      esci()
    }
  }, [inviato, azzera, esci])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-udu text-white ring-8 ring-udu-velo">
        <IconaSpunta className="size-8" />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Grazie!</h1>
      <p className="mt-3 text-slate-600">
        Le tue risposte sono state inviate. Dopo l'invio non è possibile modificarle.
      </p>
      <div className="mt-6 space-y-3">
        <Pulsante grande variante="primario" className="w-full" onClick={() => navigate('/')}>
          Rispondi ad altre materie
        </Pulsante>
        <p className="text-sm text-slate-500">Oppure puoi chiudere questa pagina.</p>
      </div>
    </div>
  )
}
