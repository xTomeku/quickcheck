import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Domanda, Prova, Risposta, Sezione } from '../types'
import { minutiSezione, NOMI_BREVI } from '../lib/dati'
import { FoglioRisposte } from './FoglioRisposte'
import { LETTERE, Testo } from './Testo'

interface Props {
  prova: Prova
  banca: Map<string, Domanda>
  onCambia: (p: Prova) => void
  onFine: (p: Prova) => void
  onEsci: () => void
}

/** Una sezione intera dura 50 minuti, un ripasso in proporzione alle sue domande. */
const durataMs = (s: Sezione) => minutiSezione(s.domande.length) * 60_000

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const vuota = (r: Risposta | undefined) => r === undefined || r === null || (typeof r === 'string' && r.trim() === '')

export function Esame({ prova, banca, onCambia, onFine, onEsci }: Props) {
  const sezione = prova.sezioni[prova.corrente]
  const [indice, setIndice] = useState(0)
  const [ora, setOra] = useState(() => Date.now())
  const [conferma, setConferma] = useState(false)
  const [foglioAperto, setFoglioAperto] = useState(false)
  const [apertaA] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  const aggiornaSezione = useCallback(
    (modifica: (s: Sezione) => Sezione) => {
      const sezioni = prova.sezioni.slice()
      sezioni[prova.corrente] = modifica(sezioni[prova.corrente])
      onCambia({ ...prova, sezioni })
    },
    [prova, onCambia],
  )

  // avvia il cronometro della sezione la prima volta che viene mostrata
  useEffect(() => {
    if (sezione.scadenza === null) aggiornaSezione((s) => ({ ...s, scadenza: Date.now() + durataMs(s) }))
    setIndice(0)
    setConferma(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prova.corrente])

  useEffect(() => {
    const t = window.setInterval(() => setOra(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [])

  const consegna = useCallback(() => {
    const sezioni = prova.sezioni.slice()
    sezioni[prova.corrente] = { ...sezioni[prova.corrente], consegnata: true }
    const ultima = prova.corrente === prova.sezioni.length - 1
    const aggiornata: Prova = { ...prova, sezioni, corrente: ultima ? prova.corrente : prova.corrente + 1, conclusa: ultima }
    setConferma(false)
    setFoglioAperto(false)
    window.scrollTo({ top: 0 })
    if (ultima) onFine(aggiornata)
    else onCambia(aggiornata)
  }, [prova, onCambia, onFine])

  const rimasto = sezione.scadenza === null ? durataMs(sezione) : sezione.scadenza - ora

  /**
   * Scaduta prima ancora che aprissimo la pagina: il tempo è finito mentre lo studente era via.
   * Qui non consegniamo di nostra iniziativa, perché si ritroverebbe davanti una correzione che
   * non si aspetta: glielo diciamo e consegna lui. Se invece il tempo finisce mentre è davanti
   * allo schermo, la consegna automatica resta, com'è alla prova vera.
   */
  const scadutaDaAssente = sezione.scadenza !== null && sezione.scadenza <= apertaA && !sezione.consegnata

  useEffect(() => {
    if (sezione.scadenza !== null && rimasto <= 0 && !sezione.consegnata && !scadutaDaAssente) consegna()
  }, [rimasto, sezione.scadenza, sezione.consegnata, consegna, scadutaDaAssente])
  const ultimi = rimasto <= 5 * 60_000

  const q = sezione.domande[indice]
  const d = banca.get(q.id)!
  const risposta = sezione.risposte[q.id] ?? null
  const dubbia = sezione.dubbi.includes(q.id)
  const senzaRisposta = useMemo(() => sezione.domande.filter((x) => vuota(sezione.risposte[x.id])).length, [sezione])

  const rispondi = (r: Risposta) => aggiornaSezione((s) => ({ ...s, risposte: { ...s.risposte, [q.id]: r } }))
  const vai = (i: number) => {
    setIndice(Math.min(Math.max(i, 0), sezione.domande.length - 1))
    setFoglioAperto(false)
    const top = document.querySelector('.domanda')?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + top - 120) })
  }
  const alternaDubbio = () =>
    aggiornaSezione((s) => ({ ...s, dubbi: dubbia ? s.dubbi.filter((x) => x !== q.id) : [...s.dubbi, q.id] }))

  // tastiera: A–E o 1–5 per scegliere, frecce per spostarsi (non mentre si scrive)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey || conferma) return
      if (e.key === 'ArrowRight') vai(indice + 1)
      else if (e.key === 'ArrowLeft') vai(indice - 1)
      else if (d.tipo === 'multipla') {
        const k = e.key.toUpperCase()
        const pos = LETTERE.indexOf(k) >= 0 ? LETTERE.indexOf(k) : ['1', '2', '3', '4', '5'].indexOf(k)
        if (pos >= 0 && q.ordine) rispondi(risposta === q.ordine[pos] ? null : q.ordine[pos])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (d.tipo === 'completamento' && window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus()
  }, [indice, d.tipo])

  // la conferma è una finestra sopra la pagina: Esc la chiude, e la pagina sotto non scorre
  useEffect(() => {
    if (!conferma) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConferma(false)
    }
    window.addEventListener('keydown', onEsc)
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prima
    }
  }, [conferma])

  const nomeSezione = NOMI_BREVI[sezione.materia]
  const piuSezioni = prova.sezioni.length > 1

  if (scadutaDaAssente) {
    const ultima = prova.corrente === prova.sezioni.length - 1
    const prossima = ultima ? null : NOMI_BREVI[prova.sezioni[prova.corrente + 1].materia].toLowerCase()
    const date = sezione.domande.length - senzaRisposta
    return (
      <main className="pagina pagina-avviso">
        <div className="conferma">
          <h2>Il tempo di {nomeSezione.toLowerCase()} è finito mentre eri via</h2>
          <p>
            Il cronometro va avanti anche a scheda chiusa, come alla prova vera. Le risposte che avevi dato sono salvate:{' '}
            <strong className="num">
              {date} su {sezione.domande.length}
            </strong>
            , le altre contano come non date.
          </p>
          <div className="bottoni">
            <button type="button" className="btn btn-primario" onClick={consegna}>
              {ultima ? 'Vedi la correzione' : `Continua con ${prossima}`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <header className="barra-esame">
        <div className="interno">
          <div className="dove">
            <strong>{nomeSezione}</strong>
            <span>
              {prova.modalita === 'ripasso'
                ? piuSezioni
                  ? `Ripasso, sezione ${prova.corrente + 1} di ${prova.sezioni.length}`
                  : 'Ripasso'
                : piuSezioni
                  ? `Sezione ${prova.corrente + 1} di ${prova.sezioni.length}`
                  : 'Prova di una materia'}
              {', '}domanda {indice + 1} di {sezione.domande.length}
            </span>
          </div>
          <div className={`timer${ultimi ? ' ultimi' : ''}`} role="timer" aria-label={`Tempo rimasto ${mmss(rimasto)}`}>
            {mmss(rimasto)}
            <small>{ultimi ? 'ultimi minuti' : 'tempo rimasto'}</small>
          </div>
          <span className="visually-hidden" aria-live="polite">
            {ultimi ? 'Mancano meno di 5 minuti alla fine della sezione' : ''}
          </span>
          <button type="button" className="btn btn-secondario consegna" onClick={() => setConferma(true)}>
            Consegna<span className="solo-desktop-inline"> {nomeSezione.toLowerCase()}</span>
          </button>
        </div>
      </header>

      <main className="pagina esame">
        <div className="domanda">
          {conferma ? (
            <div className="conferma-sfondo" onClick={() => setConferma(false)}>
            <section
              className="conferma conferma-finestra"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="titolo-conferma"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="titolo-conferma">Consegnare {nomeSezione.toLowerCase()}?</h2>
              <p>
                {senzaRisposta === 0
                  ? 'Hai risposto a tutte le domande.'
                  : senzaRisposta === 1
                    ? 'Una domanda è senza risposta e varrà 0 punti.'
                    : `${senzaRisposta} domande sono senza risposta e varranno 0 punti.`}{' '}
                {piuSezioni && prova.corrente < prova.sezioni.length - 1
                  ? 'Dopo la consegna parte la sezione successiva e non potrai tornare indietro.'
                  : 'Dopo la consegna vedrai la correzione.'}
              </p>
              <div className="bottoni">
                <button type="button" className="btn btn-primario" onClick={consegna}>
                  Consegna {nomeSezione.toLowerCase()}
                </button>
                <button type="button" className="btn btn-secondario" onClick={() => setConferma(false)} autoFocus>
                  Continua a rispondere
                </button>
              </div>
            </section>
            </div>
          ) : null}

          <div className="domanda-testata">
            <span className="numero">{indice + 1}</span>
            <span>{d.tipo === 'multipla' ? 'Risposta multipla, una sola è corretta' : 'Completamento, scrivi la risposta'}</span>
          </div>
          <p className="domanda-testo">
            <Testo>{d.testo}</Testo>
          </p>

          {d.tipo === 'multipla' ? (
            <div className="opzioni" role="radiogroup" aria-label={`Opzioni della domanda ${indice + 1}`}>
              {(q.ordine ?? d.opzioni.map((_, i) => i)).map((originale, pos) => {
                const scelta = risposta === originale
                return (
                  <button
                    key={originale}
                    type="button"
                    role="radio"
                    aria-checked={scelta}
                    className="opzione"
                    onClick={() => rispondi(scelta ? null : originale)}
                  >
                    <span className={`pallino${scelta ? ' pieno' : ''}`} aria-hidden="true">
                      <span>{LETTERE[pos]}</span>
                    </span>
                    <span>{d.opzioni[originale]}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="completamento">
              <label htmlFor={`risposta-${q.id}`}>La tua risposta</label>
              <div className="campo">
                <input
                  ref={inputRef}
                  id={`risposta-${q.id}`}
                  type="text"
                  inputMode={d.numero ? 'decimal' : 'text'}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={typeof risposta === 'string' ? risposta : ''}
                  onChange={(e) => rispondi(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') vai(indice + 1)
                  }}
                />
                {d.unita ? <span className="unita">{d.unita}</span> : null}
              </div>
              <span className="aiuto">
                {d.numero
                  ? 'Puoi usare la virgola o la notazione scientifica, per esempio 4,9·10^4.'
                  : 'Maiuscole e accenti non contano.'}
              </span>
            </div>
          )}

          <div className="comandi">
            <button type="button" className="btn btn-secondario solo-desktop" onClick={() => vai(indice - 1)} disabled={indice === 0}>
              Precedente
            </button>
            <button type="button" className="btn btn-secondario btn-dubbio" aria-pressed={dubbia} onClick={alternaDubbio}>
              {dubbia ? 'Segnata come dubbia' : 'Segna come dubbia'}
            </button>
            {d.tipo === 'multipla' && risposta !== null ? (
              <button type="button" className="btn btn-testo" onClick={() => rispondi(null)}>
                Cancella risposta
              </button>
            ) : null}
            <span className="spinta solo-desktop">
              {indice < sezione.domande.length - 1 ? (
                <button type="button" className="btn btn-primario" onClick={() => vai(indice + 1)}>
                  Successiva
                </button>
              ) : (
                <button type="button" className="btn btn-primario" onClick={() => setConferma(true)}>
                  Consegna {nomeSezione.toLowerCase()}
                </button>
              )}
            </span>
          </div>
          <p className="nota-uscita">
            <button type="button" className="link-sommesso" onClick={onEsci}>
              Esci e riprendi più tardi
            </button>{' '}
            Il tempo continua a scorrere anche quando esci.
          </p>
        </div>

        <button
          type="button"
          className={`cassetto-sfondo${foglioAperto ? ' aperto' : ''}`}
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setFoglioAperto(false)}
        />
        <aside className={`colonna-foglio${foglioAperto ? ' aperto' : ''}`}>
          <FoglioRisposte
            titolo={nomeSezione}
            domande={sezione.domande}
            banca={banca}
            risposte={sezione.risposte}
            dubbi={sezione.dubbi}
            attuale={indice}
            onVai={vai}
          />
        </aside>
        <nav className="barra-mobile" aria-label="Navigazione tra le domande">
          <button type="button" className="btn btn-secondario" onClick={() => vai(indice - 1)} disabled={indice === 0}>
            Precedente
          </button>
          <button
            type="button"
            className="btn btn-secondario apri-foglio"
            aria-expanded={foglioAperto}
            onClick={() => setFoglioAperto((v) => !v)}
          >
            Foglio <span className="num">{sezione.domande.length - senzaRisposta}/{sezione.domande.length}</span>
          </button>
          {indice < sezione.domande.length - 1 ? (
            <button type="button" className="btn btn-primario" onClick={() => vai(indice + 1)}>
              Successiva
            </button>
          ) : (
            <button type="button" className="btn btn-primario" onClick={() => setConferma(true)}>
              Consegna
            </button>
          )}
        </nav>
      </main>
    </>
  )
}
