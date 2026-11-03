import { Avviso } from '../../../components/ui'
import { daRiga, type Agg } from '../../../lib/statistiche'
import BloccoDomanda from './BloccoDomanda'
import {
  useStatRisposte,
  useStatSaltati,
  type DocenteRif,
  type DomandaRif,
  type InsegnamentoRif,
} from './dati'
import type { Filtri } from './filtri'

type Props = {
  filtri: Filtri
  domande: DomandaRif[]
  docenti: DocenteRif[]
  insegnamenti: InsegnamentoRif[]
  vedeDocenti: boolean
}

const DOCENTE = ['generica_docente', 'specifica_docente']

// Tutte le domande di una materia: prima quelle generali, poi i docenti uno sotto l'altro
export default function PerMateria({ filtri, domande, docenti, insegnamenti, vedeDocenti }: Props) {
  const attivo = Boolean(filtri.materia)
  const materia = useStatRisposte(filtri, 'domanda', attivo)
  const perDocente = useStatRisposte(filtri, 'domanda_docente', attivo && vedeDocenti)
  const saltati = useStatSaltati(filtri, attivo && vedeDocenti)

  if (!attivo) {
    return <Avviso tipo="info">Scegli una materia nei filtri per vedere le sue risposte.</Avviso>
  }

  const errore = materia.errore ?? perDocente.errore ?? saltati.errore
  const generali = new Map<string, Agg>(
    (materia.righe ?? []).filter((r) => !r.docente_id).map((r) => [r.domanda_id, daRiga(r)]),
  )
  const delleGenerali = domande
    .filter((d) => !DOCENTE.includes(d.categoria) && (generali.get(d.id)?.n ?? 0) > 0)
    .sort((a, b) => a.ordine - b.ordine)

  const docentiMateria = insegnamenti
    .filter((i) => i.materia_id === filtri.materia)
    .map((i) => docenti.find((d) => d.id === i.docente_id))
    .filter((d): d is DocenteRif => Boolean(d))
    .filter((d) => !filtri.docente || d.id === filtri.docente)
  const domandeDocente = domande.filter((d) => DOCENTE.includes(d.categoria))

  return (
    <div className="space-y-8">
      {errore && <Avviso>{errore}</Avviso>}
      {materia.righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-700">Domande sulla materia</h2>
            {delleGenerali.length === 0 ? (
              <Avviso tipo="info">Nessuna risposta per questa materia con i filtri scelti.</Avviso>
            ) : (
              delleGenerali.map((d) => (
                <BloccoDomanda key={d.id} domanda={d} agg={generali.get(d.id)} />
              ))
            )}
          </section>

          {!vedeDocenti ? (
            <Avviso tipo="info">
              I dati sui singoli docenti sono visibili solo agli admin e a chi è stato autorizzato.
            </Avviso>
          ) : (
            docentiMateria.map((doc) => {
              const righeDoc = new Map<string, Agg>(
                (perDocente.righe ?? [])
                  .filter((r) => r.docente_id === doc.id)
                  .map((r) => [r.domanda_id, daRiga(r)]),
              )
              const nSaltati = (saltati.righe ?? []).find((s) => s.docente_id === doc.id)?.n ?? 0
              const conDati = domandeDocente
                .filter((d) => (righeDoc.get(d.id)?.n ?? 0) > 0)
                .sort((a, b) => a.ordine - b.ordine)
              return (
                <section key={doc.id} className="space-y-3 rounded-xl bg-slate-100 p-4">
                  <h2 className="text-lg font-semibold">
                    {doc.nome} {doc.cognome}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {nSaltati === 0
                      ? 'Nessuno studente ha dichiarato di non averlo seguito.'
                      : nSaltati === 1
                        ? '1 studente ha dichiarato di non averlo seguito.'
                        : `${nSaltati} studenti hanno dichiarato di non averlo seguito.`}
                  </p>
                  {conDati.length === 0 ? (
                    <p className="text-sm text-slate-500">Nessuna risposta su questo docente.</p>
                  ) : (
                    conDati.map((d) => (
                      <BloccoDomanda key={d.id} domanda={d} agg={righeDoc.get(d.id)} />
                    ))
                  )}
                </section>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
