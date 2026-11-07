import { Avviso } from '../../../components/ui'
import { daRiga, type Agg } from '../../../lib/statistiche'
import { CATEGORIE } from '../domande/etichette'
import {
  CATEGORIE_DOCENTE,
  useStatRisposte,
  useTesti,
  type DocenteRif,
  type DomandaRif,
  type MateriaRif,
} from './dati'
import { esportaExcel, nomeFile, type Contesto } from './esporta'
import type { Filtri } from './filtri'
import PulsanteEsporta from './PulsanteEsporta'
import RigaDomanda, { ElencoDomande } from './RigaDomanda'
import RisposteScritte from './RisposteScritte'

type Props = {
  filtri: Filtri
  contesto: Contesto
  domande: DomandaRif[]
  materie: MateriaRif[]
  docenti: DocenteRif[]
  vedeDocenti: boolean
}

// Le Extra hanno una scheda a parte: non dipendono da corso, anno o materia
const CATEGORIE_PER_MATERIA = CATEGORIE.filter((c) => c.id !== 'extra')

export default function PerDomanda({ filtri, contesto, domande, materie, docenti, vedeDocenti }: Props) {
  const { righe, errore } = useStatRisposte(filtri, 'domanda', true)
  const testi = useTesti(filtri, true)
  const perDomanda = new Map<string, Agg>((righe ?? []).map((r) => [r.domanda_id, daRiga(r)]))

  const nomeMateria = new Map(materie.map((m) => [m.id, m.nome]))
  const nomeDocente = new Map(docenti.map((d) => [d.id, `${d.cognome} ${d.nome}`]))
  const testiDi = (domandaId: string) =>
    (testi.righe ?? [])
      .filter((t) => t.domanda_id === domandaId)
      .map((t) => ({
        ...t,
        etichetta: [nomeMateria.get(t.materia_id), t.docente_id ? nomeDocente.get(t.docente_id) : null]
          .filter(Boolean)
          .join(' · '),
      }))

  const visibili = domande.filter((d) => vedeDocenti || !CATEGORIE_DOCENTE.includes(d.categoria))

  function esporta() {
    return esportaExcel({
      nomeFile: nomeFile('per-domanda'),
      contesto,
      titoliColonne: ['Categoria'],
      voci: CATEGORIE_PER_MATERIA.flatMap((c) =>
        visibili
          .filter((d) => d.categoria === c.id)
          .sort((a, b) => a.ordine - b.ordine)
          .map((d) => ({ colonne: [c.nome], domanda: d, agg: perDomanda.get(d.id) })),
      ),
      testi: {
        titoli: ['Categoria', 'Materia', 'Docente'],
        righe: CATEGORIE_PER_MATERIA.flatMap((c) =>
          visibili
            .filter((d) => d.categoria === c.id && d.tipo_risposta === 'testo')
            .sort((a, b) => a.ordine - b.ordine)
            .flatMap((d) =>
              testiDi(d.id)
                .filter((t) => !t.nascosta)
                .map((t) => ({
                  colonne: [
                    c.nome,
                    nomeMateria.get(t.materia_id) ?? '?',
                    t.docente_id ? (nomeDocente.get(t.docente_id) ?? '?') : '—',
                  ],
                  domanda: d.testo,
                  testo: t.testo,
                })),
            ),
        ),
      },
    })
  }

  return (
    <div className="space-y-6">
      {(errore ?? testi.errore) && <Avviso>{errore ?? testi.errore}</Avviso>}
      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Ogni domanda con tutte le risposte che corrispondono ai filtri.
            </p>
            <PulsanteEsporta onEsporta={esporta} />
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
            const numeriche = delle.filter((d) => d.tipo_risposta !== 'testo')
            const scritte = delle.filter((d) => d.tipo_risposta === 'testo')
            return (
              <section key={c.id} className="space-y-2">
                <h2 className="font-semibold text-slate-700">{c.nome}</h2>
                {numeriche.length > 0 && (
                  <ElencoDomande domande={numeriche}>
                    {numeriche.map((d) => (
                      <RigaDomanda key={d.id} domanda={d} agg={perDomanda.get(d.id)} />
                    ))}
                  </ElencoDomande>
                )}
                {scritte.map((d) => (
                  <RisposteScritte key={d.id} domanda={d} voci={testiDi(d.id)} onCambiato={testi.ricarica} />
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
