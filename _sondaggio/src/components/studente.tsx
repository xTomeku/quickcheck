import type { ReactNode } from 'react'

// Pezzi di grafica comuni alle schermate dello studente: rosso e bianco di Udu, giallo solo per l'attenzione.

type PropsIcona = { className?: string }

export function IconaSpunta({ className = 'size-5' }: PropsIcona) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function IconaAttenzione({ className = 'size-5' }: PropsIcona) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 8v5M12 16.5h.01" />
      <path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  )
}

// Messaggio di attenzione (giallo): per ciò che manca, senza usare il rosso del marchio
export function AvvisoAttenzione({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex gap-2.5 rounded-xl border border-udu-giallo bg-giallo-velo p-3.5 text-[15px] font-medium text-grafite"
    >
      <IconaAttenzione className="mt-0.5 size-5 flex-none text-[#8a6500]" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

// Una scelta a scheda, larga quanto la colonna: il bordo rosso e la spunta dicono qual è quella scelta
export function Scelta({
  scelta,
  onClick,
  children,
  className = '',
}: {
  scelta: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={scelta}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-semibold transition-colors ${
        scelta ? 'border-udu bg-udu-velo text-udu-scuro' : 'border-slate-300 bg-white hover:border-slate-400'
      } ${className}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span
        aria-hidden="true"
        className={`grid size-6 flex-none place-items-center rounded-full ${
          scelta ? 'bg-udu text-white' : 'border-2 border-slate-300'
        }`}
      >
        {scelta && <IconaSpunta className="size-3.5" />}
      </span>
    </button>
  )
}

// Barra con i pulsanti del passo, sempre in basso: su telefono si raggiungono col pollice
export function BarraAzioni({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="flex gap-3">{children}</div>
    </div>
  )
}

const PASSI = ['Corso', 'Materie', 'Domande', 'Riepilogo']

// Indicatore dei passi nell'intestazione. `corrente` va da 1 a 4.
export function Passi({ corrente }: { corrente: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Avanzamento">
      {PASSI.map((nome, i) => {
        const numero = i + 1
        const fatto = numero < corrente
        const attivo = numero === corrente
        return (
          <li
            key={nome}
            aria-current={attivo ? 'step' : undefined}
            className="flex items-center gap-1.5"
          >
            <span
              className={`grid size-6 flex-none place-items-center rounded-full text-xs font-bold ${
                attivo
                  ? 'bg-white text-udu'
                  : fatto
                    ? 'bg-white/90 text-udu'
                    : 'border border-white/50 text-white/80'
              }`}
            >
              {fatto ? <IconaSpunta className="size-3.5" /> : numero}
            </span>
            <span
              className={`text-[13px] font-semibold ${attivo ? 'text-white' : 'hidden text-white/80 sm:inline'}`}
            >
              {nome}
            </span>
            {numero < PASSI.length && (
              <span aria-hidden="true" className="h-px w-3 flex-none bg-white/40 sm:w-5" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// Avanzamento fra le materie: un segmento per materia (fatte piene, corrente col bordo)
export function Segmenti({ totale, corrente }: { totale: number; corrente: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={totale}
      aria-valuenow={corrente}
      aria-label="Materie compilate"
      className="flex gap-1.5"
    >
      {Array.from({ length: totale }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 rounded-full ${
            i < corrente ? 'bg-udu' : i === corrente ? 'bg-udu/35' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}
