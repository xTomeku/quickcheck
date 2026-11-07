import { useState } from 'react'
import PulsanteElimina from '../../../components/PulsanteElimina'
import { Avviso, Azioni, Input, Pulsante, Select } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import {
  CATEGORIE,
  NOME_TIPO,
  nRisposteDi,
  type DomandaElenco,
} from './etichette'
import FormDomanda from './FormDomanda'

export default function Domande() {
  const { righe, errore, ricarica } = useElenco<DomandaElenco>(
    () =>
      supabase
        .from('domande')
        .select('*, collegamenti_domanda(count), risposte(count), risposte_extra(count)')
        .order('ordine')
        .order('created_at'),
    'domande',
  )
  const [modifica, setModifica] = useState<DomandaElenco | 'nuova' | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [categoria, setCategoria] = useState('')
  const [stato, setStato] = useState('')
  const [cerca, setCerca] = useState('')
  const [sposto, setSposto] = useState(false)

  async function cambiaStato(d: DomandaElenco) {
    if (d.attiva && !window.confirm('Disattivare la domanda? Gli studenti non la vedranno più.')) {
      return
    }
    const { error } = await supabase.from('domande').update({ attiva: !d.attiva }).eq('id', d.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  async function duplica(d: DomandaElenco) {
    const [opzioni, collegamenti] = await Promise.all([
      supabase.from('opzioni_risposta').select('testo, ordine').eq('domanda_id', d.id),
      supabase
        .from('collegamenti_domanda')
        .select('materia_id, docente_id, insegnamento_id')
        .eq('domanda_id', d.id),
    ])
    const { data, error } = await supabase
      .from('domande')
      .insert({
        testo: `${d.testo} (copia)`,
        categoria: d.categoria,
        gruppo: d.gruppo,
        mostra_se_domanda_id: d.mostra_se_domanda_id,
        mostra_se_opzioni: d.mostra_se_opzioni,
        ambito_docente: d.ambito_docente,
        tipo_risposta: d.tipo_risposta,
        scala_min: d.scala_min,
        scala_max: d.scala_max,
        etichetta_min: d.etichetta_min,
        etichetta_max: d.etichetta_max,
        obbligatoria: d.obbligatoria,
        ordine: d.ordine,
      })
      .select('id')
      .single()
    if (error || !data) {
      setAvviso(messaggioErrore(error ?? { message: '' }))
      return
    }
    if (opzioni.data && opzioni.data.length > 0) {
      await supabase
        .from('opzioni_risposta')
        .insert(opzioni.data.map((o) => ({ ...o, domanda_id: data.id })))
    }
    if (collegamenti.data && collegamenti.data.length > 0) {
      await supabase
        .from('collegamenti_domanda')
        .insert(collegamenti.data.map((c) => ({ ...c, domanda_id: data.id })))
    }
    setAvviso(null)
    ricarica()
  }

  // Tutte le domande di una categoria nell'ordine in cui le vedono gli studenti
  // (a parità di numero vale la data di creazione, come nella lettura dal database)
  function dellaCategoria(cat: string) {
    return (righe ?? [])
      .filter((d) => d.categoria === cat)
      .sort((a, b) => a.ordine - b.ordine || a.created_at.localeCompare(b.created_at))
  }

  // Sposta una domanda di un posto e rinumera tutta la categoria (10, 20, 30…): così i numeri
  // restano ordinati e non serve più conoscerli
  async function sposta(d: DomandaElenco, verso: -1 | 1) {
    const elenco = dellaCategoria(d.categoria)
    const i = elenco.findIndex((x) => x.id === d.id)
    const j = i + verso
    if (j < 0 || j >= elenco.length) return
    const nuovo = [...elenco]
    ;[nuovo[i], nuovo[j]] = [nuovo[j], nuovo[i]]

    // Una domanda condizionata resta sotto quella da cui dipende, o lo studente vedrebbe prima la conseguenza
    const posizione = new Map(nuovo.map((x, k) => [x.id, k]))
    const fuoriPosto = nuovo.find(
      (x) =>
        x.mostra_se_domanda_id &&
        posizione.has(x.mostra_se_domanda_id) &&
        (posizione.get(x.mostra_se_domanda_id) ?? 0) > (posizione.get(x.id) ?? 0),
    )
    if (fuoriPosto) {
      const genitore = elenco.find((x) => x.id === fuoriPosto.mostra_se_domanda_id)
      setAvviso(
        `«${fuoriPosto.testo}» compare solo in base alla risposta a «${genitore?.testo ?? '…'}»: deve restare sotto quella domanda.`,
      )
      return
    }

    setSposto(true)
    const modifiche = nuovo
      .map((x, k) => ({ id: x.id, ordine: (k + 1) * 10, prima: x.ordine }))
      .filter((x) => x.ordine !== x.prima)
    const esiti = await Promise.all(
      modifiche.map((x) => supabase.from('domande').update({ ordine: x.ordine }).eq('id', x.id)),
    )
    const errore = esiti.find((e) => e.error)?.error
    setAvviso(errore ? messaggioErrore(errore) : null)
    setSposto(false)
    ricarica()
  }

  const filtroAttivo = Boolean(stato || cerca.trim())
  const passaFiltri = (d: DomandaElenco) =>
    (!stato || (stato === 'attiva') === d.attiva) &&
    d.testo.toLowerCase().includes(cerca.trim().toLowerCase())
  const gruppi = CATEGORIE.filter((c) => !categoria || c.id === categoria)
    .map((c) => ({ categoria: c, tutte: dellaCategoria(c.id) }))
    .map((g) => ({ ...g, visibili: g.tutte.filter(passaFiltri) }))
    .filter((g) => g.visibili.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Domande</h1>
          <p className="mt-1 text-sm text-slate-500">
            Le domande nascono come bozza e si attivano quando sono complete. Una domanda attiva si
            modifica solo dopo averla disattivata.
          </p>
        </div>
        <Pulsante variante="primario" onClick={() => setModifica('nuova')}>
          Nuova domanda
        </Pulsante>
      </div>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modifica && (
        <FormDomanda
          key={modifica === 'nuova' ? 'nuova' : modifica.id}
          domanda={modifica === 'nuova' ? null : modifica}
          onAnnulla={() => {
            setModifica(null)
            ricarica()
          }}
          onSalvato={() => {
            setModifica(null)
            setAvviso(null)
            ricarica()
          }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Select aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Select aria-label="Stato" value={stato} onChange={(e) => setStato(e.target.value)}>
          <option value="">Tutti gli stati</option>
          <option value="attiva">Attive</option>
          <option value="non-attiva">Non attive (bozze e disattivate)</option>
        </Select>
        <Input
          placeholder="Cerca nel testo"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      </div>

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : gruppi.length === 0 ? (
        <Avviso tipo="info">
          {righe.length === 0
            ? 'Nessuna domanda. Creane una con «Nuova domanda».'
            : 'Nessuna domanda corrisponde ai filtri.'}
        </Avviso>
      ) : (
        <>
          {filtroAttivo && (
            <p className="text-sm text-slate-500">
              Con la ricerca o il filtro sullo stato l'ordine non si cambia: toglili per usare le frecce.
            </p>
          )}
          {gruppi.map(({ categoria: c, tutte, visibili }) => (
            <section key={c.id} className="space-y-2">
              <h2 className="font-semibold text-slate-700">
                {c.nome} <span className="font-normal text-slate-500">· {tutte.length}</span>
              </h2>
              <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {visibili.map((d) => {
                  const nRisposte = nRisposteDi(d)
                  const nColl = d.collegamenti_domanda[0]?.count ?? 0
                  const posto = tutte.findIndex((x) => x.id === d.id)
                  const bloccaFrecce = filtroAttivo || sposto
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="w-6 text-right text-sm text-slate-500 tabular-nums">{posto + 1}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label={`Sposta su «${d.testo}»`}
                            title="Sposta su"
                            disabled={bloccaFrecce || posto === 0}
                            onClick={() => sposta(d, -1)}
                            className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-grafite disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label={`Sposta giù «${d.testo}»`}
                            title="Sposta giù"
                            disabled={bloccaFrecce || posto === tutte.length - 1}
                            onClick={() => sposta(d, 1)}
                            className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-grafite disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{d.testo}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              d.attiva ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {d.attiva ? 'Attiva' : nRisposte > 0 ? 'Disattivata' : 'Bozza'}
                          </span>
                          {d.gruppo && <span>Gruppo «{d.gruppo}»</span>}
                          {d.mostra_se_domanda_id && (
                            <span>
                              · Solo se «
                              {(righe ?? []).find((x) => x.id === d.mostra_se_domanda_id)?.testo ?? '…'}»
                            </span>
                          )}
                          <span>· {NOME_TIPO[d.tipo_risposta] ?? d.tipo_risposta}</span>
                          {(d.categoria === 'specifica_materia' || d.categoria === 'specifica_docente') && (
                            <span>· {nColl} collegamenti</span>
                          )}
                          <span>· {nRisposte} risposte</span>
                        </p>
                      </div>
                      <Azioni>
                        <Pulsante
                          disabled={d.attiva}
                          title={d.attiva ? 'Disattiva la domanda per modificarla' : undefined}
                          onClick={() => setModifica(d)}
                        >
                          Modifica
                        </Pulsante>
                        <Pulsante onClick={() => duplica(d)}>Duplica</Pulsante>
                        <Pulsante
                          variante={d.attiva ? 'pericolo' : 'primario'}
                          onClick={() => cambiaStato(d)}
                        >
                          {d.attiva ? 'Disattiva' : 'Attiva'}
                        </Pulsante>
                        <PulsanteElimina
                          tipo="domanda"
                          id={d.id}
                          nome={d.testo}
                          onEliminata={ricarica}
                          onMessaggio={setAvviso}
                        />
                      </Azioni>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
