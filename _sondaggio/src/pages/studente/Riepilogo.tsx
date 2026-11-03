import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import type { Json } from '../../lib/database.types'
import { messaggioErrore } from '../../lib/errori'
import { contaMancanti, costruisciStruttura, preparaInvio } from '../../lib/sondaggio'
import { supabase } from '../../lib/supabase'
import { useDomandeAttive, useMaterieCorso } from '../../lib/useDatiSondaggio'

export default function Riepilogo() {
  const { bozza } = useBozza()
  const navigate = useNavigate()
  const { materie, errore } = useMaterieCorso({ ids: bozza.materieScelte })
  const { domande, errore: erroreDomande } = useDomandeAttive()
  const [invio, setInvio] = useState(false)
  const [erroreInvio, setErroreInvio] = useState<string | null>(null)

  if (bozza.materieScelte.length === 0) return <Navigate to="/materie" replace />

  if (materie === null || domande === null) {
    return (
      <div className="space-y-4">
        {(errore || erroreDomande) && (
          <Avviso>Non riesco a caricare il riepilogo. Riprova tra qualche minuto.</Avviso>
        )}
        <p className="text-slate-500">Caricamento…</p>
      </div>
    )
  }

  const righe = materie.map((materia, indice) => {
    const struttura = costruisciStruttura(materia, domande)
    const risposte = bozza.risposte[materia.materiaCorsoId] ?? {}
    const saltati = bozza.saltati[materia.materiaCorsoId] ?? []
    return {
      materia,
      indice,
      struttura,
      risposte,
      saltati,
      mancanti: contaMancanti(struttura, risposte, saltati),
    }
  })
  const tutteComplete = righe.every((r) => r.mancanti === 0)

  async function invia() {
    if (!bozza.edizioneId) return
    setInvio(true)
    setErroreInvio(null)
    const payload = righe.map((r) => preparaInvio(r.materia, r.struttura, r.risposte, r.saltati))
    const { error } = await supabase.rpc('invia_compilazioni', {
      p_edizione: bozza.edizioneId,
      p_fuori_corso: bozza.anno === 'fuori_corso',
      p_materie: payload as unknown as Json,
      p_anno: typeof bozza.anno === 'number' ? bozza.anno : undefined,
    })
    setInvio(false)
    if (error) {
      // La bozza resta intatta: si può riprovare senza reinserire nulla
      setErroreInvio(
        error.code === 'P0001'
          ? messaggioErrore(error)
          : "Non è stato possibile inviare le risposte. Controlla la connessione e riprova: la tua bozza è al sicuro.",
      )
      return
    }
    // La bozza viene svuotata dalla pagina di conferma, fuori dal percorso protetto
    navigate('/conferma', { replace: true, state: { inviato: true } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Riepilogo</h1>
        <p className="mt-1 text-slate-600">
          Controlla le materie scelte. Puoi tornare a correggere ogni risposta fino all'invio.
        </p>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {righe.map((r) => (
          <li key={r.materia.materiaCorsoId} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.materia.nome}</p>
              <p className={`text-sm ${r.mancanti === 0 ? 'text-green-700' : 'text-red-700'}`}>
                {r.mancanti === 0
                  ? 'Completa'
                  : r.mancanti === 1
                    ? 'Manca 1 risposta obbligatoria'
                    : `Mancano ${r.mancanti} risposte obbligatorie`}
              </p>
            </div>
            <Link
              to={`/compila/${r.indice}`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {r.mancanti === 0 ? 'Rivedi' : 'Completa'}
            </Link>
          </li>
        ))}
      </ul>

      {erroreInvio && <Avviso>{erroreInvio}</Avviso>}

      <div className="flex flex-wrap gap-3">
        <Pulsante grande onClick={() => navigate('/materie')}>
          Cambia materie
        </Pulsante>
        <Pulsante grande variante="primario" disabled={!tutteComplete || invio} onClick={invia}>
          {invio ? 'Invio in corso…' : 'Invia le risposte'}
        </Pulsante>
      </div>
      {!tutteComplete && (
        <p className="text-sm text-slate-500">
          L'invio si attiva quando tutte le materie sono complete.
        </p>
      )}
    </div>
  )
}
