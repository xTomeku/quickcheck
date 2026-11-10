import type { ReactNode } from 'react'
import { formatta, media, type Agg } from '../../../lib/statistiche'
import { voci, type DomandaRif } from './dati'

// Toni di inchiostro dal valore più basso al più alto della scala
const TONI = ['#d6ebf3', '#a9d4e4', '#6fb5cf', '#3a8fb0', '#1b6580']

function tono(indice: number, totale: number) {
  return TONI[totale <= 1 ? TONI.length - 1 : Math.round((indice * (TONI.length - 1)) / (totale - 1))]
}

function BarraScala({ domanda, agg }: { domanda: DomandaRif; agg: Agg }) {
  const righe = voci(domanda, agg)
  const descrizione = righe.map((v) => `${v.etichetta}: ${v.conteggio}`).join(', ')
  return (
    <div role="img" aria-label={`Risposte per valore. ${descrizione}`} className="flex h-3 gap-0.5">
      {righe.map((v, i) =>
        v.conteggio === 0 ? null : (
          <span
            key={v.etichetta}
            title={`${v.etichetta}: ${v.conteggio} (${Math.round((v.conteggio / agg.n) * 100)}%)`}
            className="block min-w-0.5 first:rounded-l last:rounded-r"
            style={{ flexGrow: v.conteggio, flexBasis: 0, backgroundColor: tono(i, righe.length) }}
          />
        ),
      )}
    </div>
  )
}

function BarreOpzioni({ domanda, agg }: { domanda: DomandaRif; agg: Agg }) {
  return (
    <ul className="space-y-1">
      {voci(domanda, agg).map((v) => {
        const pct = (v.conteggio / agg.n) * 100
        return (
          <li key={v.etichetta} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate" title={v.etichetta}>
              {v.etichetta}
            </span>
            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-slate-100">
              <span className="block h-full rounded bg-inchiostro" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-14 shrink-0 text-right text-slate-600 tabular-nums">
              {v.conteggio} · {Math.round(pct)}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// Una domanda su una riga sola: così le domande di una materia si leggono senza scorrere
export default function RigaDomanda({
  domanda,
  agg,
  children,
}: {
  domanda: DomandaRif
  agg: Agg | undefined
  children?: ReactNode
}) {
  const n = agg?.n ?? 0
  const scala = domanda.tipo_risposta === 'scala'
  const med = scala ? media(agg) : null

  return (
    <div className="grid gap-x-4 gap-y-2 border-t border-slate-100 py-3 text-sm first:border-t-0 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,14rem)] sm:items-center">
      <div className="min-w-0">
        <p>{domanda.testo}</p>
        <p className="text-xs text-slate-500">
          {n === 0
            ? 'Nessuna risposta'
            : domanda.tipo_risposta === 'scelta_multipla'
              ? `${n} ${n === 1 ? 'persona' : 'persone'} · più risposte possibili`
              : `${n} ${n === 1 ? 'risposta' : 'risposte'}`}
        </p>
      </div>
      {n > 0 && agg && scala && (
        <>
          <p className="font-semibold tabular-nums sm:text-right">
            {med === null ? '—' : formatta(med)}
          </p>
          <BarraScala domanda={domanda} agg={agg} />
        </>
      )}
      {n > 0 && agg && !scala && (
        <div className="sm:col-span-2">
          <BarreOpzioni domanda={domanda} agg={agg} />
        </div>
      )}
      {children && <div className="sm:col-span-3">{children}</div>}
    </div>
  )
}

// Riquadro che raccoglie le righe; la legenda compare solo se c'è almeno una scala da leggere
export function ElencoDomande({
  domande,
  children,
}: {
  domande: DomandaRif[]
  children: ReactNode
}) {
  const scala = domande.find((d) => d.tipo_risposta === 'scala')
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-1">
      {scala && (
        <div className="flex items-center justify-end gap-1 pt-2 text-xs text-slate-500">
          <span className="mr-1">Risposte per valore:</span>
          {scala.scala_min ?? 1}
          {TONI.map((t) => (
            <span key={t} className="h-2.5 w-3" style={{ backgroundColor: t }} aria-hidden="true" />
          ))}
          {scala.scala_max ?? 5}
        </div>
      )}
      {children}
    </div>
  )
}
