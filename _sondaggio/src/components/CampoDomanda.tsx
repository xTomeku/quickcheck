import { useId } from 'react'
import type { Valore } from '../lib/bozza'
import type { DomandaCompleta } from '../lib/sondaggio'

type Props = {
  domanda: DomandaCompleta
  valore: Valore | undefined
  onCambia: (valore: Valore) => void
  mancante: boolean
}

// Una domanda come la vede lo studente: scala di pulsanti oppure scelta singola
export default function CampoDomanda({ domanda, valore, onCambia, mancante }: Props) {
  const gruppo = useId()
  const min = domanda.scala_min ?? 1
  const max = domanda.scala_max ?? 5
  const valoriScala = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i)

  return (
    <fieldset
      className={`rounded-xl border p-4 ${
        mancante ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
      }`}
    >
      <legend className="px-1 font-medium">
        {domanda.testo}
        {domanda.obbligatoria && <span className="text-red-600"> *</span>}
      </legend>

      {domanda.tipo_risposta === 'scala' ? (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {valoriScala.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={valore === v}
                onClick={() => onCambia(v)}
                className={`size-11 rounded-lg border text-base font-medium ${
                  valore === v
                    ? 'border-inchiostro bg-inchiostro text-white'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {(domanda.etichetta_min || domanda.etichetta_max) && (
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{domanda.etichetta_min}</span>
              <span>{domanda.etichetta_max}</span>
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {domanda.opzioni_risposta.map((o) => (
            <li key={o.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${
                  valore === o.id ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name={gruppo}
                  className="size-4"
                  checked={valore === o.id}
                  onChange={() => onCambia(o.id)}
                />
                {o.testo}
              </label>
            </li>
          ))}
        </ul>
      )}

      {mancante && <p className="mt-2 text-sm text-red-700">Risposta obbligatoria</p>}
    </fieldset>
  )
}
