import { useEffect, useId, useRef, useState } from 'react'
import { normalizza } from '../lib/nomi'

// `dettaglio`: seconda riga facoltativa sotto il nome (per distinguere voci con lo stesso nome);
// anche le sue parole valgono nella ricerca
export type VoceCombo = { id: string; etichetta: string; dettaglio?: string }

type Props = {
  voci: VoceCombo[]
  // id della voce scelta, oppure '' se nessuna
  valore: string
  onScegli: (id: string) => void
  segnaposto: string
  ariaLabel: string
}

// Menu di selezione con ricerca: si scrive per restringere l'elenco (anche solo parte del nome, in qualsiasi
// ordine, senza badare a maiuscole e accenti) e si sceglie con il mouse o con le frecce e Invio.
export default function ComboRicerca({ voci, valore, onScegli, segnaposto, ariaLabel }: Props) {
  const idElenco = useId()
  const radice = useRef<HTMLDivElement>(null)
  const elenco = useRef<HTMLUListElement>(null)
  const [aperto, setAperto] = useState(false)
  const [ricerca, setRicerca] = useState('')
  const [evidenziata, setEvidenziata] = useState(0)

  const scelta = voci.find((v) => v.id === valore)
  const parole = normalizza(ricerca).split(' ').filter(Boolean)
  const visibili = voci.filter((v) => {
    const testo = normalizza(`${v.etichetta} ${v.dettaglio ?? ''}`)
    return parole.every((p) => testo.includes(p))
  })

  // La voce evidenziata resta sempre in vista scorrendo con le frecce
  useEffect(() => {
    if (!aperto) return
    elenco.current?.children[evidenziata]?.scrollIntoView({ block: 'nearest' })
  }, [evidenziata, aperto])

  function chiudi() {
    setAperto(false)
    setRicerca('')
  }

  function scegli(id: string) {
    onScegli(id)
    chiudi()
  }

  function suTasto(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAperto(true)
      setEvidenziata((i) => Math.min(i + 1, Math.max(visibili.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setEvidenziata((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && aperto) {
      // Invio sceglie la voce evidenziata e non invia il modulo che contiene il menu
      e.preventDefault()
      if (visibili[evidenziata]) scegli(visibili[evidenziata].id)
    } else if (e.key === 'Escape' && aperto) {
      e.preventDefault()
      chiudi()
    }
  }

  return (
    <div
      ref={radice}
      className="relative"
      onBlur={(e) => {
        // Si chiude solo quando il focus esce davvero dal menu
        if (!radice.current?.contains(e.relatedTarget as Node | null)) chiudi()
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={aperto}
        aria-controls={idElenco}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={segnaposto}
        value={aperto ? ricerca : (scelta?.etichetta ?? '')}
        onFocus={() => {
          setAperto(true)
          setEvidenziata(0)
        }}
        onClick={() => setAperto(true)}
        onChange={(e) => {
          setAperto(true)
          setRicerca(e.target.value)
          setEvidenziata(0)
        }}
        onKeyDown={suTasto}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-3 focus:border-inchiostro"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>

      {aperto && (
        <ul
          ref={elenco}
          id={idElenco}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-300 bg-white py-1 shadow-lg"
        >
          {visibili.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Nessun risultato</li>
          ) : (
            visibili.map((v, i) => (
              <li
                key={v.id}
                role="option"
                aria-selected={v.id === valore}
                // mouseDown e non click: così il campo non perde il focus prima della scelta
                onMouseDown={(e) => {
                  e.preventDefault()
                  scegli(v.id)
                }}
                onMouseEnter={() => setEvidenziata(i)}
                className={`cursor-pointer px-3 py-2 ${
                  i === evidenziata ? 'bg-udu-velo text-udu-scuro' : ''
                } ${v.id === valore ? 'font-semibold' : ''}`}
              >
                {v.etichetta}
                {v.dettaglio && (
                  <span className="block text-xs font-normal text-slate-500">{v.dettaglio}</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
