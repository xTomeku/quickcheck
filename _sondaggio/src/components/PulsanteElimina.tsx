import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { eliminaVoce, type TipoVoce } from '../lib/elimina'
import { Pulsante } from './ui'

type Props = {
  tipo: TipoVoce
  id: string
  nome: string
  // Chiamata dopo l'eliminazione, per ricaricare l'elenco
  onEliminata: () => void
  // Messaggio d'errore da mostrare (o null per toglierlo)
  onMessaggio: (messaggio: string | null) => void
}

// Tasto «Elimina»: visibile solo agli admin, con conferma che dice cosa verrà cancellato
export default function PulsanteElimina({ tipo, id, nome, onEliminata, onMessaggio }: Props) {
  const { ruolo } = useAuth()
  const [incorso, setInCorso] = useState(false)
  if (ruolo !== 'admin') return null

  async function elimina() {
    setInCorso(true)
    const esito = await eliminaVoce(tipo, id, nome)
    setInCorso(false)
    if (esito.esito === 'errore') onMessaggio(esito.messaggio)
    else if (esito.esito === 'eliminata') {
      onMessaggio(null)
      onEliminata()
    }
  }

  return (
    <Pulsante variante="pericolo" disabled={incorso} onClick={elimina}>
      {incorso ? 'Elimino…' : 'Elimina'}
    </Pulsante>
  )
}
