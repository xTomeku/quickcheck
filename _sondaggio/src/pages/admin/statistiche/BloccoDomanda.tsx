import { formatta, media, type Agg } from '../../../lib/statistiche'
import { voci, type DomandaRif } from './dati'

export default function BloccoDomanda({
  domanda,
  agg,
  titolo,
}: {
  domanda: DomandaRif
  agg: Agg | undefined
  titolo?: string
}) {
  const n = agg?.n ?? 0
  const med = domanda.tipo_risposta === 'scala' ? media(agg) : null
  const righe = voci(domanda, agg)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {titolo && <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{titolo}</p>}
      <p className="font-medium">{domanda.testo}</p>
      <p className="mt-1 text-sm text-slate-500">
        {n === 0 ? 'Nessuna risposta' : `${n} ${n === 1 ? 'risposta' : 'risposte'}`}
        {med !== null && ` · media ${formatta(med)}`}
      </p>
      {n > 0 && (
        <ul className="mt-3 space-y-1.5">
          {righe.map((v) => {
            const pct = (v.conteggio / n) * 100
            return (
              <li key={v.etichetta} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate" title={v.etichetta}>
                  {v.etichetta}
                </span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-slate-700"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right text-slate-600 tabular-nums">
                  {v.conteggio} · {Math.round(pct)}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
