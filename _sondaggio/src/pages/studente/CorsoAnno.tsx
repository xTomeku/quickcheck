import { Navigate, useNavigate } from 'react-router-dom'
import { BarraAzioni, Scelta } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { supabase } from '../../lib/supabase'
import { nomeLeggibile } from '../../lib/testo'
import { useElenco } from '../../lib/useElenco'

type Corso = { id: string; nome: string; durata_anni: number }

// Primo passo: il corso di laurea. L'anno si sceglie nella pagina successiva (Anno.tsx)
export default function CorsoAnno() {
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

  // Dopo il primo invio dell'edizione il corso non si cambia più
  if (bozza.corsoBloccato) return <Navigate to="/materie" replace />

  const corso = righe?.find((c) => c.id === bozza.corsoId)

  function scegliCorso(id: string) {
    aggiorna((b) =>
      b.corsoId === id
        ? b
        : { ...b, corsoId: id, anno: null, materieScelte: [], risposte: {}, saltati: {} },
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Il tuo corso</h1>
        <p className="mt-1 text-slate-600">Scegli il corso di laurea che frequenti.</p>
      </div>

      {errore && <Avviso>{errore}</Avviso>}

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : righe.length === 0 ? (
        <Avviso tipo="info">Nessun corso disponibile al momento.</Avviso>
      ) : (
        <section aria-labelledby="titolo-corso" className="space-y-3">
          <h2 id="titolo-corso" className="sr-only">
            Corso di laurea
          </h2>
          <div className="space-y-2.5">
            {righe.map((c) => (
              <Scelta key={c.id} scelta={bozza.corsoId === c.id} onClick={() => scegliCorso(c.id)}>
                {nomeLeggibile(c.nome)}
              </Scelta>
            ))}
          </div>
        </section>
      )}

      <BarraAzioni>
        <Pulsante grande onClick={() => navigate('/')}>
          Indietro
        </Pulsante>
        <Pulsante
          grande
          variante="primario"
          className="flex-1"
          disabled={!corso}
          onClick={() => navigate('/anno')}
        >
          Continua
        </Pulsante>
      </BarraAzioni>
    </div>
  )
}
