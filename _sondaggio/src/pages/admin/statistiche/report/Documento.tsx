import type { ReactNode } from 'react'
import { formatta, media, SOGLIA_POCHE_RISPOSTE } from '../../../../lib/statistiche'
import type { VoceClassifica } from '../Classifica'
import { voci } from '../dati'
import type { Barra, Distribuzione, Modello, Risultato, Tabella } from './componi'

// Il contenuto del report. Diventa HTML fermo (niente stato né effetti): le classi sono in stile.ts,
// perché il file scaricato deve stare in piedi da solo, senza i fogli di stile del sito.
// Tutto ciò che arriva dal database passa da React, che neutralizza eventuale HTML nei testi.

// Toni di inchiostro dal valore più basso al più alto, come sullo schermo
const TONI = ['#d6ebf3', '#a9d4e4', '#6fb5cf', '#3a8fb0', '#1b6580']

const indiceTono = (i: number, totale: number) =>
  totale <= 1 ? TONI.length - 1 : Math.round((i * (TONI.length - 1)) / (totale - 1))

const percento = (parte: number, totale: number) => (totale > 0 ? Math.round((parte / totale) * 100) : 0)

// Dove cade una media sulla linea da 1 a 5
const posizione = (m: number) => `${Math.min(100, Math.max(0, ((m - 1) / 4) * 100))}%`

function Riquadro({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="riquadro">
      <h2 className="riquadro-titolo">{titolo}</h2>
      {children}
    </section>
  )
}

function Ciambella({ dati }: { dati: Distribuzione }) {
  const totale = dati.conteggi.reduce((a, b) => a + b, 0)
  const mediaVoti = dati.conteggi.reduce((s, n, i) => s + n * (i + 1), 0) / totale
  const raggio = 52
  const giro = 2 * Math.PI * raggio
  const inizi = dati.conteggi.map((_, i) => dati.conteggi.slice(0, i).reduce((a, b) => a + b, 0))

  return (
    <div className="ciambella">
      <svg
        viewBox="0 0 144 144"
        width="128"
        height="128"
        role="img"
        aria-label={`${dati.titolo}: media ${formatta(mediaVoti)} su ${totale} voti`}
      >
        <g transform="rotate(-90 72 72)">
          {dati.conteggi.map((n, i) => (
            <circle
              key={i}
              cx="72"
              cy="72"
              r={raggio}
              fill="none"
              stroke={TONI[i]}
              strokeWidth="22"
              strokeDasharray={`${(n / totale) * giro} ${giro}`}
              strokeDashoffset={-(inizi[i] / totale) * giro}
            />
          ))}
        </g>
        <text x="72" y="73" textAnchor="middle" fontSize="23" fontWeight="800" fill="#16212a">
          {formatta(mediaVoti)}
        </text>
        <text x="72" y="88" textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">
          MEDIA
        </text>
      </svg>
      <ul className="legenda">
        {[4, 3, 2, 1, 0].map((i) => (
          <li key={i}>
            <span className="quadratino" style={{ backgroundColor: TONI[i] }} />
            <span className="legenda-nome">Voto {i + 1}</span>
            <span className="legenda-numero">{dati.conteggi[i]}</span>
            <strong>{percento(dati.conteggi[i], totale)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BarreOrizzontali({ righe }: { righe: Barra[] }) {
  const massimo = Math.max(1, ...righe.map((r) => r.valore))
  return (
    <ul className="barre">
      {righe.map((r) => (
        <li key={r.nome}>
          <span className="barre-nome">{r.nome}</span>
          <span className="pista">
            <span className="piena" style={{ width: `${(r.valore / massimo) * 100}%` }} />
          </span>
          <span className="barre-valore">{r.valore}</span>
        </li>
      ))}
    </ul>
  )
}

function Colonne({ righe }: { righe: Barra[] }) {
  const massimo = Math.max(1, ...righe.map((r) => r.valore))
  const passo = 340 / righe.length
  const larghezza = Math.min(44, passo * 0.6)
  return (
    <svg
      viewBox="0 0 340 140"
      width="100%"
      role="img"
      aria-label={righe.map((r) => `${r.nome}: ${r.valore}`).join(', ')}
    >
      <line x1="0" y1="118" x2="340" y2="118" stroke="#cbd5e1" />
      {righe.map((r, i) => {
        const centro = passo * i + passo / 2
        const alta = (r.valore / massimo) * 96
        return (
          <g key={r.nome}>
            <rect x={centro - larghezza / 2} y={118 - alta} width={larghezza} height={alta} rx="2" fill="#247a9a" />
            <text x={centro} y={113 - alta} textAnchor="middle" fontSize="10" fontWeight="700" fill="#16212a">
              {r.valore}
            </text>
            <text x={centro} y="132" textAnchor="middle" fontSize="10" fill="#475569">
              {r.nome}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Estremi({ voci: elenco }: { voci: VoceClassifica[] }) {
  return (
    <ul className="estremi">
      {elenco.map((v) => (
        <li key={v.id}>
          <div className="estremi-testa">
            <span>{v.nome}</span>
            <strong>{formatta(v.media!)}</strong>
          </div>
          <span className="pista">
            <span className="piena" style={{ width: posizione(v.media!) }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Classifica({ tabella, tutto }: { tabella: Tabella; tutto: boolean }) {
  const affidabile = (v: VoceClassifica) => (v.media !== null && v.n >= SOGLIA_POCHE_RISPOSTE ? 0 : 1)
  const conRisposte = tabella.voci
    .filter((v) => v.n > 0)
    .sort(
      (a, b) =>
        affidabile(a) - affidabile(b) || (b.media ?? 0) - (a.media ?? 0) || a.nome.localeCompare(b.nome, 'it'),
    )
  const senza = tabella.voci.filter((v) => v.n === 0).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))

  return (
    <>
      {conRisposte.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{tabella.colonna}</th>
              <th className="num">{tabella.etichettaN}</th>
              <th className="scala">
                <span>1</span>
                <span>5</span>
              </th>
              <th className="num">Media</th>
            </tr>
          </thead>
          <tbody>
            {conRisposte.map((v) => {
              const incerta = v.n < SOGLIA_POCHE_RISPOSTE
              return (
                <tr key={v.id}>
                  <td>
                    <strong>{v.nome}</strong>
                    {incerta && <span className="etichetta">Poche risposte</span>}
                    {v.dettaglio && <div className="tenue">{v.dettaglio}</div>}
                  </td>
                  <td className="num">{v.n}</td>
                  <td className="scala">
                    {v.media !== null && (
                      <span className="linea">
                        <span className={incerta ? 'punto incerto' : 'punto'} style={{ left: posizione(v.media) }} />
                      </span>
                    )}
                    {v.media === null && (
                      <span className="tenue">{incerta && !tutto ? 'non mostrata' : 'nessun voto in scala'}</span>
                    )}
                  </td>
                  <td className="num">
                    <strong>{v.media === null ? '—' : formatta(v.media)}</strong>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {senza.length > 0 && (
        <p className="senza">
          <strong>Senza risposte ({senza.length}):</strong> {senza.map((v) => v.nome).join(', ')}
        </p>
      )}
    </>
  )
}

function Domanda({ risultato: { domanda, agg }, tutto }: { risultato: Risultato; tutto: boolean }) {
  const scala = domanda.tipo_risposta === 'scala'
  const multipla = domanda.tipo_risposta === 'scelta_multipla'
  const protetta = !tutto && agg.n < SOGLIA_POCHE_RISPOSTE
  const righe = voci(domanda, agg)
  const med = media(agg)

  return (
    <div className="domanda">
      <div className="domanda-testa">
        <div>
          <p className="domanda-testo">{domanda.testo}</p>
          <p className="tenue">
            {agg.n}{' '}
            {multipla ? (agg.n === 1 ? 'persona' : 'persone') : agg.n === 1 ? 'risposta' : 'risposte'}
            {multipla && ' · più risposte possibili'}
            {agg.n < SOGLIA_POCHE_RISPOSTE && <span className="etichetta">Poche risposte</span>}
          </p>
        </div>
        {scala && !protetta && med !== null && <span className="voto">{formatta(med)}</span>}
      </div>
      {protetta ? (
        <p className="tenue">
          Meno di {SOGLIA_POCHE_RISPOSTE} risposte: il risultato non è mostrato.
        </p>
      ) : scala ? (
        <div className="impilata">
          {righe.map((v, i) => {
            if (v.conteggio === 0) return null
            const tono = indiceTono(i, righe.length)
            const quota = percento(v.conteggio, agg.n)
            return (
              <span
                key={v.etichetta}
                style={{
                  flexGrow: v.conteggio,
                  backgroundColor: TONI[tono],
                  color: tono >= 3 ? '#ffffff' : '#16212a',
                }}
              >
                {quota >= 9 && (
                  <>
                    <strong>{v.etichetta}</strong> · {quota}%
                  </>
                )}
              </span>
            )
          })}
        </div>
      ) : (
        <ul className="barre opzioni">
          {righe.map((v) => (
            <li key={v.etichetta}>
              <span className="barre-nome">{v.etichetta}</span>
              <span className="pista">
                <span className="piena" style={{ width: `${(v.conteggio / agg.n) * 100}%` }} />
              </span>
              <span className="barre-valore">
                {v.conteggio} · {percento(v.conteggio, agg.n)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Domande({ titolo, risultati, tutto }: { titolo: string; risultati: Risultato[]; tutto: boolean }) {
  const scala = risultati.find((r) => r.domanda.tipo_risposta === 'scala')?.domanda
  return (
    <section className="gruppo">
      <div className="gruppo-testa">
        <h3>{titolo}</h3>
        {scala && (
          <p className="chiave">
            Voto {scala.scala_min ?? 1}
            {TONI.map((t) => (
              <span key={t} className="quadratino" style={{ backgroundColor: t }} />
            ))}
            {scala.scala_max ?? 5}
          </p>
        )}
      </div>
      {risultati.map((r) => (
        <Domanda key={r.domanda.id} risultato={r} tutto={tutto} />
      ))}
    </section>
  )
}

export default function Documento({ modello, logo }: { modello: Modello; logo: string }) {
  const m = modello
  const vuoto = m.sezioni.length === 0 && m.extra.length === 0 && m.testi.length === 0

  return (
    <>
      <div className="comandi">
        <span>Anteprima del report. Per il PDF premi il tasto e scegli «Salva come PDF».</span>
        <button type="button" id="stampa">
          Stampa / Salva come PDF
        </button>
      </div>

      <main className="foglio">
        <header className="testata">
          {logo && <img src={logo} alt="UDU Lecce Ingegneria" />}
          <div>
            <p className="soprattitolo">Sondaggio studenti · Dipartimento di Ingegneria dell’Innovazione</p>
            <h1>{m.titolo}</h1>
            <p className="tenue">Creato il {m.creatoIl}</p>
          </div>
          <span className="pillola">Risposte anonime</span>
        </header>

        <dl className="filtri">
          {m.contesto.map(([voce, valore]) => (
            <div key={voce}>
              <dt>{voce}</dt>
              <dd>{valore}</dd>
            </div>
          ))}
        </dl>
        {m.edizioneAperta && (
          <p className="avviso">L’edizione è ancora aperta: i numeri sono parziali e possono cambiare.</p>
        )}

        <section className={`tessere ${m.tessere.length % 3 === 0 ? 'per-tre' : ''}`}>
          {m.tessere.map((t) => (
            <div key={t.etichetta} className="tessera">
              <p className="tessera-nome">{t.etichetta}</p>
              <p className="tessera-valore">{t.valore}</p>
              {t.nota && <p className="tenue">{t.nota}</p>}
            </div>
          ))}
        </section>

        {m.distribuzioni.length > 0 && (
          <div className={m.distribuzioni.length > 1 ? 'colonne' : ''}>
            {m.distribuzioni.map((d) => (
              <Riquadro key={d.titolo} titolo={d.titolo}>
                <Ciambella dati={d} />
              </Riquadro>
            ))}
          </div>
        )}

        {m.estremi && (
          <div className="colonne">
            <Riquadro titolo="Materie con la media più alta">
              <Estremi voci={m.estremi.alte} />
            </Riquadro>
            <Riquadro titolo="Materie con la media più bassa">
              <Estremi voci={m.estremi.basse} />
            </Riquadro>
          </div>
        )}

        {(m.perCorso.length > 1 || m.perAnno.length > 1) && (
          <div className="colonne">
            {m.perCorso.length > 1 && (
              <Riquadro titolo="Compilazioni per corso di laurea">
                <BarreOrizzontali righe={m.perCorso} />
              </Riquadro>
            )}
            {m.perAnno.length > 1 && (
              <Riquadro titolo="Compilazioni per anno della materia">
                <Colonne righe={m.perAnno} />
              </Riquadro>
            )}
          </div>
        )}

        {m.tabelle.map((t, i) => (
          <section key={t.titolo} className={m.aCapitoli && i === 0 ? 'capitolo' : 'parte'}>
            <h2 className="titolo-parte">{t.titolo}</h2>
            <Classifica tabella={t} tutto={m.tutto} />
          </section>
        ))}

        {m.sezioni.length > 0 && (
          <section className={m.aCapitoli ? 'capitolo' : 'parte'}>
            <h2 className="titolo-parte">Risultati domanda per domanda</h2>
            {m.sezioni.map((s) => (
              <Domande key={s.titolo} titolo={s.titolo} risultati={s.risultati} tutto={m.tutto} />
            ))}
          </section>
        )}

        {m.extra.length > 0 && (
          <section className="parte">
            <h2 className="titolo-parte">Domande Extra</h2>
            {m.filtriNonPerExtra && (
              <p className="tenue">
                Si chiedono una sola volta a ogni studente: qui contano tutte le risposte dell’edizione, qualunque
                sia il filtro scelto.
              </p>
            )}
            <Domande titolo="Extra" risultati={m.extra} tutto={m.tutto} />
          </section>
        )}

        {m.testi.length > 0 && (
          <section className={m.aCapitoli ? 'capitolo' : 'parte'}>
            <h2 className="titolo-parte">Risposte scritte</h2>
            {m.testi.map((t, i) => (
              <section key={i} className="scritte">
                <h3>{t.domanda}</h3>
                {t.gruppi.map((g) => (
                  <div key={g.etichetta}>
                    <p className="scritte-gruppo">
                      {g.etichetta} <span>{g.testi.length}</span>
                    </p>
                    <ul>
                      {g.testi.map((testo, j) => (
                        <li key={j}>{testo}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
          </section>
        )}

        {vuoto && <p className="avviso">Nessuna risposta con i filtri scelti.</p>}

        <footer className="note">
          <strong>Come leggere il report.</strong> Le risposte sono anonime. La media generale mette insieme le
          domande a scala riportandole tutte da 1 a 5; i grafici a ciambella contano le sole domande con la scala da 1
          a 5. Nelle domande a scelta multipla le percentuali sono sulle persone, quindi la loro somma può superare
          100.{' '}
          {m.tutto
            ? `Le voci con meno di ${SOGLIA_POCHE_RISPOSTE} risposte sono segnalate: sono poco affidabili e possono rendere riconoscibile chi ha risposto.`
            : `Per le voci con meno di ${SOGLIA_POCHE_RISPOSTE} risposte i risultati non sono mostrati: sarebbero poco affidabili e potrebbero rendere riconoscibile chi ha risposto.`}
          {m.testiTrattenuti > 0 &&
            ` Risposte scritte non incluse per lo stesso motivo: ${m.testiTrattenuti}.`}
        </footer>
      </main>
    </>
  )
}
