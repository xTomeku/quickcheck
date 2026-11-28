import { useEffect, useRef } from 'react'
import { Avviso } from './ui'

// L'avviso sotto la voce di un elenco, accanto al pulsante che si è premuto.
// Se finisce fuori dallo schermo (voce in fondo alla finestra) la pagina lo porta in vista.
export default function AvvisoVoce({ testo }: { testo: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (testo) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [testo])

  if (!testo) return null
  return (
    <div ref={ref} className="w-full scroll-mb-4">
      <Avviso>{testo}</Avviso>
    </div>
  )
}
