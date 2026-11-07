import { useState } from 'react'
import { Avviso } from '../../../components/ui'
import { normalizza } from '../../../lib/nomi'
import {
  AGG_VUOTO,
  daRiga,
  formatta,
  media,
  unisci,
  type Agg,
  type RigaStat,
} from '../../../lib/statistiche'
import Classifica, { Tessera, type VoceClassifica } from './Classifica'
import {
  CATEGORIE_DOCENTE,
  mediaGenerale,
  useStatRisposte,
  useStatSaltati,
  useTesti,
  voci,
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
  domande: DomandaRif[]
  materie: MateriaRif[]
  materieCorso: MateriaCorsoRif[]
  docenti: DocenteRif[]
  insegnamenti: InsegnamentoRif[]
}

// Tutti i docenti delle materie filtrate, in classifica
export default function PerDocente({
  filtri,
  contesto,
  ricerca,
  domande,
  materie,
  materieCorso,
  docenti,
  insegnamenti,
}: Props) {
  const { righe, errore } = useStatRisposte(filtri, 'domanda_docente', true)
  const [aperto, setAperto] = useState<string | null>(null)

  const nomeMateria = new Map(materie.map((m) => [m.id, m.nome]))
  const domandePerId = new Map(domande.map((d) => [d.id, d]))

  const materiePossibili = new Set(
    materieCorso
      .filter((mc) => !filtri.corso || mc.corso_id === filtri.corso)
      .filter((mc) => !filtri.annoCorso || mc.anno === Number(filtri.annoCorso))
      .map((mc) => mc.materia_id),
  )

  const righePerDocente = new Map<string, RigaStat[]>()
  for (const r of righe ?? []) {
    if (r.docente_id) righePerDocente.set(r.docente_id, [...(righePerDocente.get(r.docente_id) ?? []), r])
  }

  const elencoCompleto: VoceClassifica[] = docenti.flatMap((d) => {
    const suoi = insegnamenti.filter((i) => i.docente_id === d.id && materiePossibili.has(i.materia_id))
    if (suoi.length === 0) return []
    const righeDoc = righePerDocente.get(d.id) ?? []
    return [
      {
        id: d.id,
        nome: `${d.cognome} ${d.nome}`,
        dettaglio: suoi.map((i) => nomeMateria.get(i.materia_id) ?? '?').join(', '),
        // Chi ha valutato il docente: le domande possono avere conteggi diversi, vale la più risposta
        n: righeDoc.reduce((massimo, r) => Math.max(massimo, r.n), 0),
        media: mediaGenerale(righeDoc, domandePerId),
      },
    ]
  })

  const parole = normalizza(ricerca).split(' ').filter(Boolean)
  const elenco = elencoCompleto.filter((v) => {
    const nome = normalizza(v.nome)
    return parole.every((p) => nome.includes(p))
  })
  const senzaValutazioni = elencoCompleto.filter((v) => v.n === 0).length

  if (righe === null) {
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
        <strong>{elencoCompleto.length}</strong> {elencoCompleto.length === 1 ? 'docente' : 'docenti'}
        {senzaValutazioni > 0 && (
          <>
            {' '}
            · <strong>{senzaValutazioni}</strong> senza valutazioni
          </>
        )}
      </p>
      {elenco.length === 0 ? (
        <Avviso tipo="info">
          {elencoCompleto.length === 0
            ? 'Nessun docente corrisponde ai filtri.'
            : `Nessun docente si chiama «${ricerca}».`}
        </Avviso>
      ) : (
        <Classifica
          voci={elenco}
          nomeColonna="Docente"
          etichettaN="Valutazioni"
          aperta={aperto}
          onApri={setAperto}
          renderDettaglio={(id) => {
            const voce = elenco.find((v) => v.id === id)
            return (
              <DettaglioDocente
                filtri={{ ...filtri, docente: id }}
                contesto={[...contesto, ['Docente', voce?.nome ?? '']]}
                nome={voce?.nome ?? ''}
                n={voce?.n ?? 0}
                mediaDocente={voce?.media ?? null}
                domande={domande}
                nomeMateria={nomeMateria}
              />
            )
          }}
        />
      )}
    </div>
  )
}

// Le domande sul docente, su tutte le materie in cui insegna
function DettaglioDocente({
  filtri,
  contesto,
  nome,
  n,
  mediaDocente,
  domande,
  nomeMateria,
}: {
  filtri: Filtri
  contesto: Contesto
  nome: string
  n: number
  mediaDocente: number | null
  domande: DomandaRif[]
  nomeMateria: Map<string, string>
}) {
  const { righe, errore } = useStatRisposte(filtri, 'domanda_materia', true)
  const saltati = useStatSaltati(filtri, true)
  const testi = useTesti(filtri, true)

  // I testi sul docente, con la materia in cui sono stati scritti
  const testiDi = (domandaId: string) =>
    (testi.righe ?? [])
      .filter((t) => t.domanda_id === domandaId)
      .map((t) => ({ ...t, etichetta: nomeMateria.get(t.materia_id) ?? '?' }))
  const scritte = domande
    .filter((d) => CATEGORIE_DOCENTE.includes(d.categoria) && d.tipo_risposta === 'testo')
    .filter((d) => testiDi(d.id).length > 0)
    .sort((a, b) => a.ordine - b.ordine)

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
    .filter((d) => CATEGORIE_DOCENTE.includes(d.categoria) && perDomanda.has(d.id))
    .sort((a, b) => a.ordine - b.ordine)

  const saltatiPerMateria = new Map<string, number>()
  for (const s of saltati.righe ?? []) {
    const materia = nomeMateria.get(s.materia_id) ?? '?'
    saltatiPerMateria.set(materia, (saltatiPerMateria.get(materia) ?? 0) + s.n)
  }

  // Per ogni domanda il totale e, se il docente ha più materie, una riga per ciascuna
  function esporta() {
    const elenco: VoceEsportazione[] = conDati.flatMap((d) => {
      const dati = perDomanda.get(d.id)!
      const perMateria: VoceEsportazione[] = [...dati.perMateria]
        .sort((a, b) => a.materia.localeCompare(b.materia))
        .map((m) => ({ colonne: [m.materia, saltatiPerMateria.get(m.materia) ?? 0], domanda: d, agg: m.agg }))
      const totale = { colonne: ['Tutte le materie', nSaltati], domanda: d, agg: dati.totale }
      return perMateria.length > 1 ? [totale, ...perMateria] : perMateria
    })
    return esportaExcel({
      nomeFile: nomeFile('docente', nome),
      contesto,
      titoliColonne: ['Materia', 'Non l’hanno seguito'],
      voci: elenco,
      testi: {
        titoli: ['Materia'],
        righe: scritte.flatMap((d) =>
          testiDi(d.id)
            .filter((t) => !t.nascosta)
            .map((t) => ({ colonne: [t.etichetta], domanda: d.testo, testo: t.testo })),
        ),
      },
    })
  }

  return (
    <div className="space-y-4">
      {(errore ?? saltati.errore) && <Avviso>{errore ?? saltati.errore}</Avviso>}
      <div className="flex flex-wrap gap-2">
        <Tessera valore={n} etichetta={n === 1 ? 'valutazione' : 'valutazioni'} />
        <Tessera valore={mediaDocente === null ? '—' : formatta(mediaDocente)} etichetta="media generale" />
        <Tessera valore={nSaltati} etichetta="non l’hanno seguito" />
        {(conDati.length > 0 || scritte.length > 0) && (
          <PulsanteEsporta onEsporta={esporta} disabled={saltati.righe === null || testi.righe === null} />
        )}
      </div>
      {testi.errore && <Avviso>{testi.errore}</Avviso>}
      {scritte.map((d) => (
        <RisposteScritte key={d.id} domanda={d} voci={testiDi(d.id)} onCambiato={testi.ricarica} />
      ))}
      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : conDati.length === 0 ? (
        scritte.length === 0 && (
          <Avviso tipo="info">Nessuna risposta su questo docente con i filtri scelti.</Avviso>
        )
      ) : (
        <ElencoDomande domande={conDati}>
          {conDati.map((d) => {
            const dati = perDomanda.get(d.id)!
            return (
              <RigaDomanda key={d.id} domanda={d} agg={dati.totale}>
                {dati.perMateria.length > 1 && (
                  <ul className="rounded-lg bg-slate-50 px-3 py-1 text-xs">
                    {[...dati.perMateria]
                      .sort((a, b) => a.materia.localeCompare(b.materia))
                      .map((m) => {
                        const med = d.tipo_risposta === 'scala' ? media(m.agg) : null
                        return (
                          <li key={m.materia} className="flex flex-wrap justify-between gap-2 py-1">
                            <span>{m.materia}</span>
                            <span className="text-slate-600 tabular-nums">
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
              </RigaDomanda>
            )
          })}
        </ElencoDomande>
      )}
    </div>
  )
}
