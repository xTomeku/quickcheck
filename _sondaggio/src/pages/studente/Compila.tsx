import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import CampoDomanda from '../../components/CampoDomanda'
import { AvvisoAttenzione, BarraAzioni, IconaSpunta, Segmenti } from '../../components/studente'
import { Avviso, Pulsante } from '../../components/ui'
import { useBozza, type Valore } from '../../lib/bozza'
import {
  chiaveRisposta,
  contaMancanti,
  costruisciStruttura,
  domandeExtra,
  haRisposta,
  raggruppa,
  visibile,
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
  const haExtra = domandeExtra(domande).length > 0

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
    navigate(i + 1 < totale ? `/compila/${i + 1}` : '/extra')
  }

  function indietro() {
    navigate(i > 0 ? `/compila/${i - 1}` : '/materie')
  }

  const manca = (d: DomandaCompleta, insegnamentoId?: string) =>
    mostraMancanti &&
    d.obbligatoria &&
    !haRisposta(risposte[chiaveRisposta(d.id, insegnamentoId)])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-slate-600">
          Materia {i + 1} di {totale}
        </p>
        <div className="mt-2">
          <Segmenti totale={totale} corrente={i} />
        </div>
        <h1 className="mt-4 text-2xl leading-tight font-extrabold tracking-tight">{materia.nome}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Le domande con <span className="font-bold text-udu">*</span> sono obbligatorie.
        </p>
      </div>

      {raggruppa(
        [...struttura.generiche, ...struttura.specifiche].filter((d) => visibile(d, risposte)),
        'Domande generali',
      ).map((g) => (
        <section key={g.titolo} className="space-y-3">
          <h2 className="text-sm font-bold tracking-wide text-udu uppercase">{g.titolo}</h2>
          {g.domande.map((d) => (
            <CampoDomanda
              key={d.id}
              domanda={d}
              valore={risposte[chiaveRisposta(d.id)]}
              onCambia={(v) => rispondi(d.id, v)}
              mancante={manca(d)}
            />
          ))}
        </section>
      ))}

      {struttura.docenti
        .filter((b) => b.domande.length > 0)
        .map((blocco) => {
          const idIns = blocco.insegnamento.id
          const saltato = saltati.includes(idIns)
          const { nome, cognome } = blocco.insegnamento.docente
          return (
            <section
              key={idIns}
              className="space-y-3 rounded-2xl border border-udu/15 bg-udu-velo/50 p-3.5"
            >
              <div className="flex items-center gap-3 px-1">
                <span
                  aria-hidden="true"
                  className="grid size-11 flex-none place-items-center rounded-full bg-udu text-sm font-extrabold text-white"
                >
                  {`${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-wide text-udu uppercase">Docente</p>
                  <h2 className="text-lg leading-tight font-extrabold">
                    {nome} {cognome}
                  </h2>
                </div>
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 text-[15px] font-medium ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={saltato}
                  onChange={() => alternaSalto(idIns)}
                />
                <span
                  aria-hidden="true"
                  className={`grid size-6 flex-none place-items-center rounded-md border-2 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-inchiostro ${
                    saltato ? 'border-udu bg-udu text-white' : 'border-slate-400 bg-white'
                  }`}
                >
                  {saltato && <IconaSpunta className="size-4" />}
                </span>
                Non ho seguito questo docente
              </label>
              {!saltato &&
                raggruppa(
                  blocco.domande.filter((d) => visibile(d, risposte, idIns)),
                  '',
                ).map((g) => (
                  <div key={g.titolo} className="space-y-3">
                    {g.titolo && (
                      <h3 className="px-1 pt-1 text-sm font-bold tracking-wide text-udu uppercase">
                        {g.titolo}
                      </h3>
                    )}
                    {g.domande.map((d) => (
                      <CampoDomanda
                        key={d.id}
                        domanda={d}
                        valore={risposte[chiaveRisposta(d.id, idIns)]}
                        onCambia={(v) => rispondi(d.id, v, idIns)}
                        mancante={manca(d, idIns)}
                      />
                    ))}
                  </div>
                ))}
            </section>
          )
        })}

      {mostraMancanti && (
        <AvvisoAttenzione>Rispondi alle domande segnate con * prima di continuare.</AvvisoAttenzione>
      )}

      <BarraAzioni>
        <Pulsante grande onClick={indietro}>
          Indietro
        </Pulsante>
        <Pulsante grande variante="primario" className="flex-1" onClick={avanti}>
          {i + 1 < totale ? 'Materia successiva' : haExtra ? 'Continua' : 'Vai al riepilogo'}
        </Pulsante>
      </BarraAzioni>
    </div>
  )
}
