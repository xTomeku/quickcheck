import { createContext } from 'react'
import type { useRiferimenti } from '../dati'

export type Riferimenti = ReturnType<typeof useRiferimenti>

// Gli elenchi già caricati dalla pagina Statistiche: servono ai pulsanti del report,
// che stanno in fondo ai dettagli di materie e docenti
export const DatiReport = createContext<{ rif: Riferimenti; vedeDocenti: boolean } | null>(null)
