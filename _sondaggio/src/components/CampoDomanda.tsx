import { useId } from 'react'
import type { Valore } from '../lib/bozza'
import { opzioniScelte, type DomandaCompleta } from '../lib/sondaggio'
import { IconaAttenzione } from './studente'

// Lunghezza massima di una risposta scritta (la stessa imposta dal database)
const LIMITE_TESTO = 1000

type Props = {
  domanda: DomandaCompleta
  valore: Valore | undefined
  onCambia: (valore: Valore) => void
  mancante: boolean
}

// Una domanda come la vede lo studente: scala di pulsanti a tutta larghezza, scelta singola o multipla, o testo libero.
// Il rosso dice «scelto»; una risposta obbligatoria mancante si segnala in giallo, con icona e parole.
export default function CampoDomanda({ domanda, valore, onCambia, mancante }: Props) {
  const gruppo = useId()
  const idTitolo = `${gruppo}-titolo`
  const min = domanda.scala_min ?? 1
  const max = domanda.scala_max ?? 5
  const valoriScala = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i)
  const multipla = domanda.tipo_risposta === 'scelta_multipla'
  const scelte = opzioniScelte(valore)

  // Segna o toglie un'opzione, tenendo l'elenco nell'ordine in cui le opzioni sono mostrate
  function alterna(id: string) {
    const nuove = scelte.includes(id) ? scelte.filter((s) => s !== id) : [...scelte, id]
    onCambia(domanda.opzioni_risposta.filter((o) => nuove.includes(o.id)).map((o) => o.id).join(','))
  }

  return (
    <div
      role="group"
      aria-labelledby={idTitolo}
      className={`rounded-2xl border-2 p-4 shadow-sm ${
        mancante ? 'border-udu-giallo bg-giallo-velo' : 'border-slate-200 bg-white'
      }`}
    >
      <p id={idTitolo} className="text-base leading-snug font-bold">
        {domanda.testo}
        {domanda.obbligatoria && (
          <>
            <span aria-hidden="true" className="text-udu">
              {' '}
              *
            </span>
            <span className="sr-only"> (obbligatoria)</span>
          </>
        )}
      </p>

      {multipla && <p className="mt-1 text-sm font-medium text-slate-600">Puoi scegliere più risposte.</p>}

      {domanda.tipo_risposta === 'testo' ? (
        <div className="mt-3">
          <textarea
            aria-labelledby={idTitolo}
            rows={4}
            maxLength={LIMITE_TESTO}
            value={typeof valore === 'string' ? valore : ''}
            onChange={(e) => onCambia(e.target.value)}
            placeholder={domanda.obbligatoria ? 'Scrivi qui' : 'Scrivi qui (facoltativo)'}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-3 text-base"
          />
          <p className="mt-1.5 flex justify-between gap-4 text-xs font-medium text-slate-600">
            <span>Non scrivere il tuo nome né quello di altre persone.</span>
            <span className="flex-none tabular-nums">
              {typeof valore === 'string' ? valore.length : 0}/{LIMITE_TESTO}
            </span>
          </p>
        </div>
      ) : domanda.tipo_risposta === 'scala' ? (
        <div className="mt-4">
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${valoriScala.length}, minmax(0, 1fr))` }}
          >
            {valoriScala.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={valore === v}
                onClick={() => onCambia(v)}
                className={`h-14 w-full rounded-xl border-2 text-lg font-bold transition-colors ${
                  valore === v
                    ? 'border-udu bg-udu text-white'
                    : 'border-slate-400 bg-white text-grafite hover:border-udu hover:bg-udu-velo'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {(domanda.etichetta_min || domanda.etichetta_max) && (
            <div className="mt-2 flex justify-between gap-4 text-xs font-medium text-slate-600">
              <span>{domanda.etichetta_min}</span>
              <span className="text-right">{domanda.etichetta_max}</span>
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {domanda.opzioni_risposta.map((o) => {
            const scelta = multipla ? scelte.includes(o.id) : valore === o.id
            return (
              <li key={o.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-3.5 transition-colors ${
                    scelta ? 'border-udu bg-udu-velo' : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <input
                    type={multipla ? 'checkbox' : 'radio'}
                    name={gruppo}
                    className="peer sr-only"
                    checked={scelta}
                    onChange={() => (multipla ? alterna(o.id) : onCambia(o.id))}
                  />
                  <span
                    aria-hidden="true"
                    className={`grid size-6 flex-none place-items-center border-2 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-inchiostro ${
                      multipla ? 'rounded-md' : 'rounded-full'
                    } ${scelta ? 'border-udu' : 'border-slate-400'} ${multipla && scelta ? 'bg-udu' : 'bg-white'}`}
                  >
                    {scelta &&
                      (multipla ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      ) : (
                        <span className="size-3 rounded-full bg-udu" />
                      ))}
                  </span>
                  <span className="font-medium">{o.testo}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {mancante && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-grafite">
          <IconaAttenzione className="size-4 flex-none text-[#8a6500]" />
          Risposta obbligatoria
        </p>
      )}
    </div>
  )
}
