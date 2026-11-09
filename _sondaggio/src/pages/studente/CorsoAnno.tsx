import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BarraAzioni, Scelta } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { perTipo } from '../../lib/corsi'
import { supabase } from '../../lib/supabase'
import { nomeLeggibile } from '../../lib/testo'
import { useElenco } from '../../lib/useElenco'

type Corso = { id: string; nome: string; tipo: string; durata_anni: number }

// Primo passo: il corso di laurea. L'anno si sceglie nella pagina successiva (Anno.tsx)
export default function CorsoAnno() {
  const { bozza, aggiorna } = useBozza()
  const navigate = useNavigate()
  const [tipoScelto, setTipoScelto] = useState<string | null>(null)
  const { righe, errore } = useElenco<Corso>(
    () =>
      supabase
        .from('corsi_di_laurea')
        .select('id, nome, tipo, durata_anni')
        .eq('attivo', true)
        .order('nome'),
    'corsi',
  )

  // Dopo il primo invio dell'edizione il corso non si cambia più
  if (bozza.corsoBloccato) return <Navigate to="/materie" replace />

  const corso = righe?.find((c) => c.id === bozza.corsoId)
  const gruppi = perTipo(righe ?? [])
  // Nessun elenco finché non si sceglie il tipo, così nessuno crede che il suo corso manchi.
  // Chi torna indietro ritrova il tipo del corso già scelto; con un solo tipo non c'è niente da scegliere.
  const tipo = tipoScelto ?? corso?.tipo ?? (gruppi.length === 1 ? gruppi[0].id : null)
  const corsiDelTipo = gruppi.find((g) => g.id === tipo)?.corsi ?? []

  function scegliTipo(id: string) {
    setTipoScelto(id)
    // Un corso dell'altro tipo non si vedrebbe più nell'elenco: la scelta riparte da zero
    if (corso && corso.tipo !== id) {
      aggiorna((b) => ({ ...b, corsoId: null, anno: null, materieScelte: [], risposte: {}, saltati: {} }))
    }
  }

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
          {gruppi.length > 1 && (
            <div role="group" aria-label="Tipo di corso" className="flex gap-2">
              {gruppi.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={tipo === g.id}
                  onClick={() => scegliTipo(g.id)}
                  className={`min-h-12 flex-1 rounded-xl border-2 px-3 py-2 text-base font-bold transition-colors ${
                    tipo === g.id
                      ? 'border-udu bg-udu text-white'
                      : 'border-slate-400 bg-white text-grafite hover:border-udu hover:bg-udu-velo'
                  }`}
                >
                  {g.nome}
                </button>
              ))}
            </div>
          )}
          {tipo === null ? (
            <p className="text-slate-600">Indica il tipo di corso per vedere l'elenco.</p>
          ) : (
            <div className="space-y-2.5">
              {corsiDelTipo.map((c) => (
                <Scelta key={c.id} scelta={bozza.corsoId === c.id} onClick={() => scegliCorso(c.id)}>
                  {nomeLeggibile(c.nome)}
                </Scelta>
              ))}
            </div>
          )}
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
