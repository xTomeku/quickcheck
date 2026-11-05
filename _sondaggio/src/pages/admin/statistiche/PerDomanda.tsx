import { Avviso, Pulsante } from '../../../components/ui'
import { daRiga, scaricaCsv, type Agg } from '../../../lib/statistiche'
import { CATEGORIE } from '../domande/etichette'
import {
  CATEGORIE_DOCENTE,
  celleDomanda,
  COLONNE_DOMANDA,
  useStatRisposte,
  type DomandaRif,
} from './dati'
import type { Filtri } from './filtri'
import RigaDomanda, { ElencoDomande } from './RigaDomanda'

type Props = { filtri: Filtri; domande: DomandaRif[]; vedeDocenti: boolean }

// Le Extra hanno una scheda a parte: non dipendono da corso, anno o materia
const CATEGORIE_PER_MATERIA = CATEGORIE.filter((c) => c.id !== 'extra')

export default function PerDomanda({ filtri, domande, vedeDocenti }: Props) {
  const { righe, errore } = useStatRisposte(filtri, 'domanda', true)
  const perDomanda = new Map<string, Agg>((righe ?? []).map((r) => [r.domanda_id, daRiga(r)]))

  const visibili = domande.filter((d) => vedeDocenti || !CATEGORIE_DOCENTE.includes(d.categoria))

  function esporta() {
    const corpo = CATEGORIE_PER_MATERIA.flatMap((c) =>
      visibili
        .filter((d) => d.categoria === c.id)
        .sort((a, b) => a.ordine - b.ordine)
        .map((d) => [c.nome, ...celleDomanda(d, perDomanda.get(d.id))]),
    )
    scaricaCsv('statistiche-per-domanda.csv', [['categoria', ...COLONNE_DOMANDA], ...corpo])
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
              <section key={c.id} className="space-y-2">
                <h2 className="font-semibold text-slate-700">{c.nome}</h2>
                <ElencoDomande domande={delle}>
                  {delle.map((d) => (
                    <RigaDomanda key={d.id} domanda={d} agg={perDomanda.get(d.id)} />
                  ))}
                </ElencoDomande>
              </section>
            )
          })}
          {visibili.length === 0 && <Avviso tipo="info">Nessuna domanda inserita.</Avviso>}
        </>
      )}
    </div>
  )
}
