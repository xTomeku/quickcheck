import { useEffect, useState } from 'react'

type Risposta<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

// Carica un elenco dal database. `chiave` identifica i filtri: quando cambia, si ricarica.
export function useElenco<T>(carica: () => Risposta<T>, chiave: string) {
  const [righe, setRighe] = useState<T[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [versione, setVersione] = useState(0)

  useEffect(() => {
    let annullato = false
    carica().then(({ data, error }) => {
      if (annullato) return
      if (error) {
        setErrore('Non riesco a caricare i dati.')
      } else {
        setErrore(null)
        setRighe(data ?? [])
      }
    })
    return () => {
      annullato = true
    }
    // `carica` è ridefinita a ogni render: si ricarica solo se cambiano versione o chiave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versione, chiave])

  return { righe, errore, ricarica: () => setVersione((v) => v + 1) }
}
