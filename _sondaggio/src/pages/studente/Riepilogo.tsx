import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PulsanteGoogle from '../../components/PulsanteGoogle'
import { AvvisoAttenzione, BarraAzioni, IconaAttenzione, IconaSpunta } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza } from '../../lib/bozza'
import { chiamaServer } from '../../lib/server'
import {
  contaMancanti,
  contaMancantiExtra,
  costruisciStruttura,
  domandeExtra,
  haRisposta,
  preparaExtra,
  preparaInvio,
  visibile,
} from '../../lib/sondaggio'
import { accessoValido, useStudente } from '../../lib/studente'
import { useDomandeAttive, useMaterieCorso } from '../../lib/useDatiSondaggio'
import { useStatoStudente } from '../../lib/useStatoStudente'

export default function Riepilogo() {
  const { bozza } = useBozza()
  const navigate = useNavigate()
  const { materie, errore } = useMaterieCorso({ ids: bozza.materieScelte })
  const { domande, errore: erroreDomande } = useDomandeAttive()
  const { accesso } = useStudente()
  const sessioneValida = accessoValido(accesso)
  const { stato } = useStatoStudente()
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
  // Le domande Extra si chiedono una volta sola: se sono già state inviate non si ripetono
  const extraDaFare = domandeExtra(domande).length > 0 && stato?.extra_inviate !== true
  const extraMancanti = extraDaFare ? contaMancantiExtra(domande, bozza.extra) : 0
  const extraRisposte = extraDaFare
    ? domandeExtra(domande).filter((d) => visibile(d, bozza.extra) && haRisposta(bozza.extra[d.id]))
        .length
    : 0
  const tutteComplete = righe.every((r) => r.mancanti === 0) && extraMancanti === 0

  async function invia() {
    if (!bozza.edizioneId || !accesso) return
    setInvio(true)
    setErroreInvio(null)
    const payload = righe.map((r) => preparaInvio(r.materia, r.struttura, r.risposte, r.saltati))
    const esito = await chiamaServer('invia', accesso.idToken, bozza.edizioneId, {
      fuori_corso: bozza.anno === 'fuori_corso',
      anno: typeof bozza.anno === 'number' ? bozza.anno : null,
      materie: payload,
      extra: extraDaFare ? preparaExtra(domande ?? [], bozza.extra) : [],
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
        <h1 className="text-2xl font-extrabold tracking-tight">Riepilogo</h1>
        <p className="mt-1 text-slate-600">
          Controlla le materie scelte. Puoi tornare a correggere ogni risposta fino all'invio.
        </p>
      </div>

      <ul className="space-y-2.5">
        {righe.map((r) => (
          <li
            key={r.materia.materiaCorsoId}
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${
              r.mancanti === 0 ? 'border-slate-200 bg-white' : 'border-udu-giallo bg-giallo-velo'
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid size-9 flex-none place-items-center rounded-full ${
                r.mancanti === 0 ? 'bg-udu text-white' : 'bg-udu-giallo text-grafite'
              }`}
            >
              {r.mancanti === 0 ? (
                <IconaSpunta className="size-5" />
              ) : (
                <IconaAttenzione className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-bold">{r.materia.nome}</p>
              <p className="text-sm text-slate-700">
                {r.mancanti === 0
                  ? 'Completa'
                  : r.mancanti === 1
                    ? 'Manca 1 risposta obbligatoria'
                    : `Mancano ${r.mancanti} risposte obbligatorie`}
              </p>
            </div>
            <Link
              to={`/compila/${r.indice}`}
              className="flex min-h-11 items-center rounded-xl border-2 border-slate-300 bg-white px-3.5 text-sm font-bold hover:border-slate-400"
            >
              {r.mancanti === 0 ? 'Rivedi' : 'Completa'}
            </Link>
          </li>
        ))}
        {extraDaFare && (
          <li
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${
              extraMancanti === 0 ? 'border-slate-200 bg-white' : 'border-udu-giallo bg-giallo-velo'
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid size-9 flex-none place-items-center rounded-full ${
                extraMancanti === 0 ? 'bg-udu text-white' : 'bg-udu-giallo text-grafite'
              }`}
            >
              {extraMancanti === 0 ? (
                <IconaSpunta className="size-5" />
              ) : (
                <IconaAttenzione className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-bold">Domande extra</p>
              <p className="text-sm text-slate-700">
                {extraMancanti > 0
                  ? extraMancanti === 1
                    ? 'Manca 1 risposta obbligatoria'
                    : `Mancano ${extraMancanti} risposte obbligatorie`
                  : extraRisposte === 0
                    ? 'Facoltative: puoi saltarle'
                    : extraRisposte === 1
                      ? '1 risposta data'
                      : `${extraRisposte} risposte date`}
              </p>
            </div>
            <Link
              to="/extra"
              className="flex min-h-11 items-center rounded-xl border-2 border-slate-300 bg-white px-3.5 text-sm font-bold hover:border-slate-400"
            >
              {extraMancanti > 0 ? 'Completa' : extraRisposte === 0 ? 'Rispondi' : 'Rivedi'}
            </Link>
          </li>
        )}
      </ul>

      {erroreInvio && <Avviso>{erroreInvio}</Avviso>}

      {!sessioneValida && (
        <div className="space-y-3 rounded-2xl border border-udu/20 bg-udu-velo p-4">
          <p className="text-sm text-slate-700">
            L'accesso è scaduto. Accedi di nuovo con Google per inviare: le tue risposte sono al sicuro.
          </p>
          <PulsanteGoogle />
        </div>
      )}

      {!tutteComplete && (
        <AvvisoAttenzione>
          L'invio si attiva quando tutte le materie sono complete.
        </AvvisoAttenzione>
      )}

      <BarraAzioni>
        <Pulsante grande onClick={() => navigate('/materie')}>
          Cambia materie
        </Pulsante>
        <Pulsante
          grande
          variante="primario"
          className="flex-1"
          disabled={!tutteComplete || invio || !sessioneValida}
          onClick={invia}
        >
          {invio ? 'Invio in corso…' : 'Invia le risposte'}
        </Pulsante>
      </BarraAzioni>
    </div>
  )
}
