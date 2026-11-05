import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import CampoDomanda from '../../components/CampoDomanda'
import PulsanteGoogle from '../../components/PulsanteGoogle'
import { AvvisoAttenzione, BarraAzioni } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza, type Valore } from '../../lib/bozza'
import {
  contaMancantiExtra,
  domandeExtra,
  haRisposta,
  raggruppa,
  visibile,
} from '../../lib/sondaggio'
import { useDomandeAttive } from '../../lib/useDatiSondaggio'
import { useStatoStudente } from '../../lib/useStatoStudente'

// Ultimo passo prima del riepilogo: domande che non riguardano una singola materia, chieste una volta sola
export default function Extra() {
  const { bozza, aggiorna } = useBozza()
  const navigate = useNavigate()
  const { domande, errore: erroreDomande } = useDomandeAttive()
  const { stato, errore: erroreStato } = useStatoStudente()
  const [mostraMancanti, setMostraMancanti] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (bozza.materieScelte.length === 0) return <Navigate to="/materie" replace />

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

  if (domande === null || stato === null) {
    return (
      <div className="space-y-4">
        {erroreDomande && <Avviso>Non riesco a caricare le domande. Riprova tra qualche minuto.</Avviso>}
        <p className="text-slate-500">Caricamento…</p>
      </div>
    )
  }

  const extra = domandeExtra(domande)
  // Niente da chiedere, oppure ha già risposto in un invio precedente
  if (extra.length === 0 || stato.extra_inviate) return <Navigate to="/riepilogo" replace />

  const nObbligatorie = extra.filter((d) => d.obbligatoria).length

  function rispondi(domandaId: string, valore: Valore) {
    aggiorna((b) => ({ ...b, extra: { ...b.extra, [domandaId]: valore } }))
  }

  function avanti() {
    if (contaMancantiExtra(domande ?? [], bozza.extra) > 0) {
      setMostraMancanti(true)
      return
    }
    navigate('/riepilogo')
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-slate-600">Un'ultima cosa</p>
        <h1 className="mt-1 text-2xl leading-tight font-extrabold tracking-tight">Domande extra</h1>
        <p className="mt-1 text-slate-600">
          Non riguardano una materia in particolare e le vedi una volta sola.{' '}
          {nObbligatorie === 0 ? (
            'Rispondi solo se ti va: puoi anche saltarle.'
          ) : (
            <>
              Le domande con <span className="font-bold text-udu">*</span> sono obbligatorie.
            </>
          )}
        </p>
      </div>

      {raggruppa(
        extra.filter((d) => visibile(d, bozza.extra)),
        'Altre domande',
      ).map((g) => (
        <section key={g.titolo} className="space-y-3">
          <h2 className="text-sm font-bold tracking-wide text-udu uppercase">{g.titolo}</h2>
          {g.domande.map((d) => (
            <CampoDomanda
              key={d.id}
              domanda={d}
              valore={bozza.extra[d.id]}
              onCambia={(v) => rispondi(d.id, v)}
              mancante={mostraMancanti && d.obbligatoria && !haRisposta(bozza.extra[d.id])}
            />
          ))}
        </section>
      ))}

      {mostraMancanti && (
        <AvvisoAttenzione>Rispondi alle domande segnate con * prima di continuare.</AvvisoAttenzione>
      )}

      <BarraAzioni>
        <Pulsante grande onClick={() => navigate(`/compila/${bozza.materieScelte.length - 1}`)}>
          Indietro
        </Pulsante>
        <Pulsante grande variante="primario" className="flex-1" onClick={avanti}>
          Vai al riepilogo
        </Pulsante>
      </BarraAzioni>
    </div>
  )
}
