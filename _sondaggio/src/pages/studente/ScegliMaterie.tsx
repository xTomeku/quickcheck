import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PulsanteGoogle from '../../components/PulsanteGoogle'
import { BarraAzioni, IconaSpunta } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { chiamaServer } from '../../lib/server'
import { costruisciStruttura, haDomande, type MateriaDati } from '../../lib/sondaggio'
import { useStudente } from '../../lib/studente'
import { supabase } from '../../lib/supabase'
import { useDomandeAttive, useMaterieCorso } from '../../lib/useDatiSondaggio'
import { useElenco } from '../../lib/useElenco'

export default function ScegliMaterie() {
  const { bozza } = useBozza()
  if (!bozza.corsoId) return <Navigate to="/corso" replace />
  if (bozza.anno === null) return <Navigate to="/anno" replace />
  return <Contenuto corsoId={bozza.corsoId} anno={bozza.anno} />
}

function Contenuto({ corsoId, anno }: { corsoId: string; anno: number | 'fuori_corso' }) {
  const { bozza, aggiorna } = useBozza()
  const navigate = useNavigate()
  const { materie, errore } = useMaterieCorso({ corsoId })
  const { domande, errore: erroreDomande } = useDomandeAttive()
  const corso = useElenco<{ id: string; durata_anni: number }>(
    () => supabase.from('corsi_di_laurea').select('id, durata_anni').eq('id', corsoId),
    corsoId,
  )

  // Le materie che questa persona ha già compilato in questa edizione: non si rifanno
  const { accesso } = useStudente()
  const [compilate, setCompilate] = useState<Set<string> | null>(null)
  const [erroreStato, setErroreStato] = useState<{ stato: number; errore: string } | null>(null)
  const edizioneId = bozza.edizioneId
  const idToken = accesso?.idToken
  useEffect(() => {
    if (!edizioneId || !idToken) return
    let annullato = false
    chiamaServer<{ compilate: string[] }>('stato', idToken, edizioneId).then((esito) => {
      if (annullato) return
      if (esito.ok) {
        setErroreStato(null)
        setCompilate(new Set(esito.dati.compilate))
      } else {
        setErroreStato({ stato: esito.stato, errore: esito.errore })
      }
    })
    return () => {
      annullato = true
    }
  }, [edizioneId, idToken])

  if (erroreStato) {
    return (
      <div className="space-y-4">
        <Avviso>{erroreStato.errore}</Avviso>
        {erroreStato.stato === 401 || erroreStato.stato === 403 ? (
          <PulsanteGoogle />
        ) : (
          <Pulsante onClick={() => window.location.reload()}>Riprova</Pulsante>
        )}
      </div>
    )
  }

  if (materie === null || domande === null || corso.righe === null || compilate === null) {
    return (
      <div className="space-y-4">
        {(errore || erroreDomande || corso.errore) && (
          <Avviso>Non riesco a caricare le materie. Riprova tra qualche minuto.</Avviso>
        )}
        <p className="text-slate-500">Caricamento…</p>
      </div>
    )
  }

  const durata = corso.righe[0]?.durata_anni ?? 3
  // Tutti gli anni fino a quello dello studente (i fuori corso vedono l'intero corso)
  const ultimoAnno = anno === 'fuori_corso' ? durata : anno
  const anniVisibili = Array.from({ length: ultimoAnno }, (_, i) => i + 1)

  const giaFatta = (m: MateriaDati) => compilate.has(m.materiaCorsoId)
  const selezionabile = (m: MateriaDati) =>
    haDomande(costruisciStruttura(m, domande)) && !giaFatta(m)
  const visibili = materie.filter((m) => anniVisibili.includes(m.anno))
  const scelte = new Set(bozza.materieScelte)
  const nScelte = visibili.filter((m) => scelte.has(m.materiaCorsoId) && selezionabile(m)).length

  function alterna(id: string) {
    aggiorna((b) => ({
      ...b,
      materieScelte: b.materieScelte.includes(id)
        ? b.materieScelte.filter((x) => x !== id)
        : [...b.materieScelte, id],
    }))
  }

  function alternaTutte(delloAnno: MateriaDati[]) {
    const ids = delloAnno.filter(selezionabile).map((m) => m.materiaCorsoId)
    const tutte = ids.every((id) => scelte.has(id))
    aggiorna((b) => ({
      ...b,
      materieScelte: tutte
        ? b.materieScelte.filter((x) => !ids.includes(x))
        : [...b.materieScelte, ...ids.filter((id) => !b.materieScelte.includes(id))],
    }))
  }

  function continua() {
    const valide = visibili
      .filter(selezionabile)
      .map((m) => m.materiaCorsoId)
      .filter((id) => scelte.has(id))
    // Si compilano nell'ordine in cui sono state scelte
    aggiorna((b) => ({
      ...b,
      materieScelte: b.materieScelte.filter((id) => valide.includes(id)),
    }))
    navigate('/compila/0')
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">A quali materie vuoi rispondere?</h1>
        <p className="mt-1 text-slate-600">
          Scegli quelle che hai seguito e di cui vuoi parlare: non devi rispondere a tutte.
        </p>
      </div>

      {visibili.length === 0 ? (
        <Avviso tipo="info">
          Le materie di questo corso non sono ancora disponibili. Riprova più tardi.
        </Avviso>
      ) : (
        anniVisibili.map((a) => {
          const delloAnno = visibili.filter((m) => m.anno === a)
          if (delloAnno.length === 0) return null
          const abilitate = delloAnno.filter(selezionabile)
          const tutte = abilitate.length > 0 && abilitate.every((m) => scelte.has(m.materiaCorsoId))
          return (
            <section key={a} aria-labelledby={`anno-${a}`} className="space-y-2.5">
              <div className="flex items-end justify-between">
                <h2 id={`anno-${a}`} className="text-sm font-bold tracking-wide text-udu uppercase">
                  {a}° anno
                </h2>
                {abilitate.length > 1 && (
                  <button
                    type="button"
                    onClick={() => alternaTutte(delloAnno)}
                    className="px-1 py-2 text-sm font-semibold text-udu underline"
                  >
                    {tutte ? 'Deseleziona tutte' : 'Seleziona tutte'}
                  </button>
                )}
              </div>
              <ul className="space-y-2.5">
                {delloAnno.map((m) => {
                  const fatta = giaFatta(m)
                  const ok = selezionabile(m)
                  const scelta = ok && scelte.has(m.materiaCorsoId)
                  return (
                    <li key={m.materiaCorsoId}>
                      <label
                        className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                          scelta
                            ? 'border-udu bg-udu-velo'
                            : ok
                              ? 'cursor-pointer border-slate-300 bg-white hover:border-slate-400'
                              : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          disabled={!ok}
                          checked={scelta}
                          onChange={() => alterna(m.materiaCorsoId)}
                        />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 grid size-6 flex-none place-items-center rounded-md border-2 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-inchiostro ${
                            scelta
                              ? 'border-udu bg-udu text-white'
                              : fatta
                                ? 'border-udu bg-white text-udu'
                                : ok
                                  ? 'border-slate-400 bg-white'
                                  : 'border-slate-300 bg-slate-100'
                          }`}
                        >
                          {(scelta || fatta) && <IconaSpunta className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-bold">
                            {m.nome}
                            {m.cfu !== null && (
                              <span className="font-medium text-slate-500"> · {m.cfu} CFU</span>
                            )}
                          </span>
                          {fatta ? (
                            <span className="mt-1 block text-sm text-slate-700">
                              <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-udu-velo px-2.5 py-0.5 text-xs font-bold text-udu">
                                <IconaSpunta className="size-3" />
                                Già inviata
                              </span>
                              Hai già risposto per questa materia.
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-sm text-slate-600">
                              {ok
                                ? m.insegnamenti.length === 0
                                  ? 'Nessun docente indicato'
                                  : m.insegnamenti
                                      .map((i) => `${i.docente.cognome} ${i.docente.nome}`)
                                      .join(', ')
                                : 'Nessuna domanda disponibile'}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}

      <BarraAzioni>
        <Pulsante grande onClick={() => navigate('/anno')}>
          Indietro
        </Pulsante>
        <Pulsante
          grande
          variante="primario"
          className="flex-1"
          disabled={nScelte === 0}
          onClick={continua}
        >
          Continua{nScelte > 0 ? ` (${nScelte})` : ''}
        </Pulsante>
      </BarraAzioni>
    </div>
  )
}
