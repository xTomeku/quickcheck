import { useMemo, useState } from 'react'
import { argomento, FORMATO, MATERIE, NOMI_BREVI, ORDINE_MATERIE } from '../lib/dati'
import type { MateriaId } from '../types'
import { leggiCartella, scegliCartella, scriviFile, supportata, type ManicoCartella } from './cartella'
import {
  ETICHETTE_STATO,
  leggiImport,
  nuovoId,
  perFile,
  problemi,
  statoDi,
  type Bozza,
  type FileMateria,
  type Importata,
  type Stato,
} from './modello'
import { Editor } from './Editor'

type Archivio = Record<MateriaId, FileMateria>

/** Una domanda con la materia del file in cui sta: la materia non è scritta dentro la domanda. */
interface Voce {
  materia: MateriaId
  d: Bozza
}

export default function Admin() {
  const [cartella, setCartella] = useState<ManicoCartella | null>(null)
  const [archivio, setArchivio] = useState<Archivio | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [materia, setMateria] = useState<MateriaId | 'tutte'>('tutte')
  const [stato, setStato] = useState<Stato | 'tutti'>('tutti')
  const [arg, setArg] = useState('tutti')
  const [cerca, setCerca] = useState('')
  const [aperta, setAperta] = useState<Voce | null>(null)
  const [importa, setImporta] = useState(false)

  const apri = async () => {
    setErrore(null)
    try {
      const c = await scegliCartella()
      const letto = await leggiCartella(c)
      setCartella(c)
      setArchivio(letto)
      const totale = ORDINE_MATERIE.reduce((s, m) => s + letto[m].domande.length, 0)
      setAvviso(
        totale === 0
          ? `In "${c.name}" non ho trovato nessuna domanda: se non è public/domande, riaprila.`
          : `Aperta "${c.name}": ${totale} domande.`,
      )
    } catch (e) {
      // l'utente che chiude il selettore non è un errore da mostrare
      if (e instanceof DOMException && e.name === 'AbortError') return
      setErrore(e instanceof Error ? e.message : 'Non sono riuscito ad aprire la cartella.')
    }
  }

  const ricarica = async () => {
    if (!cartella) return
    setErrore(null)
    try {
      setArchivio(await leggiCartella(cartella))
      setAvviso('Riletta la cartella.')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non sono riuscito a rileggere la cartella.')
    }
  }

  /** Riscrive i file toccati: una domanda spostata di materia esce da un file ed entra nell'altro. */
  const applica = async (nuove: Importata[], messaggio: string) => {
    if (!cartella || !archivio) return
    const ids = new Set(nuove.map((n) => n.domanda.id))
    const toccate = new Set<MateriaId>(nuove.map((n) => n.materia))
    const aggiornato = { ...archivio } as Archivio
    for (const m of ORDINE_MATERIE) {
      const restano = archivio[m].domande.filter((d) => !ids.has(d.id))
      if (restano.length !== archivio[m].domande.length) toccate.add(m)
      aggiornato[m] = { ...archivio[m], domande: restano }
    }
    for (const n of nuove) {
      aggiornato[n.materia] = { ...aggiornato[n.materia], domande: [...aggiornato[n.materia].domande, n.domanda] }
    }
    for (const m of toccate) await scriviFile(cartella, aggiornato[m])
    setArchivio(aggiornato)
    if (messaggio) setAvviso(messaggio)
  }

  const voci: Voce[] = useMemo(() => {
    if (!archivio) return []
    return ORDINE_MATERIE.flatMap((m) => archivio[m].domande.map((d) => ({ materia: m, d: d as Bozza })))
  }, [archivio])

  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return voci
      .filter((v) => materia === 'tutte' || v.materia === materia)
      .filter((v) => stato === 'tutti' || statoDi(v.d) === stato)
      .filter((v) => arg === 'tutti' || v.d.argomento === arg)
      .filter((v) => !q || v.d.testo.toLowerCase().includes(q) || v.d.id.toLowerCase().includes(q))
      .sort((a, b) => a.d.argomento.localeCompare(b.d.argomento, 'it', { numeric: true }) || a.d.id.localeCompare(b.d.id))
  }, [voci, materia, stato, arg, cerca])

  if (!cartella || !archivio) {
    return (
      <main className="pagina admin admin-accesso">
        <h1>Pannello domande</h1>
        <p>
          Apre i file <code>public/domande/</code> direttamente dal disco: quello che salvi qui finisce nei file del progetto, da ricompilare
          con <code>npm run pubblica</code>. Non c&rsquo;è nessun server di mezzo.
        </p>
        {supportata() ? null : (
          <p className="errore">Questo browser non sa aprire una cartella dalla pagina: serve Chrome o Edge.</p>
        )}
        {errore ? (
          <p role="alert" className="errore">
            {errore}
          </p>
        ) : null}
        <div className="bottoni">
          <button type="button" className="btn btn-primario" disabled={!supportata()} onClick={() => void apri()}>
            Apri la cartella domande
          </button>
          <a className="btn btn-testo" href="./">
            Torna al simulatore
          </a>
        </div>
      </main>
    )
  }

  const conteggi = ORDINE_MATERIE.map((m) => {
    const tutte = archivio[m].domande as Bozza[]
    const approvate = tutte.filter((d) => statoDi(d) === 'approvata')
    return {
      m,
      approvate: approvate.length,
      multiple: approvate.filter((d) => d.tipo === 'multipla').length,
      completamenti: approvate.filter((d) => d.tipo === 'completamento').length,
      bozze: tutte.filter((d) => statoDi(d) === 'bozza').length,
      scartate: tutte.filter((d) => statoDi(d) === 'scartata').length,
    }
  })

  return (
    <main className="pagina admin">
      <header className="admin-testata">
        <div>
          <h1>Pannello domande</h1>
          <p>
            Cartella <code>{cartella.name}</code>
          </p>
        </div>
        <div className="bottoni">
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => {
              const m = materia === 'tutte' ? 'biologia' : materia
              setAperta({
                materia: m,
                d: {
                  id: nuovoId(m),
                  argomento: arg !== 'tutti' ? arg : MATERIE[m].argomenti[0].id,
                  tipo: 'multipla',
                  testo: '',
                  opzioni: ['', '', '', '', ''],
                  corretta: 0,
                  stato: 'bozza',
                  fonte: 'manuale',
                },
              })
            }}
          >
            Nuova domanda
          </button>
          <button type="button" className="btn btn-secondario" onClick={() => setImporta(true)}>
            Importa JSON
          </button>
          <button type="button" className="btn btn-testo" onClick={() => void ricarica()}>
            Rileggi i file
          </button>
        </div>
      </header>

      {errore ? (
        <p role="alert" className="errore">
          {errore}
        </p>
      ) : null}
      {avviso ? (
        <p role="status" className="admin-avviso">
          {avviso}{' '}
          <button type="button" className="link-sommesso" onClick={() => setAvviso(null)}>
            Chiudi
          </button>
        </p>
      ) : null}

      <section className="admin-conteggi" aria-label="Domande per materia">
        {conteggi.map((c) => {
          const scarse = c.multiple < FORMATO.multipla || c.completamenti < FORMATO.completamento
          return (
            <div key={c.m} className="admin-conteggio">
              <strong>{NOMI_BREVI[c.m]}</strong>
              <span className="num">
                {c.approvate} approvate ({c.multiple} multiple, {c.completamenti} completamenti)
              </span>
              <span className="num">
                {c.bozze} bozze, {c.scartate} scartate
              </span>
              {scarse ? (
                <span className="errore">
                  Per una prova servono almeno {FORMATO.multipla} multiple e {FORMATO.completamento} completamenti approvati.
                </span>
              ) : null}
            </div>
          )
        })}
      </section>

      <section className="admin-filtri" aria-label="Filtri">
        <label>
          Materia
          <select
            id="filtro-materia"
            value={materia}
            onChange={(e) => {
              setMateria(e.target.value as MateriaId | 'tutte')
              setArg('tutti')
            }}
          >
            <option value="tutte">Tutte</option>
            {ORDINE_MATERIE.map((m) => (
              <option key={m} value={m}>
                {NOMI_BREVI[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Argomento
          <select id="filtro-argomento" value={arg} onChange={(e) => setArg(e.target.value)} disabled={materia === 'tutte'}>
            <option value="tutti">Tutti</option>
            {materia !== 'tutte'
              ? MATERIE[materia].argomenti.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id.split('.').slice(1).join('.')} {a.titolo}
                  </option>
                ))
              : null}
          </select>
        </label>
        <label className="cresce">
          Cerca
          <input id="filtro-cerca" type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Testo o codice" />
        </label>
        <div className="revisione-filtri" role="group" aria-label="Stato">
          {(['tutti', 'bozza', 'approvata', 'scartata'] as const).map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={stato === s} onClick={() => setStato(s)}>
              {s === 'tutti' ? 'Tutte' : ETICHETTE_STATO[s]}
            </button>
          ))}
        </div>
      </section>

      {filtrate.length === 0 ? (
        <p className="vuoto">
          {voci.length === 0 ? 'Nessuna domanda nei file. Importa un JSON o crea la prima.' : 'Nessuna domanda con questi filtri.'}
        </p>
      ) : (
        <>
          <p className="admin-totale num">
            {filtrate.length} {filtrate.length === 1 ? 'domanda' : 'domande'}
            {filtrate.length > 200 ? ', mostrate le prime 200' : ''}
          </p>
          <ul className="admin-lista">
            {filtrate.slice(0, 200).map((v) => {
              const pr = problemi(v.d, v.materia)
              return (
                <li key={`${v.materia}-${v.d.id}`}>
                  <button type="button" className="admin-riga" onClick={() => setAperta(v)}>
                    <span className={`pill pill-${statoDi(v.d)}`}>{ETICHETTE_STATO[statoDi(v.d)]}</span>
                    <span className="admin-riga-testo">
                      <span className="admin-meta">
                        {v.d.id}, {v.d.tipo === 'multipla' ? 'multipla' : 'completamento'},{' '}
                        {argomento(v.d.argomento)?.titolo ?? v.d.argomento}
                      </span>
                      <span>{v.d.testo}</span>
                      {pr.length ? <span className="errore">{pr.join(', ')}</span> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {aperta ? (
        <Editor
          bozza={aperta.d}
          materia={aperta.materia}
          onChiudi={() => setAperta(null)}
          onSalva={async (b, dove, messaggio) => {
            await applica([{ materia: dove, domanda: perFile(b) }], messaggio)
            setAperta(null)
          }}
        />
      ) : null}

      {importa ? (
        <Import
          onChiudi={() => setImporta(false)}
          onImporta={async (lista) => {
            await applica(lista, `Importate ${lista.length} domande.`)
            setImporta(false)
            setStato('tutti')
          }}
        />
      ) : null}
    </main>
  )
}

function Import({ onChiudi, onImporta }: { onChiudi: () => void; onImporta: (v: Importata[]) => Promise<void> }) {
  const [testo, setTesto] = useState('')
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const esito = useMemo(() => (testo.trim() ? leggiImport(testo) : null), [testo])
  return (
    <div className="admin-modale" role="dialog" aria-modal="true" aria-labelledby="titolo-import">
      <div className="admin-modale-corpo">
        <h2 id="titolo-import">Importa domande</h2>
        <p>
          Un JSON nel formato della banca (un array, o un oggetto con il campo &ldquo;domande&rdquo;). Le domande senza stato entrano come
          bozza; quelle con un codice che esiste già sostituiscono la vecchia.
        </p>
        <input
          id="import-file"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) setTesto(await f.text())
          }}
        />
        <label htmlFor="import-testo">Oppure incolla il JSON</label>
        <textarea id="import-testo" rows={8} value={testo} onChange={(e) => setTesto(e.target.value)} />
        {esito ? (
          <div className="admin-import-esito">
            <p>
              <strong className="num">{esito.importate.length}</strong> domande pronte da importare.
            </p>
            {esito.errori.length ? (
              <ul className="errore">
                {esito.errori.slice(0, 12).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {esito.errori.length > 12 ? <li>…e altri {esito.errori.length - 12} avvisi.</li> : null}
              </ul>
            ) : null}
          </div>
        ) : null}
        {errore ? (
          <p role="alert" className="errore">
            {errore}
          </p>
        ) : null}
        <div className="bottoni">
          <button
            type="button"
            className="btn btn-primario"
            disabled={!esito || esito.importate.length === 0 || lavoro}
            onClick={async () => {
              setLavoro(true)
              setErrore(null)
              try {
                await onImporta(esito!.importate)
              } catch (e) {
                setErrore(e instanceof Error ? e.message : 'Importazione non riuscita.')
              } finally {
                setLavoro(false)
              }
            }}
          >
            {lavoro ? 'Importo…' : `Importa ${esito?.importate.length ?? 0} domande`}
          </button>
          <button type="button" className="btn btn-secondario" onClick={onChiudi}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
