import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import CampoDomanda from '../../components/CampoDomanda'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza, type Valore } from '../../lib/bozza'
import {
  chiaveRisposta,
  contaMancanti,
  costruisciStruttura,
  haRisposta,
  type DomandaCompleta,
} from '../../lib/sondaggio'
import { useDomandeAttive, useMaterieCorso } from '../../lib/useDatiSondaggio'

export default function Compila() {
  const { bozza, aggiorna } = useBozza()
  const navigate = useNavigate()
  const { indice } = useParams()
  const i = Number(indice)
  // Indice della materia per cui mostrare le domande obbligatorie mancanti
  const [mostraPer, setMostraPer] = useState<number | null>(null)
  const mostraMancanti = mostraPer === i

  const { materie, errore } = useMaterieCorso({ ids: bozza.materieScelte })
  const { domande, errore: erroreDomande } = useDomandeAttive()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [i])

  if (bozza.materieScelte.length === 0) return <Navigate to="/materie" replace />
  if (!Number.isInteger(i) || i < 0 || i >= bozza.materieScelte.length) {
    return <Navigate to="/riepilogo" replace />
  }

  if (materie === null || domande === null) {
    return (
      <div className="space-y-4">
        {(errore || erroreDomande) && (
          <Avviso>Non riesco a caricare le domande. Riprova tra qualche minuto.</Avviso>
        )}
        <p className="text-slate-500">Caricamento…</p>
      </div>
    )
  }

  const materia = materie[i]
  if (!materia) return <Navigate to="/materie" replace />

  const mc = materia.materiaCorsoId
  const struttura = costruisciStruttura(materia, domande)
  const risposte = bozza.risposte[mc] ?? {}
  const saltati = bozza.saltati[mc] ?? []
  const totale = bozza.materieScelte.length

  function rispondi(domandaId: string, valore: Valore, insegnamentoId?: string) {
    aggiorna((b) => ({
      ...b,
      risposte: {
        ...b.risposte,
        [mc]: { ...(b.risposte[mc] ?? {}), [chiaveRisposta(domandaId, insegnamentoId)]: valore },
      },
    }))
  }

  function alternaSalto(insegnamentoId: string) {
    aggiorna((b) => {
      const attuali = b.saltati[mc] ?? []
      return {
        ...b,
        saltati: {
          ...b.saltati,
          [mc]: attuali.includes(insegnamentoId)
            ? attuali.filter((x) => x !== insegnamentoId)
            : [...attuali, insegnamentoId],
        },
      }
    })
  }

  function avanti() {
    if (contaMancanti(struttura, risposte, saltati) > 0) {
      setMostraPer(i)
      return
    }
    navigate(i + 1 < totale ? `/compila/${i + 1}` : '/riepilogo')
  }

  function indietro() {
    navigate(i > 0 ? `/compila/${i - 1}` : '/materie')
  }

  const manca = (d: DomandaCompleta, insegnamentoId?: string) =>
    mostraMancanti &&
    d.obbligatoria &&
    !haRisposta(risposte[chiaveRisposta(d.id, insegnamentoId)])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          Materia {i + 1} di {totale}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totale}
          aria-valuenow={i + 1}
          className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full bg-udu"
            style={{ width: `${((i + 1) / totale) * 100}%` }}
          />
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{materia.nome}</h1>
      </div>

      {struttura.generiche.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">Domande generali</h2>
          {struttura.generiche.map((d) => (
            <CampoDomanda
              key={d.id}
              domanda={d}
              valore={risposte[chiaveRisposta(d.id)]}
              onCambia={(v) => rispondi(d.id, v)}
              mancante={manca(d)}
            />
          ))}
        </section>
      )}

      {struttura.specifiche.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">Su questa materia</h2>
          {struttura.specifiche.map((d) => (
            <CampoDomanda
              key={d.id}
              domanda={d}
              valore={risposte[chiaveRisposta(d.id)]}
              onCambia={(v) => rispondi(d.id, v)}
              mancante={manca(d)}
            />
          ))}
        </section>
      )}

      {struttura.docenti
        .filter((b) => b.domande.length > 0)
        .map((blocco) => {
          const idIns = blocco.insegnamento.id
          const saltato = saltati.includes(idIns)
          return (
            <section key={idIns} className="space-y-3 rounded-xl bg-slate-100 p-4">
              <h2 className="text-lg font-semibold">
                {blocco.insegnamento.docente.nome} {blocco.insegnamento.docente.cognome}
              </h2>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={saltato}
                  onChange={() => alternaSalto(idIns)}
                />
                Non ho seguito questo docente
              </label>
              {!saltato &&
                blocco.domande.map((d) => (
                  <CampoDomanda
                    key={d.id}
                    domanda={d}
                    valore={risposte[chiaveRisposta(d.id, idIns)]}
                    onCambia={(v) => rispondi(d.id, v, idIns)}
                    mancante={manca(d, idIns)}
                  />
                ))}
            </section>
          )
        })}

      {mostraMancanti && (
        <Avviso>Rispondi alle domande segnate con * prima di continuare.</Avviso>
      )}

      <div className="flex gap-3">
        <Pulsante grande onClick={indietro}>
          Indietro
        </Pulsante>
        <Pulsante grande variante="primario" onClick={avanti}>
          {i + 1 < totale ? 'Materia successiva' : 'Vai al riepilogo'}
        </Pulsante>
      </div>
    </div>
  )
}
