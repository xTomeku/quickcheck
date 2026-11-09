import { useState } from 'react'
import { Avviso } from '../../../components/ui'
import { normalizza } from '../../../lib/nomi'
import { daRiga, formatta, type Agg, type RigaStat } from '../../../lib/statistiche'
import Classifica, { Tessera, type VoceClassifica } from './Classifica'
import {
  CATEGORIE_DOCENTE,
  mediaGenerale,
  useStatCompilazioni,
  useStatRisposte,
  useStatSaltati,
  useTesti,
  type CorsoRif,
  type DocenteRif,
  type DomandaRif,
  type InsegnamentoRif,
  type MateriaCorsoRif,
  type MateriaRif,
} from './dati'
import { esportaExcel, nomeFile, type Contesto, type VoceEsportazione } from './esporta'
import type { Filtri } from './filtri'
import PulsanteEsporta from './PulsanteEsporta'
import RigaDomanda, { ElencoDomande } from './RigaDomanda'
import RisposteScritte from './RisposteScritte'

type Props = {
  filtri: Filtri
  contesto: Contesto
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
  contesto,
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

  const corsiDelTipo = new Set(
    corsi.filter((c) => !filtri.tipoCorso || c.tipo === filtri.tipoCorso).map((c) => c.id),
  )

  // Una materia può stare in più corsi: una riga sola, perché le medie sono per materia
  const elencoCompleto: VoceClassifica[] = materie.flatMap((m) => {
    const legami = materieCorso
      .filter((mc) => mc.materia_id === m.id && corsiDelTipo.has(mc.corso_id))
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
                contesto={[...contesto, ['Materia', voce?.nome ?? '']]}
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
  contesto,
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
  contesto: Contesto
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
  const testi = useTesti(filtri, true)
  const [docenteAperto, setDocenteAperto] = useState<string | null>(null)

  // Le domande a risposta scritta che hanno almeno un testo, per la materia o per un docente
  const testiDi = (domandaId: string, docenteId: string | null) =>
    (testi.righe ?? []).filter((t) => t.domanda_id === domandaId && t.docente_id === docenteId)
  const scritteMateria = domande
    .filter((d) => d.tipo_risposta === 'testo' && !CATEGORIE_DOCENTE.includes(d.categoria))
    .filter((d) => testiDi(d.id, null).length > 0)
    .sort((a, b) => a.ordine - b.ordine)

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
      scritte: domandeDocente.filter((d) => d.tipo_risposta === 'testo' && testiDi(d.id, doc.id).length > 0),
    }
  })

  const daEsportare =
    conDati.length > 0 ||
    scritteMateria.length > 0 ||
    datiDocenti.some((x) => x.conDati.length > 0 || x.scritte.length > 0)

  // Prima le domande sulla materia (trattino al posto del docente), poi quelle su ogni docente
  function esporta() {
    const sullaMateria: VoceEsportazione[] = conDati.map((d) => ({
      colonne: ['—', ''],
      domanda: d,
      agg: perDomanda.get(d.id),
    }))
    const suiDocenti: VoceEsportazione[] = datiDocenti.flatMap(({ doc, agg, nSaltati, conDati: suoi }) =>
      suoi.map((d) => ({ colonne: [`${doc.cognome} ${doc.nome}`, nSaltati], domanda: d, agg: agg.get(d.id) })),
    )
    return esportaExcel({
      nomeFile: nomeFile('materia', nome),
      contesto,
      titoliColonne: ['Docente', 'Non l’hanno seguito'],
      voci: [...sullaMateria, ...suiDocenti],
      testi: {
        titoli: ['Docente'],
        righe: [
          ...scritteMateria.flatMap((d) =>
            testiDi(d.id, null)
              .filter((t) => !t.nascosta)
              .map((t) => ({ colonne: ['—'], domanda: d.testo, testo: t.testo })),
          ),
          ...datiDocenti.flatMap(({ doc, scritte }) =>
            scritte.flatMap((d) =>
              testiDi(d.id, doc.id)
                .filter((t) => !t.nascosta)
                .map((t) => ({ colonne: [`${doc.cognome} ${doc.nome}`], domanda: d.testo, testo: t.testo })),
            ),
          ),
        ],
      },
    })
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
          <PulsanteEsporta
            onEsporta={esporta}
            disabled={perDocente.righe === null || saltati.righe === null || testi.righe === null}
          />
        )}
      </div>

      {testi.errore && <Avviso>{testi.errore}</Avviso>}
      {conDati.length === 0 && scritteMateria.length === 0 ? (
        <Avviso tipo="info">Nessuna risposta per questa materia con i filtri scelti.</Avviso>
      ) : (
        <>
          {conDati.length > 0 && (
            <ElencoDomande domande={conDati}>
              {conDati.map((d) => (
                <RigaDomanda key={d.id} domanda={d} agg={perDomanda.get(d.id)} />
              ))}
            </ElencoDomande>
          )}
          {scritteMateria.map((d) => (
            <RisposteScritte key={d.id} domanda={d} voci={testiDi(d.id, null)} onCambiato={testi.ricarica} />
          ))}
        </>
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
              {datiDocenti.map(({ doc, agg: aggDoc, media: medDoc, nSaltati, conDati: conDatiDoc, scritte }) => {
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
                      <div className="space-y-2 px-4 pb-3">
                        {conDatiDoc.length === 0 && scritte.length === 0 ? (
                          <p className="text-sm text-slate-500">Nessuna risposta su questo docente.</p>
                        ) : (
                          conDatiDoc.length > 0 && (
                            <ElencoDomande domande={conDatiDoc}>
                              {conDatiDoc.map((d) => (
                                <RigaDomanda key={d.id} domanda={d} agg={aggDoc.get(d.id)} />
                              ))}
                            </ElencoDomande>
                          )
                        )}
                        {scritte.map((d) => (
                          <RisposteScritte
                            key={d.id}
                            domanda={d}
                            voci={testiDi(d.id, doc.id)}
                            onCambiato={testi.ricarica}
                          />
                        ))}
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
