import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PulsanteGoogle from '../../components/PulsanteGoogle'
import { IconaSpunta } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { DOMINIO_STUDENTI } from '../../lib/google'
import { chiamaServer } from '../../lib/server'
import { accessoValido, useStudente } from '../../lib/studente'
import { supabase } from '../../lib/supabase'
import type { StatoStudente } from '../../lib/useStatoStudente'

type Stato =
  | { tipo: 'caricamento' }
  | { tipo: 'errore' }
  | { tipo: 'chiuso' }
  | { tipo: 'aperto'; edizioneId: string; nomeEdizione: string }

function Pillola({ children }: { children: string }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full border border-udu/20 bg-white px-3 py-1.5 text-[13px] font-semibold text-udu-scuro">
      <IconaSpunta className="size-3.5 text-udu" />
      {children}
    </li>
  )
}

export default function Benvenuto() {
  const { bozza, aggiorna, azzera } = useBozza()
  const { accesso, esci } = useStudente()
  const connesso = accessoValido(accesso)
  const navigate = useNavigate()
  const [stato, setStato] = useState<Stato>({ tipo: 'caricamento' })
  const [preparo, setPreparo] = useState(false)
  const [errorePartenza, setErrorePartenza] = useState<string | null>(null)

  useEffect(() => {
    // Solo in sviluppo, con ?anteprima: finta edizione aperta per vedere la pagina senza toccare il database
    if (import.meta.env.DEV && window.location.search.includes('anteprima')) {
      setStato({ tipo: 'aperto', edizioneId: 'anteprima', nomeEdizione: 'Anteprima' })
      return
    }
    let annullato = false
    supabase
      .from('edizioni')
      .select('id, nome')
      .eq('aperta', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (annullato) return
        if (error) setStato({ tipo: 'errore' })
        else if (!data) setStato({ tipo: 'chiuso' })
        else setStato({ tipo: 'aperto', edizioneId: data.id, nomeEdizione: data.nome })
      })
    return () => {
      annullato = true
    }
  }, [])

  // Una bozza di un'edizione diversa da quella aperta non è più utilizzabile
  useEffect(() => {
    if (stato.tipo === 'aperto' && bozza.edizioneId && bozza.edizioneId !== stato.edizioneId) {
      azzera()
    }
  }, [stato, bozza.edizioneId, azzera])

  if (stato.tipo === 'caricamento') {
    return <p className="text-slate-500">Caricamento…</p>
  }

  if (stato.tipo === 'errore') {
    return <Avviso>Non riesco a collegarmi al sondaggio. Riprova tra qualche minuto.</Avviso>
  }

  if (stato.tipo === 'chiuso') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight">Sondaggio non aperto</h1>
        <p className="mt-2 text-slate-600">
          Il sondaggio non è al momento aperto. [Quando riapre o a chi rivolgersi]
        </p>
      </div>
    )
  }

  const edizioneId = stato.edizioneId
  const inCorso = bozza.edizioneId === edizioneId && bozza.corsoId !== null

  // Chi ha già inviato in questa edizione ha corso e anno fissati dal primo invio: si riprendono
  // dal server (valgono anche su un altro dispositivo) e si va dritti alle materie
  async function parti(daCapo: boolean) {
    if (!accesso) return
    setPreparo(true)
    setErrorePartenza(null)
    const esito = await chiamaServer<StatoStudente>('stato', accesso.idToken, edizioneId)
    setPreparo(false)
    if (!esito.ok) {
      setErrorePartenza(esito.errore)
      return
    }
    const scelta = esito.dati.scelta ?? null
    if (daCapo) azzera()
    aggiorna((b) => {
      const base = b.edizioneId === edizioneId ? b : { ...b, edizioneId }
      if (!scelta) return { ...base, corsoBloccato: false }
      const stessi = base.corsoId === scelta.corso_id && base.anno === scelta.anno
      return stessi
        ? { ...base, corsoBloccato: true }
        : {
            ...base,
            corsoId: scelta.corso_id,
            anno: scelta.anno,
            corsoBloccato: true,
            materieScelte: [],
            risposte: {},
            saltati: {},
          }
    })
    navigate(scelta ? '/materie' : '/corso')
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="inline-block rounded-full bg-udu-velo px-3 py-1 text-xs font-bold text-udu">
          {stato.nomeEdizione}
        </span>
        <h1 className="mt-3 text-[32px] leading-[1.1] font-extrabold tracking-tight">
          Dì la tua su corsi e docenti
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Pochi minuti per raccontare com'è andata, materia per materia. Le risposte sono anonime.
        </p>

        {connesso && accesso ? (
          <div className="mt-6">
            <div className="flex items-center gap-3 rounded-xl bg-udu-velo px-3.5 py-3">
              <span className="grid size-8 flex-none place-items-center rounded-full bg-udu text-white">
                <IconaSpunta className="size-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{accesso.email}</p>
              <button
                type="button"
                onClick={esci}
                className="px-1.5 py-1.5 text-sm font-semibold text-udu underline"
              >
                Esci
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <Pulsante
                grande
                variante="primario"
                className="w-full"
                disabled={preparo}
                onClick={() => parti(false)}
              >
                {preparo ? 'Un attimo…' : inCorso ? 'Riprendi da dove eri rimasto' : 'Inizia'}
              </Pulsante>
              {inCorso && (
                <Pulsante grande className="w-full" disabled={preparo} onClick={() => parti(true)}>
                  Ricomincia da capo
                </Pulsante>
              )}
              {errorePartenza && <Avviso>{errorePartenza}</Avviso>}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <p className="mb-3 text-[15px] font-bold">Per cominciare, accedi con l'account dell'università</p>
            <PulsanteGoogle />
            <p className="mt-3 text-sm text-slate-600">
              Con l'account @{DOMINIO_STUDENTI}. Serve solo a evitare che una persona compili due
              volte: il tuo indirizzo non viene salvato.
            </p>
            {inCorso && (
              <p className="mt-2 text-sm text-slate-600">
                Hai una bozza su questo dispositivo: dopo l'accesso la puoi riprendere.
              </p>
            )}
          </div>
        )}
      </section>

      <ul className="flex flex-wrap gap-2">
        <Pillola>Anonimo</Pillola>
        <Pillola>Scegli tu le materie</Pillola>
        <Pillola>Modifichi fino all'invio</Pillola>
      </ul>

      <p className="text-sm text-slate-500">
        [Durata stimata: X minuti] [Chi promuove il sondaggio e come verranno usati i risultati]
      </p>
    </div>
  )
}
