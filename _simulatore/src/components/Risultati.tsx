import { useMemo, useState } from 'react'
import type { Domanda, Esito, Prova, Risultato } from '../types'
import { argomento, FORMATO, MATERIE, NOMI_BREVI } from '../lib/dati'
import { formattaPunti } from '../lib/correzione'
import { perUnita, quantoPesa } from '../lib/statistiche'
import { LETTERE, Testo } from './Testo'
import { Testata } from './Testata'

interface Props {
  risultato: Risultato
  prova: Prova
  banca: Map<string, Domanda>
  onNuova: () => void
  onHome: () => void
}

const SUFFICIENZA = 18
const ETICHETTA: Record<Esito, string> = { corretta: 'Corretta', errata: 'Errata', omessa: 'Non data' }

function data(ms: number) {
  return new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export function Risultati({ risultato, prova, banca, onNuova, onHome }: Props) {
  const [filtro, setFiltro] = useState<'tutte' | 'errate' | 'omesse'>('errate')
  const totale = risultato.sezioni.reduce((s, x) => s + x.punti, 0)
  const massimo = risultato.sezioni.reduce((s, x) => s + x.dettaglio.length, 0)

  // per unità del syllabus, non per argomento: dentro una prova sola ogni argomento ha una
  // domanda a testa, e un elenco di ottantotto voci da "1 su 1" non direbbe niente a nessuno.
  // Le unità sono 7 per materia, quindi ci stanno tutte: niente taglio e niente elenco parziale.
  const unita = useMemo(
    () =>
      perUnita(risultato.sezioni.flatMap((s) => s.dettaglio))
        .filter((u) => quantoPesa(u) > 0)
        .sort((a, b) => quantoPesa(b) - quantoPesa(a) || b.viste - a.viste),
    [risultato],
  )

  const voci = risultato.sezioni.flatMap((s, si) =>
    s.dettaglio.map((e, i) => ({ e, i, si, q: prova.sezioni[si].domande[i], risposta: prova.sezioni[si].risposte[e.id] ?? null })),
  )
  const visibili = voci.filter(({ e }) => filtro === 'tutte' || (filtro === 'errate' ? e.esito === 'errata' : e.esito === 'omessa'))
  const conta = (es: Esito) => voci.filter((v) => v.e.esito === es).length

  return (
    <>
    <Testata onInizio={onHome} />
    <main className="pagina risultati">
      <header className="risultati-testata">
        <h1>Correzione</h1>
        <p>
          {risultato.modalita === 'completa'
            ? 'Prova completa'
            : risultato.modalita === 'ripasso'
              ? 'Ripasso'
              : `Prova di ${NOMI_BREVI[risultato.sezioni[0].materia].toLowerCase()}`}{' '}
          del{' '}
          {data(risultato.data)}. Punteggio: +1 per ogni risposta corretta, −0,1 per ogni errata, 0 se non data.
        </p>
      </header>

      <section aria-labelledby="titolo-punteggi">
        <h2 id="titolo-punteggi" className="visually-hidden">
          Punteggi per materia
        </h2>
        <div className="pagelle">
          {risultato.sezioni.map((s) => (
            <div className="pagella" key={s.materia}>
              <div className="materia">
                {NOMI_BREVI[s.materia]}
                <span>
                  {s.dettaglio.length < FORMATO.domande
                    ? `Ripasso di ${s.dettaglio.length} domande`
                    : s.punti >= SUFFICIENZA
                      ? 'Sopra la sufficienza'
                      : `Sufficienza a ${SUFFICIENZA} punti`}
                </span>
              </div>
              <div className={`voto${s.punti < SUFFICIENZA ? ' insufficiente' : ''}`}>
                {formattaPunti(s.punti)}
                <small>/{s.dettaglio.length}</small>
              </div>
              <div className="striscia-box">
                <div className="striscia" role="img" aria-label={`Corrette ${s.corrette}, errate ${s.errate}, non date ${s.omesse}`}>
                  {s.dettaglio.map((e) => (
                    <i key={e.id} className={e.esito} />
                  ))}
                </div>
                <div className="legenda num">
                  <span>
                    <b>{s.corrette}</b> {s.corrette === 1 ? 'corretta' : 'corrette'}
                  </span>
                  <span>
                    <b>{s.errate}</b> {s.errate === 1 ? 'errata' : 'errate'}
                  </span>
                  <span>
                    <b>{s.omesse}</b> {s.omesse === 1 ? 'non data' : 'non date'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {risultato.sezioni.length > 1 ? (
          <div className="totale num">
            <span>{risultato.modalita === 'completa' ? 'Totale delle tre prove' : 'Totale del ripasso'}</span>
            <span>
              {formattaPunti(totale)} su {massimo}
            </span>
          </div>
        ) : null}
      </section>

      {unita.length > 0 ? (
        <section className="blocco" aria-labelledby="titolo-unita">
          <h2 id="titolo-unita">Dove hai perso punti</h2>
          <ul className="argomenti-prova">
            {unita.map((u) => (
              <li key={u.chiave}>
                <div className="riga">
                  <span className="voce-unita">
                    <span className="titolo-unita" title={u.titolo}>
                      {u.titolo}
                    </span>
                    <span className="materia">
                      {MATERIE[u.materia].nome}, unità {u.numero}
                    </span>
                  </span>
                  <span className="num">
                    {u.errate + u.omesse} su {u.viste}
                  </span>
                </div>
                <div className="segni" aria-hidden="true">
                  {Array.from({ length: u.errate }, (_, k) => (
                    <i key={`e${k}`} className="errata" />
                  ))}
                  {Array.from({ length: u.omesse }, (_, k) => (
                    <i key={`o${k}`} className="omessa" />
                  ))}
                  {Array.from({ length: u.corrette }, (_, k) => (
                    <i key={`c${k}`} className="corretta" />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="blocco" aria-labelledby="titolo-revisione">
        <h2 id="titolo-revisione">Rivedi le risposte</h2>
        <div className="revisione-filtri" role="group" aria-label="Quali domande mostrare">
          {(
            [
              ['errate', `Errate (${conta('errata')})`],
              ['omesse', `Non date (${conta('omessa')})`],
              ['tutte', `Tutte (${voci.length})`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {label}
            </button>
          ))}
        </div>
        {visibili.length === 0 ? (
          <p className="vuoto">{filtro === 'errate' ? 'Nessuna risposta errata in questa prova.' : 'Hai risposto a tutte le domande.'}</p>
        ) : (
          <ol className="revisione">
            {visibili.map(({ e, i, si, q, risposta }) => {
              const d = banca.get(e.id)!
              const materia = risultato.sezioni[si].materia
              const info = argomento(d.argomento)
              let tua = '—'
              let giusta = ''
              if (d.tipo === 'multipla') {
                const ordine = q.ordine ?? d.opzioni.map((_, k) => k)
                const posTua = typeof risposta === 'number' ? ordine.indexOf(risposta) : -1
                if (posTua >= 0) tua = `${LETTERE[posTua]}) ${d.opzioni[risposta as number]}`
                const posGiusta = ordine.indexOf(d.corretta)
                giusta = `${LETTERE[posGiusta]}) ${d.opzioni[d.corretta]}`
              } else {
                if (typeof risposta === 'string' && risposta.trim()) tua = risposta.trim()
                giusta = d.accettate[0] + (d.unita ? ` ${d.unita}` : '')
              }
              return (
                <li className="voce" key={`${si}-${e.id}`}>
                  <span className="n">{i + 1}</span>
                  <div className="corpo">
                    <span className="argomento">
                      {MATERIE[materia].nome}, {info?.titolo}
                    </span>
                    <p>
                      <Testo>{d.testo}</Testo>
                    </p>
                    <div className="risposte-voce">
                      <span className={`esito ${e.esito}`}>{ETICHETTA[e.esito]}</span>
                      {e.esito !== 'corretta' ? (
                        <>
                          <span>
                            La tua risposta: <span className={`tua${e.esito === 'errata' ? ' sbagliata' : ''}`}>{tua}</span>
                          </span>
                          <span>
                            Risposta corretta: <span className="giusta">{giusta}</span>
                          </span>
                        </>
                      ) : (
                        <span>
                          Risposta: <span className="giusta">{tua}</span>
                        </span>
                      )}
                    </div>
                    {d.spiegazione ? <p className="spiegazione">{d.spiegazione}</p> : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="fine-azioni">
        <button type="button" className="btn btn-primario" onClick={onNuova}>
          {risultato.modalita === 'completa'
            ? 'Fai un’altra prova completa'
            : risultato.modalita === 'ripasso'
              ? 'Fai un altro ripasso'
              : `Rifai ${NOMI_BREVI[risultato.sezioni[0].materia].toLowerCase()}`}
        </button>
        <button type="button" className="btn btn-secondario" onClick={onHome}>
          Torna all'inizio
        </button>
      </div>
    </main>
    </>
  )
}
