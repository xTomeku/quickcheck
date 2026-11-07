import { useState } from 'react'
import { Avviso, Pulsante } from '../../../components/ui'

// «Esporta Excel»: mentre prepara il file resta fermo, e se qualcosa va storto lo dice
export default function PulsanteEsporta({
  onEsporta,
  disabled = false,
}: {
  onEsporta: () => Promise<void>
  disabled?: boolean
}) {
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState(false)

  async function esporta() {
    setInCorso(true)
    setErrore(false)
    try {
      await onEsporta()
    } catch {
      setErrore(true)
    }
    setInCorso(false)
  }

  return (
    <>
      <Pulsante onClick={esporta} disabled={disabled || inCorso}>
        {inCorso ? 'Preparo il file…' : 'Esporta Excel'}
      </Pulsante>
      {errore && (
        <div className="w-full">
          <Avviso>Non sono riuscito a creare il file. Ricarica la pagina e riprova.</Avviso>
        </div>
      )}
    </>
  )
}
