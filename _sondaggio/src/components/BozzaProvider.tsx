import { useCallback, useState, type ReactNode } from 'react'
import {
  BOZZA_VUOTA,
  BozzaContext,
  cancellaBozza,
  leggiBozza,
  salvaBozza,
  type Bozza,
} from '../lib/bozza'

export default function BozzaProvider({ children }: { children: ReactNode }) {
  const [bozza, setBozza] = useState<Bozza>(leggiBozza)

  const aggiorna = useCallback((modifica: (b: Bozza) => Bozza) => {
    setBozza((prec) => {
      const nuova = modifica(prec)
      salvaBozza(nuova)
      return nuova
    })
  }, [])

  const azzera = useCallback(() => {
    cancellaBozza()
    setBozza(BOZZA_VUOTA)
  }, [])

  return <BozzaContext.Provider value={{ bozza, aggiorna, azzera }}>{children}</BozzaContext.Provider>
}
