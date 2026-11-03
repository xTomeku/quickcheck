import { Navigate, useNavigate } from 'react-router-dom'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { costruisciStruttura, haDomande, type MateriaDati } from '../../lib/sondaggio'
import { supabase } from '../../lib/supabase'
import { useDomandeAttive, useMaterieCorso } from '../../lib/useDatiSondaggio'
import { useElenco } from '../../lib/useElenco'

export default function ScegliMaterie() {
  const { bozza } = useBozza()
  if (!bozza.corsoId || bozza.anno === null) return <Navigate to="/corso" replace />
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

  if (materie === null || domande === null || corso.righe === null) {
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
  const anniVisibili =
    anno === 'fuori_corso'
      ? Array.from({ length: durata }, (_, i) => i + 1)
      : [anno - 1, anno].filter((a) => a >= 1)

  const selezionabile = (m: MateriaDati) => haDomande(costruisciStruttura(m, domande))
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">A quali materie vuoi rispondere?</h1>
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
            <section key={a} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold">{a}° anno</h2>
                {abilitate.length > 1 && (
                  <button
                    type="button"
                    onClick={() => alternaTutte(delloAnno)}
                    className="text-sm text-slate-600 underline"
                  >
                    {tutte ? 'Deseleziona tutte' : 'Seleziona tutte'}
                  </button>
                )}
              </div>
              <ul className="divide-y divide-slate-100">
                {delloAnno.map((m) => {
                  const ok = selezionabile(m)
                  return (
                    <li key={m.materiaCorsoId}>
                      <label
                        className={`flex items-start gap-3 px-4 py-3 ${
                          ok ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-5"
                          disabled={!ok}
                          checked={ok && scelte.has(m.materiaCorsoId)}
                          onChange={() => alterna(m.materiaCorsoId)}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {m.nome}
                            {m.cfu !== null && (
                              <span className="font-normal text-slate-500"> · {m.cfu} CFU</span>
                            )}
                          </span>
                          <span className="block text-sm text-slate-500">
                            {ok
                              ? m.insegnamenti.length === 0
                                ? 'Nessun docente indicato'
                                : m.insegnamenti
                                    .map((i) => `${i.docente.cognome} ${i.docente.nome}`)
                                    .join(', ')
                              : 'Nessuna domanda disponibile'}
                          </span>
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

      <div className="flex gap-3">
        <Pulsante grande onClick={() => navigate('/corso')}>
          Indietro
        </Pulsante>
        <Pulsante grande variante="primario" disabled={nScelte === 0} onClick={continua}>
          Continua{nScelte > 0 ? ` (${nScelte})` : ''}
        </Pulsante>
      </div>
    </div>
  )
}
