import { useContext, useRef, useState } from 'react'
import { Avviso, Pulsante } from '../../../components/ui'
import { SOGLIA_POCHE_RISPOSTE } from '../../../lib/statistiche'
import type { Contesto } from './esporta'
import type { Filtri } from './filtri'
import type { Richiesta } from './report/componi'
import { DatiReport } from './report/riferimenti'

type Props = {
  richiesta: Richiesta
  filtri: Filtri
  contesto: Contesto
  // Nome della materia o del docente
  nome?: string
  etichetta?: string
}

const TITOLI = { generale: 'Report generale', materia: 'Report della materia', docente: 'Report del docente' }

function Casella({
  scelta,
  onScegli,
  titolo,
  aiuto,
}: {
  scelta: boolean
  onScegli: (valore: boolean) => void
  titolo: string
  aiuto: string
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={scelta}
        onChange={(e) => onScegli(e.target.checked)}
        className="mt-0.5 size-4 flex-none accent-inchiostro"
      />
      <span>
        <span className="block text-sm font-semibold">{titolo}</span>
        <span className="block text-xs text-slate-500">{aiuto}</span>
      </span>
    </label>
  )
}

// «Crea report»: prima si sceglie cosa metterci, poi si scarica una pagina pronta da stampare in PDF
export default function PulsanteReport({ richiesta, filtri, contesto, nome, etichetta = 'Crea report' }: Props) {
  const pagina = useContext(DatiReport)
  const finestra = useRef<HTMLDialogElement>(null)
  const [docenti, setDocenti] = useState(true)
  const [testi, setTesti] = useState(false)
  const [tutto, setTutto] = useState(false)
  const [stato, setStato] = useState<'fermo' | 'incorso' | 'fatto' | 'errore'>('fermo')

  if (!pagina) return null
  const { rif, vedeDocenti } = pagina
  const incorso = stato === 'incorso'

  function apri() {
    setStato('fermo')
    finestra.current?.showModal()
  }

  async function crea() {
    setStato('incorso')
    try {
      // Il codice del report si carica solo qui: chi non lo usa non lo scarica
      const { creaReport } = await import('./report/crea')
      await creaReport({
        richiesta,
        opzioni: {
          docenti: vedeDocenti && (richiesta.tipo === 'docente' || docenti),
          testi,
          tutto,
        },
        filtri,
        contesto,
        rif,
        nome,
      })
      setStato('fatto')
    } catch {
      setStato('errore')
    }
  }

  return (
    <>
      <Pulsante onClick={apri}>{etichetta}</Pulsante>
      <dialog
        ref={finestra}
        aria-label={TITOLI[richiesta.tipo]}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-left text-grafite shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-3 p-5">
          <div>
            <h2 className="text-lg font-bold">{TITOLI[richiesta.tipo]}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Numeri, grafici e classifiche in un file da aprire nel browser e salvare in PDF.
            </p>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-lg bg-inchiostro-velo p-3 text-xs">
            {contesto.map(([voce, valore]) => (
              <div key={voce} className="contents">
                <dt className="text-slate-600">{voce}</dt>
                <dd className="font-semibold">{valore}</dd>
              </div>
            ))}
          </dl>

          {vedeDocenti && richiesta.tipo !== 'docente' && (
            <Casella
              scelta={docenti}
              onScegli={setDocenti}
              titolo="Includi i dati sui docenti"
              aiuto="Classifiche, voti e domande che riguardano i singoli docenti."
            />
          )}
          <Casella
            scelta={testi}
            onScegli={setTesti}
            titolo="Includi le risposte scritte"
            aiuto="I testi degli studenti, esclusi quelli nascosti. Rileggili prima di condividere il report."
          />
          <Casella
            scelta={tutto}
            onScegli={setTutto}
            titolo={`Mostra anche i risultati con meno di ${SOGLIA_POCHE_RISPOSTE} risposte`}
            aiuto="Sono poco affidabili e possono rendere riconoscibile chi ha risposto: meglio solo per uso interno."
          />

          {stato === 'errore' && <Avviso>Non sono riuscito a creare il report. Ricarica la pagina e riprova.</Avviso>}
          {stato === 'fatto' && (
            <Avviso tipo="info">
              Report scaricato. Apri il file, premi «Stampa / Salva come PDF» e scegli «Salva come PDF».
            </Avviso>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Pulsante variante="testo" onClick={() => finestra.current?.close()}>
              Chiudi
            </Pulsante>
            <Pulsante variante="primario" disabled={incorso} onClick={crea}>
              {incorso ? 'Preparo il report…' : 'Scarica report'}
            </Pulsante>
          </div>
        </div>
      </dialog>
    </>
  )
}
