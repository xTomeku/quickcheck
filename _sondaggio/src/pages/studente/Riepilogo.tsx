import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PulsanteGoogle from '../../components/PulsanteGoogle'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { chiamaServer } from '../../lib/server'
import { contaMancanti, costruisciStruttura, preparaInvio } from '../../lib/sondaggio'
import { accessoValido, useStudente } from '../../lib/studente'
import { useDomandeAttive, useMaterieCorso } from '../../lib/useDatiSondaggio'

export default function Riepilogo() {
  const { bozza } = useBozza()
  const navigate = useNavigate()
  const { materie, errore } = useMaterieCorso({ ids: bozza.materieScelte })
  const { domande, errore: erroreDomande } = useDomandeAttive()
  const { accesso } = useStudente()
  const sessioneValida = accessoValido(accesso)
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
    if (!bozza.edizioneId || !accesso) return
    setInvio(true)
    setErroreInvio(null)
    const payload = righe.map((r) => preparaInvio(r.materia, r.struttura, r.risposte, r.saltati))
    const esito = await chiamaServer('invia', accesso.idToken, bozza.edizioneId, {
      fuori_corso: bozza.anno === 'fuori_corso',
      anno: typeof bozza.anno === 'number' ? bozza.anno : null,
      materie: payload,
    })
    setInvio(false)
    if (!esito.ok) {
      // La bozza resta intatta: si può riprovare senza reinserire nulla
      setErroreInvio(
        esito.stato === 0 || esito.stato >= 500
          ? `${esito.errore} La tua bozza è al sicuro.`
          : esito.errore,
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

      {!sessioneValida && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            L'accesso è scaduto. Accedi di nuovo con Google per inviare: le tue risposte sono al sicuro.
          </p>
          <PulsanteGoogle />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Pulsante grande onClick={() => navigate('/materie')}>
          Cambia materie
        </Pulsante>
        <Pulsante
          grande
          variante="primario"
          disabled={!tutteComplete || invio || !sessioneValida}
          onClick={invia}
        >
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
