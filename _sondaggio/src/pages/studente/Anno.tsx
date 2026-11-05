import { Navigate, useNavigate } from 'react-router-dom'
import { BarraAzioni, Scelta } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { supabase } from '../../lib/supabase'
import { nomeLeggibile } from '../../lib/testo'
import { useElenco } from '../../lib/useElenco'

type Corso = { id: string; nome: string; durata_anni: number }

// Secondo passo: l'anno, su una pagina a parte così non si perde sotto l'elenco dei corsi
export default function Anno() {
  const { bozza, aggiorna } = useBozza()
  const navigate = useNavigate()
  const { righe, errore } = useElenco<Corso>(
    () =>
      supabase
        .from('corsi_di_laurea')
        .select('id, nome, durata_anni')
        .eq('attivo', true)
        .order('nome'),
    'corsi',
  )

  if (!bozza.corsoId) return <Navigate to="/corso" replace />

  const corso = righe?.find((c) => c.id === bozza.corsoId)
  const anni = corso ? Array.from({ length: corso.durata_anni }, (_, i) => i + 1) : []

  function scegliAnno(anno: number | 'fuori_corso') {
    aggiorna((b) => (b.anno === anno ? b : { ...b, anno, materieScelte: [] }))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">In che anno sei?</h1>
        {corso && (
          <p className="mt-1 text-slate-600">
            {nomeLeggibile(corso.nome)}.{' '}
            <button
              type="button"
              onClick={() => navigate('/corso')}
              className="font-semibold text-udu underline"
            >
              Cambia corso
            </button>
          </p>
        )}
      </div>

      {errore && <Avviso>{errore}</Avviso>}

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : !corso ? (
        <Navigate to="/corso" replace />
      ) : (
        <section aria-label="Anno di corso" className="grid grid-cols-2 gap-2.5">
          {anni.map((a) => (
            <Scelta key={a} scelta={bozza.anno === a} onClick={() => scegliAnno(a)}>
              {a}° anno
            </Scelta>
          ))}
          <Scelta
            scelta={bozza.anno === 'fuori_corso'}
            onClick={() => scegliAnno('fuori_corso')}
            className={anni.length % 2 === 0 ? 'col-span-2' : ''}
          >
            Fuori corso
          </Scelta>
        </section>
      )}

      <BarraAzioni>
        <Pulsante grande onClick={() => navigate('/corso')}>
          Indietro
        </Pulsante>
        <Pulsante
          grande
          variante="primario"
          className="flex-1"
          disabled={!corso || bozza.anno === null}
          onClick={() => navigate('/materie')}
        >
          Continua
        </Pulsante>
      </BarraAzioni>
    </div>
  )
}
