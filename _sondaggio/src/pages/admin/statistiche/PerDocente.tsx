import { Avviso } from '../../../components/ui'
import { daRiga, formatta, media, unisci, AGG_VUOTO, type Agg } from '../../../lib/statistiche'
import BloccoDomanda from './BloccoDomanda'
import { useStatRisposte, useStatSaltati, voci, type DomandaRif, type MateriaRif } from './dati'
import type { Filtri } from './filtri'

type Props = { filtri: Filtri; domande: DomandaRif[]; materie: MateriaRif[] }

const DOCENTE = ['generica_docente', 'specifica_docente']

// Le domande sui docenti per un docente, su tutte le materie in cui insegna
export default function PerDocente({ filtri, domande, materie }: Props) {
  const attivo = Boolean(filtri.docente)
  const { righe, errore } = useStatRisposte(filtri, 'domanda_materia', attivo)
  const saltati = useStatSaltati(filtri, attivo)
  const nomeMateria = new Map(materie.map((m) => [m.id, m.nome]))

  if (!attivo) {
    return <Avviso tipo="info">Scegli un docente nei filtri per vedere le sue valutazioni.</Avviso>
  }

  const perDomanda = new Map<string, { totale: Agg; perMateria: { materia: string; agg: Agg }[] }>()
  for (const r of righe ?? []) {
    const attuale = perDomanda.get(r.domanda_id) ?? { totale: AGG_VUOTO, perMateria: [] }
    const agg = daRiga(r)
    attuale.totale = unisci(attuale.totale, agg)
    attuale.perMateria.push({ materia: nomeMateria.get(r.materia_id ?? '') ?? '?', agg })
    perDomanda.set(r.domanda_id, attuale)
  }
  const nSaltati = (saltati.righe ?? []).reduce((somma, s) => somma + s.n, 0)
  const conDati = domande
    .filter((d) => DOCENTE.includes(d.categoria) && perDomanda.has(d.id))
    .sort((a, b) => a.ordine - b.ordine)

  return (
    <div className="space-y-6">
      {(errore ?? saltati.errore) && <Avviso>{errore ?? saltati.errore}</Avviso>}
      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {nSaltati === 0
              ? 'Nessuno studente ha dichiarato di non aver seguito questo docente.'
              : nSaltati === 1
                ? '1 studente ha dichiarato di non aver seguito questo docente.'
                : `${nSaltati} studenti hanno dichiarato di non aver seguito questo docente.`}
          </p>
          {conDati.length === 0 ? (
            <Avviso tipo="info">Nessuna risposta su questo docente con i filtri scelti.</Avviso>
          ) : (
            conDati.map((d) => {
              const dati = perDomanda.get(d.id)!
              return (
                <div key={d.id} className="space-y-2">
                  <BloccoDomanda domanda={d} agg={dati.totale} />
                  {dati.perMateria.length > 1 && (
                    <ul className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
                      {dati.perMateria
                        .sort((a, b) => a.materia.localeCompare(b.materia))
                        .map((m) => {
                          const med = d.tipo_risposta === 'scala' ? media(m.agg) : null
                          return (
                            <li key={m.materia} className="flex flex-wrap justify-between gap-2 py-1">
                              <span>{m.materia}</span>
                              <span className="text-slate-600">
                                {m.agg.n} {m.agg.n === 1 ? 'risposta' : 'risposte'}
                                {med !== null
                                  ? ` · media ${formatta(med)}`
                                  : ` · ${voci(d, m.agg)
                                      .filter((v) => v.conteggio > 0)
                                      .map((v) => `${v.etichetta} ${v.conteggio}`)
                                      .join(', ')}`}
                              </span>
                            </li>
                          )
                        })}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
