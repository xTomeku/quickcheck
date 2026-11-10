import { useState } from 'react'
import { Avviso, Input, Pulsante } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import type { DomandaRif } from './dati'

export type VoceScritta = { id: string; testo: string; nascosta: boolean; etichetta?: string }

// Senza raggruppamento, oltre questo numero le risposte si aprono a richiesta
const PRIME = 5
// Con più gruppi di questi, si parte con tutti chiusi: si apre solo quello che interessa
const GRUPPI_APERTI_DI_PARTENZA = 2

const risposte = (n: number) => `${n} ${n === 1 ? 'risposta' : 'risposte'}`

// Le risposte scritte a una domanda. Se arrivano da più materie o docenti si raggruppano per
// etichetta (con il numero di risposte) e si possono cercare per parola. Chi può modificare le
// nasconde (per esempio se contengono nomi o offese): restano nel database ma non si mostrano e
// non finiscono nelle esportazioni.
export default function RisposteScritte({
  domanda,
  voci,
  onCambiato,
}: {
  domanda: DomandaRif
  voci: VoceScritta[]
  onCambiato: () => void
}) {
  const { ruolo } = useAuth()
  const puoNascondere = ruolo === 'admin' || ruolo === 'editor'
  const [tutte, setTutte] = useState(false)
  const [cerca, setCerca] = useState('')
  const [aperti, setAperti] = useState<Record<string, boolean>>({})
  const [errore, setErrore] = useState<string | null>(null)

  const nascoste = voci.filter((v) => v.nascosta).length
  const parola = cerca.trim().toLowerCase()
  const filtrate = parola
    ? voci.filter(
        (v) => v.testo.toLowerCase().includes(parola) || (v.etichetta ?? '').toLowerCase().includes(parola),
      )
    : voci

  // Il raggruppamento dipende da tutte le risposte, non da quelle filtrate, così la pagina non cambia forma cercando
  const raggruppa = new Set(voci.map((v) => v.etichetta ?? '')).size > 1
  const gruppi = new Map<string, VoceScritta[]>()
  if (raggruppa) {
    for (const v of filtrate) {
      const chiave = v.etichetta || 'Senza indicazione'
      gruppi.set(chiave, [...(gruppi.get(chiave) ?? []), v])
    }
  }
  const elencoGruppi = [...gruppi].sort(
    ([na, a], [nb, b]) => b.length - a.length || na.localeCompare(nb, 'it'),
  )
  const apertoDiPartenza = parola !== '' || elencoGruppi.length <= GRUPPI_APERTI_DI_PARTENZA
  const eAperto = (g: string) => aperti[g] ?? apertoDiPartenza
  const impostaTutti = (valore: boolean) =>
    setAperti(Object.fromEntries(elencoGruppi.map(([g]) => [g, valore])))

  async function nascondi(id: string, nascosta: boolean) {
    const { error } = await supabase.rpc('nascondi_risposta', { p_id: id, p_nascosta: nascosta })
    setErrore(error ? messaggioErrore(error) : null)
    onCambiato()
  }

  function voce(v: VoceScritta, mostraEtichetta: boolean) {
    return (
      <li
        key={v.id}
        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
          v.nascosta ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200'
        }`}
      >
        <div className="min-w-0 flex-1">
          {mostraEtichetta && v.etichetta && <p className="text-xs text-slate-500">{v.etichetta}</p>}
          <p className="break-words whitespace-pre-wrap">
            {v.nascosta && <span className="mr-2 font-semibold">[Nascosta]</span>}
            {v.testo}
          </p>
        </div>
        {puoNascondere && (
          <Pulsante onClick={() => nascondi(v.id, !v.nascosta)}>
            {v.nascosta ? 'Mostra' : 'Nascondi'}
          </Pulsante>
        )}
      </li>
    )
  }

  const mostrate = tutte ? filtrate : filtrate.slice(0, PRIME)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold">{domanda.testo}</p>
      <p className="text-xs text-slate-500">
        {voci.length === 0
          ? 'Nessuna risposta scritta'
          : `${risposte(voci.length)} scritt${voci.length === 1 ? 'a' : 'e'}${
              raggruppa ? ` · da ${new Set(voci.map((v) => v.etichetta ?? '')).size} gruppi` : ''
            }${nascoste > 0 ? ` · ${nascoste} ${nascoste === 1 ? 'nascosta' : 'nascoste'}` : ''}`}
      </p>
      {errore && (
        <div className="mt-2">
          <Avviso>{errore}</Avviso>
        </div>
      )}

      {voci.length > PRIME && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1">
            <Input
              type="search"
              aria-label="Cerca nelle risposte"
              placeholder="Cerca una parola nelle risposte"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
            />
          </div>
          {raggruppa && elencoGruppi.length > 1 && (
            <>
              <Pulsante variante="testo" onClick={() => impostaTutti(true)}>
                Apri tutti
              </Pulsante>
              <Pulsante variante="testo" onClick={() => impostaTutti(false)}>
                Chiudi tutti
              </Pulsante>
            </>
          )}
        </div>
      )}
      {parola && (
        <p className="mt-2 text-xs text-slate-500">
          {filtrate.length === 0 ? 'Nessuna risposta contiene' : `${risposte(filtrate.length)} contengono`}{' '}
          «{cerca.trim()}»
        </p>
      )}

      {raggruppa ? (
        <div className="mt-3 space-y-2">
          {elencoGruppi.map(([gruppo, lista]) => {
            const aperto = eAperto(gruppo)
            return (
              <section key={gruppo} className="overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  aria-expanded={aperto}
                  onClick={() => setAperti({ ...aperti, [gruppo]: !aperto })}
                  className="flex min-h-11 w-full items-center gap-3 bg-slate-50 px-3 text-left hover:bg-inchiostro-velo"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`flex-none transition-transform ${aperto ? 'rotate-90' : ''}`}
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{gruppo}</span>
                  <span className="flex-none rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {lista.length}
                  </span>
                </button>
                {aperto && (
                  <ul className="space-y-2 p-3">
                    {lista.map((v) => voce(v, false))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          {filtrate.length > 0 && (
            <ul className="mt-3 space-y-2">
              {mostrate.map((v) => voce(v, true))}
            </ul>
          )}
          {filtrate.length > PRIME && (
            <Pulsante variante="testo" className="mt-2" onClick={() => setTutte(!tutte)}>
              {tutte ? 'Mostra meno' : `Mostra tutte (${filtrate.length})`}
            </Pulsante>
          )}
        </>
      )}
    </div>
  )
}
