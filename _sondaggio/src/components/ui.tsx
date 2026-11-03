import { useEffect, useRef } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

// Anello dei pannelli che si aprono per modificare o aggiungere (stesso delle righe aperte di corsi e materie)
export const ANELLO_APERTO = 'ring-2 ring-inchiostro shadow-lg'

// Quando un modulo si apre lo porta in vista e mette il cursore sul primo campo
export function useAlApertura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')?.focus({
      preventScroll: true,
    })
  }, [])
  return ref
}

export function Campo({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {etichetta}
      <span className="mt-1 block font-normal">{children}</span>
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-inchiostro ${props.className ?? ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-inchiostro ${props.className ?? ''}`}
    />
  )
}

// primario: l'azione principale della schermata (rosso Udu), una per volta
// secondario: azioni di routine; attivo: il pulsante che ha aperto un pannello; testo: azioni di contorno (Annulla); pericolo: azioni che tolgono
type Variante = 'primario' | 'secondario' | 'attivo' | 'testo' | 'pericolo'

const STILI: Record<Variante, string> = {
  primario: 'bg-udu text-white shadow-sm hover:bg-udu-scuro',
  secondario: 'border border-slate-300 bg-white hover:border-inchiostro hover:bg-inchiostro-velo',
  attivo: 'border border-inchiostro bg-inchiostro-velo font-bold text-inchiostro-scuro',
  testo: 'text-slate-600 hover:bg-slate-100 hover:text-grafite',
  pericolo:
    'border border-pericolo/40 text-pericolo-testo hover:border-pericolo hover:bg-pericolo-velo',
}

export function Pulsante({
  variante = 'secondario',
  grande = false,
  className = '',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean }) {
  const misura = grande ? 'px-5 py-3 text-base' : 'min-h-11 px-4 py-2 text-sm'
  return (
    <button
      type="button"
      {...resto}
      className={`rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${misura} ${STILI[variante]} ${className}`}
    />
  )
}

// Gruppo di pulsanti di una riga o di un modulo: allineato a destra, a capo su schermi stretti.
// Ordine consigliato: azione principale, azioni di routine, poi quelle che tolgono.
export function Azioni({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-2 sm:ml-auto ${className}`}>{children}</div>
}

// Intestazione di una sezione: titolo a sinistra e, a destra, l'unica azione principale (es. «Nuovo corso»)
export function TestataSezione({
  titolo,
  aiuto,
  children,
}: {
  titolo: string
  aiuto?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">{titolo}</h2>
        {aiuto && <p className="mt-0.5 text-sm text-slate-500">{aiuto}</p>}
      </div>
      {children}
    </div>
  )
}

// Etichetta di stato di una riga: Attivo / Disattivato (femminile per le materie)
export function StatoPill({ attivo, femminile = false }: { attivo: boolean; femminile?: boolean }) {
  const o = femminile ? 'a' : 'o'
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
        attivo ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
      }`}
    >
      {attivo ? `Attiv${o}` : `Disattivat${o}`}
    </span>
  )
}

// Schede (tab) con filo rosso sotto quella attiva
export function Schede<T extends string>({
  schede,
  attiva,
  onCambia,
}: {
  schede: readonly { id: T; nome: string }[]
  attiva: T
  onCambia: (id: T) => void
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-x-1 border-b border-slate-200">
      {schede.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={attiva === s.id}
          onClick={() => onCambia(s.id)}
          className={`-mb-px border-b-[3px] px-4 py-2.5 text-sm font-semibold transition-colors ${
            attiva === s.id
              ? 'border-udu text-udu'
              : 'border-transparent text-slate-600 hover:border-udu-giallo hover:text-grafite'
          }`}
        >
          {s.nome}
        </button>
      ))}
    </div>
  )
}

export function Avviso({
  tipo = 'errore',
  children,
}: {
  tipo?: 'errore' | 'info'
  children: ReactNode
}) {
  const stile =
    tipo === 'errore'
      ? 'border border-pericolo/30 bg-pericolo-velo text-pericolo-testo'
      : 'bg-inchiostro-velo text-slate-700'
  return (
    <p
      role={tipo === 'errore' ? 'alert' : 'status'}
      className={`flex gap-2 rounded-lg p-3 text-sm ${stile}`}
    >
      {tipo === 'errore' && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-px flex-none"
        >
          <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      )}
      <span className="min-w-0">{children}</span>
    </p>
  )
}
