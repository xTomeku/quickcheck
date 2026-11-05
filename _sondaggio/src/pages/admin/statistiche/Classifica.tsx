import { Fragment, useState, type ReactNode } from 'react'
import { formatta, SOGLIA_POCHE_RISPOSTE } from '../../../lib/statistiche'

export type VoceClassifica = {
  id: string
  nome: string
  dettaglio?: string
  n: number
  media: number | null
}

type Ordine = 'media' | 'n' | 'nome'

type Props = {
  voci: VoceClassifica[]
  nomeColonna: string
  etichettaN: string
  aperta: string | null
  onApri: (id: string | null) => void
  renderDettaglio: (id: string) => ReactNode
}

// Le voci con pochi dati non devono finire in cima solo perché una risposta isolata le premia o le punisce
function affidabilita(v: VoceClassifica) {
  if (v.n === 0) return 2
  return v.media === null || v.n < SOGLIA_POCHE_RISPOSTE ? 1 : 0
}

function ordina(voci: VoceClassifica[], ordine: Ordine, crescente: boolean) {
  const segno = crescente ? 1 : -1
  return [...voci].sort((a, b) => {
    const perNome = a.nome.localeCompare(b.nome)
    if (ordine === 'nome') return segno * perNome
    if (ordine === 'n') return segno * (a.n - b.n) || perNome
    return (
      affidabilita(a) - affidabilita(b) ||
      segno * ((a.media ?? 0) - (b.media ?? 0)) ||
      perNome
    )
  })
}

function Intestazione({
  nome,
  colonna,
  ordine,
  crescente,
  onOrdina,
  destra = false,
}: {
  nome: string
  colonna: Ordine
  ordine: Ordine
  crescente: boolean
  onOrdina: (colonna: Ordine) => void
  destra?: boolean
}) {
  const attiva = ordine === colonna
  return (
    <th
      scope="col"
      aria-sort={attiva ? (crescente ? 'ascending' : 'descending') : 'none'}
      className={`px-2 py-2 font-medium sm:px-3 ${destra ? 'text-right' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOrdina(colonna)}
        className={`min-h-6 whitespace-nowrap hover:text-grafite ${attiva ? 'font-bold text-grafite' : ''}`}
      >
        {nome}
        {attiva && <span aria-hidden="true"> {crescente ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}

// Il punto sulla linea da 1 a 5: una barra partirebbe da un valore che nessuno può dare sotto 1
function PosizioneMedia({ media, incerta }: { media: number; incerta: boolean }) {
  return (
    <span className="relative block h-0.5 bg-slate-300" aria-hidden="true">
      <span
        className={`absolute -top-1 -ml-[5px] size-2.5 rounded-full ring-2 ring-white ${
          incerta ? 'border-2 border-slate-400 bg-white' : 'bg-inchiostro'
        }`}
        style={{ left: `${((media - 1) / 4) * 100}%` }}
      />
    </span>
  )
}

export default function Classifica({
  voci,
  nomeColonna,
  etichettaN,
  aperta,
  onApri,
  renderDettaglio,
}: Props) {
  const [ordine, setOrdine] = useState<Ordine>('media')
  const [crescente, setCrescente] = useState(true)

  function onOrdina(colonna: Ordine) {
    if (colonna === ordine) {
      setCrescente(!crescente)
    } else {
      setOrdine(colonna)
      // I nomi si leggono dalla A, le compilazioni partono dalle più numerose, le medie dalle più basse
      setCrescente(colonna !== 'n')
    }
  }

  const comuni = { ordine, crescente, onOrdina }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600 sm:text-sm">
          <tr>
            <Intestazione {...comuni} nome={nomeColonna} colonna="nome" />
            <Intestazione {...comuni} nome={etichettaN} colonna="n" destra />
            <th scope="col" className="hidden w-44 px-3 py-2 font-medium sm:table-cell">
              <span className="flex justify-between text-xs font-normal">
                <span>1</span>
                <span>5</span>
              </span>
            </th>
            <Intestazione {...comuni} nome="Media" colonna="media" destra />
            <th scope="col" className="w-8">
              <span className="sr-only">Apri il dettaglio</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ordina(voci, ordine, crescente).map((v) => {
            const eAperta = aperta === v.id
            const poche = v.n > 0 && v.n < SOGLIA_POCHE_RISPOSTE
            const idDettaglio = `dettaglio-${v.id}`
            return (
              <Fragment key={v.id}>
                <tr
                  onClick={() => onApri(eAperta ? null : v.id)}
                  className={`cursor-pointer border-t border-slate-100 first:border-t-0 ${
                    eAperta ? 'bg-inchiostro-velo' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-2 py-2 sm:px-3">
                    {/* Il clic risale alla riga: il pulsante serve a chi usa la tastiera o uno screen reader */}
                    <button
                      type="button"
                      aria-expanded={eAperta}
                      aria-controls={eAperta ? idDettaglio : undefined}
                      className={`text-left ${v.n === 0 ? 'text-slate-500' : 'font-medium'}`}
                    >
                      {v.nome}
                    </button>
                    {poche && (
                      <span className="ml-2 inline-block rounded-full bg-giallo-velo px-2 py-0.5 text-xs">
                        Poche risposte
                      </span>
                    )}
                    {v.dettaglio && <p className="text-xs text-slate-500">{v.dettaglio}</p>}
                  </td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums sm:px-3 ${v.n === 0 ? 'text-pericolo-testo' : ''}`}
                  >
                    {v.n}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {v.media === null ? (
                      <span className="text-xs text-slate-500">
                        {v.n === 0 ? 'Nessuna risposta' : 'Nessuna scala'}
                      </span>
                    ) : (
                      <PosizioneMedia media={v.media} incerta={poche} />
                    )}
                  </td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums sm:px-3 ${poche ? 'text-slate-500' : 'font-semibold'}`}
                  >
                    {v.media === null ? '—' : formatta(v.media)}
                  </td>
                  <td className="pr-3 text-slate-500" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={eAperta ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
                    </svg>
                  </td>
                </tr>
                {eAperta && (
                  <tr id={idDettaglio}>
                    <td colSpan={5} className="border-t border-inchiostro/20 bg-inchiostro-velo/40 p-3 sm:p-4">
                      {renderDettaglio(v.id)}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Numero in evidenza in cima a un dettaglio
export function Tessera({ valore, etichetta }: { valore: ReactNode; etichetta: string }) {
  return (
    <div className="min-w-24 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-lg font-semibold tabular-nums">{valore}</p>
      <p className="text-xs text-slate-500">{etichetta}</p>
    </div>
  )
}
