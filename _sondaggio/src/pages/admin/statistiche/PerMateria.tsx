import { useState } from 'react'
import { Avviso, Pulsante } from '../../../components/ui'
import { normalizza } from '../../../lib/nomi'
import { daRiga, formatta, scaricaCsv, type Agg, type RigaStat } from '../../../lib/statistiche'
import Classifica, { Tessera, type VoceClassifica } from './Classifica'
import {
  CATEGORIE_DOCENTE,
  celleDomanda,
  COLONNE_DOMANDA,
  mediaGenerale,
  nomeFileCsv,
  useStatCompilazioni,
  useStatRisposte,
  useStatSaltati,
  type CorsoRif,
  type DocenteRif,
  type DomandaRif,
  type InsegnamentoRif,
  type MateriaCorsoRif,
  type MateriaRif,
} from './dati'
import type { Filtri } from './filtri'
import RigaDomanda, { ElencoDomande } from './RigaDomanda'

type Props = {
  filtri: Filtri
  ricerca: string
  corsi: CorsoRif[]
  materie: MateriaRif[]
  materieCorso: MateriaCorsoRif[]
  domande: DomandaRif[]
  docenti: DocenteRif[]
  insegnamenti: InsegnamentoRif[]
  vedeDocenti: boolean
}

// Tutte le materie in classifica: si vede subito quali vanno male e dove mancano risposte.
// Sostituisce sia il vecchio riepilogo sia la scelta della materia nei filtri.
export default function PerMateria({
  filtri,
  ricerca,
  corsi,
  materie,
  materieCorso,
  domande,
  docenti,
  insegnamenti,
  vedeDocenti,
}: Props) {
  const compilazioni = useStatCompilazioni(filtri)
  const risposte = useStatRisposte(filtri, 'domanda_materia', true)
  const [aperta, setAperta] = useState<string | null>(null)

  const nomeCorso = new Map(corsi.map((c) => [c.id, c.nome]))
  const domandePerId = new Map(domande.map((d) => [d.id, d]))
  const conteggi = new Map((compilazioni.righe ?? []).map((r) => [`${r.materia_id}|${r.corso_id}`, r.n]))

  // Le domande sui docenti hanno la loro classifica: qui contano solo quelle sulla materia
  const righePerMateria = new Map<string, RigaStat[]>()
  for (const r of risposte.righe ?? []) {
    const categoria = domandePerId.get(r.domanda_id)?.categoria ?? ''
    if (!r.materia_id || CATEGORIE_DOCENTE.includes(categoria)) continue
    righePerMateria.set(r.materia_id, [...(righePerMateria.get(r.materia_id) ?? []), r])
  }

  // Una materia può stare in più corsi: una riga sola, perché le medie sono per materia
  const elencoCompleto: VoceClassifica[] = materie.flatMap((m) => {
    const legami = materieCorso
      .filter((mc) => mc.materia_id === m.id)
      .filter((mc) => !filtri.corso || mc.corso_id === filtri.corso)
      .filter((mc) => !filtri.annoCorso || mc.anno === Number(filtri.annoCorso))
    if (legami.length === 0) return []
    return [
      {
        id: m.id,
        nome: m.nome,
        dettaglio: legami
          .map((mc) =>
            filtri.corso ? `${mc.anno}° anno` : `${nomeCorso.get(mc.corso_id) ?? '?'} · ${mc.anno}° anno`,
          )
          .join(', '),
        n: legami.reduce((somma, mc) => somma + (conteggi.get(`${mc.materia_id}|${mc.corso_id}`) ?? 0), 0),
        media: mediaGenerale(righePerMateria.get(m.id) ?? [], domandePerId),
      },
    ]
  })

  const parole = normalizza(ricerca).split(' ').filter(Boolean)
  const elenco = elencoCompleto.filter((v) => {
    const nome = normalizza(v.nome)
    return parole.every((p) => nome.includes(p))
  })

  const totale = elencoCompleto.reduce((somma, v) => somma + v.n, 0)
  const senzaRisposte = elencoCompleto.filter((v) => v.n === 0).length
  const errore = compilazioni.errore ?? risposte.errore

  if (compilazioni.righe === null || risposte.righe === null) {
    return (
      <div className="space-y-3">
        {errore && <Avviso>{errore}</Avviso>}
        <p className="text-slate-500">Caricamento…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {errore && <Avviso>{errore}</Avviso>}
      <p className="text-sm">
        <strong>{totale}</strong> {totale === 1 ? 'compilazione' : 'compilazioni'} in{' '}
        {elencoCompleto.length} {elencoCompleto.length === 1 ? 'materia' : 'materie'}
        {senzaRisposte > 0 && (
          <>
            {' '}
            · <strong>{senzaRisposte}</strong> senza nessuna risposta
          </>
        )}
      </p>
      {elenco.length === 0 ? (
        <Avviso tipo="info">
          {elencoCompleto.length === 0
            ? 'Nessuna materia corrisponde ai filtri.'
            : `Nessuna materia si chiama «${ricerca}».`}
        </Avviso>
      ) : (
        <Classifica
          voci={elenco}
          nomeColonna="Materia"
          etichettaN="Compilazioni"
          aperta={aperta}
          onApri={setAperta}
          renderDettaglio={(id) => {
            const voce = elenco.find((v) => v.id === id)
            return (
              <DettaglioMateria
                filtri={{ ...filtri, materia: id }}
                nome={voce?.nome ?? ''}
                n={voce?.n ?? 0}
                media={voce?.media ?? null}
                righe={righePerMateria.get(id) ?? []}
                domande={domande}
                docenti={docenti}
                insegnamenti={insegnamenti}
                vedeDocenti={vedeDocenti}
              />
            )
          }}
        />
      )}
    </div>
  )
}

// Il dettaglio carica i dati dei docenti solo quando viene aperto
function DettaglioMateria({
  filtri,
  nome,
  n,
  media,
  righe,
  domande,
  docenti,
  insegnamenti,
  vedeDocenti,
}: {
  filtri: Filtri
  nome: string
  n: number
  media: number | null
  righe: RigaStat[]
  domande: DomandaRif[]
  docenti: DocenteRif[]
  insegnamenti: InsegnamentoRif[]
  vedeDocenti: boolean
}) {
  const perDocente = useStatRisposte(filtri, 'domanda_docente', vedeDocenti)
  const saltati = useStatSaltati(filtri, vedeDocenti)
  const [docenteAperto, setDocenteAperto] = useState<string | null>(null)

  const domandePerId = new Map(domande.map((d) => [d.id, d]))
  const perDomanda = new Map<string, Agg>(righe.map((r) => [r.domanda_id, daRiga(r)]))
  const conDati = domande
    .filter((d) => !CATEGORIE_DOCENTE.includes(d.categoria) && (perDomanda.get(d.id)?.n ?? 0) > 0)
    .sort((a, b) => a.ordine - b.ordine)

  const docentiMateria = insegnamenti
    .filter((i) => i.materia_id === filtri.materia)
    .map((i) => docenti.find((d) => d.id === i.docente_id))
    .filter((d): d is DocenteRif => Boolean(d))
  const domandeDocente = domande
    .filter((d) => CATEGORIE_DOCENTE.includes(d.categoria))
    .sort((a, b) => a.ordine - b.ordine)

  const datiDocenti = (vedeDocenti ? docentiMateria : []).map((doc) => {
    const righeDoc = (perDocente.righe ?? []).filter((r) => r.docente_id === doc.id)
    const agg = new Map<string, Agg>(righeDoc.map((r) => [r.domanda_id, daRiga(r)]))
    return {
      doc,
      agg,
      media: mediaGenerale(righeDoc, domandePerId),
      nSaltati: (saltati.righe ?? []).find((s) => s.docente_id === doc.id)?.n ?? 0,
      conDati: domandeDocente.filter((d) => (agg.get(d.id)?.n ?? 0) > 0),
    }
  })

  const daEsportare = conDati.length > 0 || datiDocenti.some((x) => x.conDati.length > 0)

  // Una riga per domanda: la colonna docente resta vuota per quelle sulla materia
  function esporta() {
    const sullaMateria = conDati.map((d) => ['', '', ...celleDomanda(d, perDomanda.get(d.id))])
    const suiDocenti = datiDocenti.flatMap(({ doc, agg, nSaltati, conDati: suoi }) =>
      suoi.map((d) => [`${doc.cognome} ${doc.nome}`, String(nSaltati), ...celleDomanda(d, agg.get(d.id))]),
    )
    scaricaCsv(nomeFileCsv('materia', nome), [
      ['docente', 'non hanno seguito il docente', ...COLONNE_DOMANDA],
      ...sullaMateria,
      ...suiDocenti,
    ])
  }

  return (
    <div className="space-y-4">
      {(perDocente.errore ?? saltati.errore) && <Avviso>{perDocente.errore ?? saltati.errore}</Avviso>}
      <div className="flex flex-wrap gap-2">
        <Tessera valore={n} etichetta={n === 1 ? 'compilazione' : 'compilazioni'} />
        <Tessera valore={media === null ? '—' : formatta(media)} etichetta="media generale" />
        {vedeDocenti && (
          <Tessera valore={docentiMateria.length} etichetta={docentiMateria.length === 1 ? 'docente' : 'docenti'} />
        )}
        {daEsportare && (
          // Fermo finché non arrivano i dati dei docenti, altrimenti il file uscirebbe senza
          <Pulsante onClick={esporta} disabled={perDocente.righe === null || saltati.righe === null}>
            Esporta CSV
          </Pulsante>
        )}
      </div>

      {conDati.length === 0 ? (
        <Avviso tipo="info">Nessuna risposta per questa materia con i filtri scelti.</Avviso>
      ) : (
        <ElencoDomande domande={conDati}>
          {conDati.map((d) => (
            <RigaDomanda key={d.id} domanda={d} agg={perDomanda.get(d.id)} />
          ))}
        </ElencoDomande>
      )}

      {!vedeDocenti ? (
        <Avviso tipo="info">
          I dati sui singoli docenti sono visibili solo agli admin e a chi è stato autorizzato.
        </Avviso>
      ) : (
        docentiMateria.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Docenti della materia</h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {datiDocenti.map(({ doc, agg: aggDoc, media: medDoc, nSaltati, conDati: conDatiDoc }) => {
                const eAperto = docenteAperto === doc.id
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      aria-expanded={eAperto}
                      onClick={() => setDocenteAperto(eAperto ? null : doc.id)}
                      className="flex min-h-11 w-full flex-wrap items-center gap-x-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1 font-medium">
                        {doc.cognome} {doc.nome}
                      </span>
                      {nSaltati > 0 && (
                        <span className="text-xs text-slate-500">
                          {nSaltati === 1 ? '1 non l’ha seguito' : `${nSaltati} non l’hanno seguito`}
                        </span>
                      )}
                      <span className="w-10 text-right font-semibold tabular-nums">
                        {medDoc === null ? '—' : formatta(medDoc)}
                      </span>
                      <span aria-hidden="true" className="text-slate-500">
                        {eAperto ? '▾' : '▸'}
                      </span>
                    </button>
                    {eAperto && (
                      <div className="px-4 pb-3">
                        {conDatiDoc.length === 0 ? (
                          <p className="text-sm text-slate-500">Nessuna risposta su questo docente.</p>
                        ) : (
                          <ElencoDomande domande={conDatiDoc}>
                            {conDatiDoc.map((d) => (
                              <RigaDomanda key={d.id} domanda={d} agg={aggDoc.get(d.id)} />
                            ))}
                          </ElencoDomande>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      )}
    </div>
  )
}
