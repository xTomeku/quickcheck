import { useNavigate } from 'react-router-dom'
import { Avviso, Campo, Pulsante, Select } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { supabase } from '../../lib/supabase'
import { useElenco } from '../../lib/useElenco'

type Corso = { id: string; nome: string; durata_anni: number }

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

  const corso = righe?.find((c) => c.id === bozza.corsoId)
  const anni = corso ? Array.from({ length: corso.durata_anni }, (_, i) => i + 1) : []

  function scegliCorso(id: string) {
    aggiorna((b) =>
      b.corsoId === (id || null)
        ? b
        : { ...b, corsoId: id || null, anno: null, materieScelte: [], risposte: {}, saltati: {} },
    )
  }

  function scegliAnno(anno: number | 'fuori_corso') {
    aggiorna((b) => (b.anno === anno ? b : { ...b, anno, materieScelte: [] }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Il tuo corso</h1>

      {errore && <Avviso>{errore}</Avviso>}

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : righe.length === 0 ? (
        <Avviso tipo="info">Nessun corso disponibile al momento.</Avviso>
      ) : (
        <Campo etichetta="Corso di laurea">
          <Select
            value={bozza.corsoId ?? ''}
            onChange={(e) => scegliCorso(e.target.value)}
            className="!py-3 text-base"
          >
            <option value="">Scegli il tuo corso…</option>
            {righe.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Campo>
      )}

      {corso && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">In che anno sei?</p>
          <div className="grid grid-cols-2 gap-2">
            {anni.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={bozza.anno === a}
                onClick={() => scegliAnno(a)}
                className={`rounded-lg border px-4 py-3 text-base font-medium ${
                  bozza.anno === a
                    ? 'border-inchiostro bg-inchiostro text-white'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                {a}° anno
              </button>
            ))}
            <button
              type="button"
              aria-pressed={bozza.anno === 'fuori_corso'}
              onClick={() => scegliAnno('fuori_corso')}
              className={`rounded-lg border px-4 py-3 text-base font-medium ${
                bozza.anno === 'fuori_corso'
                  ? 'border-inchiostro bg-inchiostro text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              Fuori corso
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Pulsante grande onClick={() => navigate('/')}>
          Indietro
        </Pulsante>
        <Pulsante
          grande
          variante="primario"
          disabled={!corso || bozza.anno === null}
          onClick={() => navigate('/materie')}
        >
          Continua
        </Pulsante>
      </div>
    </div>
  )
}
