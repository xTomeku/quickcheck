import { Avviso, Pulsante } from '../../../components/ui'
import { daRiga, formatta, media, scaricaCsv, type Agg } from '../../../lib/statistiche'
import { CATEGORIE } from '../domande/etichette'
import BloccoDomanda from './BloccoDomanda'
import { useStatRisposte, voci, type DomandaRif } from './dati'
import type { Filtri } from './filtri'

type Props = { filtri: Filtri; domande: DomandaRif[]; vedeDocenti: boolean }

const DOCENTE = ['generica_docente', 'specifica_docente']
// Le Extra hanno una scheda a parte: non dipendono da corso, anno o materia
const CATEGORIE_PER_MATERIA = CATEGORIE.filter((c) => c.id !== 'extra')

export default function PerDomanda({ filtri, domande, vedeDocenti }: Props) {
  const { righe, errore } = useStatRisposte(filtri, 'domanda', true)
  const perDomanda = new Map<string, Agg>((righe ?? []).map((r) => [r.domanda_id, daRiga(r)]))

  const visibili = domande.filter((d) => vedeDocenti || !DOCENTE.includes(d.categoria))

  function esporta() {
    const intestazione = ['categoria', 'domanda', 'tipo', 'risposte', 'media', 'distribuzione']
    const corpo = CATEGORIE_PER_MATERIA.flatMap((c) =>
      visibili
        .filter((d) => d.categoria === c.id)
        .sort((a, b) => a.ordine - b.ordine)
        .map((d) => {
          const agg = perDomanda.get(d.id)
          const med = d.tipo_risposta === 'scala' ? media(agg) : null
          return [
            c.nome,
            d.testo,
            d.tipo_risposta === 'scala' ? 'scala' : 'scelta singola',
            String(agg?.n ?? 0),
            med === null ? '' : formatta(med),
            voci(d, agg)
              .map((v) => `${v.etichetta}: ${v.conteggio}`)
              .join(' | '),
          ]
        }),
    )
    scaricaCsv('statistiche-per-domanda.csv', [intestazione, ...corpo])
  }

  return (
    <div className="space-y-6">
      {errore && <Avviso>{errore}</Avviso>}
      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Ogni domanda con tutte le risposte che corrispondono ai filtri.
            </p>
            <Pulsante onClick={esporta}>Esporta CSV</Pulsante>
          </div>
          {!vedeDocenti && (
            <Avviso tipo="info">
              Le domande sui docenti sono visibili solo agli admin e a chi è stato autorizzato.
            </Avviso>
          )}
          {CATEGORIE_PER_MATERIA.map((c) => {
            const delle = visibili
              .filter((d) => d.categoria === c.id)
              .sort((a, b) => a.ordine - b.ordine)
            if (delle.length === 0) return null
            return (
              <section key={c.id} className="space-y-3">
                <h2 className="font-semibold text-slate-700">{c.nome}</h2>
                {delle.map((d) => (
                  <BloccoDomanda key={d.id} domanda={d} agg={perDomanda.get(d.id)} />
                ))}
              </section>
            )
          })}
          {visibili.length === 0 && <Avviso tipo="info">Nessuna domanda inserita.</Avviso>}
        </>
      )}
    </div>
  )
}
