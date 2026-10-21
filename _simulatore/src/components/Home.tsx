import { useState } from 'react'
import type { MateriaId, Prova, Risultato } from '../types'
import { argomento, materiaDi, MATERIE, minutiSezione, NOMI_BREVI, ORDINE_MATERIE } from '../lib/dati'
import { formattaPunti } from '../lib/correzione'
import { argomentiDeboli } from '../lib/statistiche'
import { LETTERE } from './Testo'
import { Testata } from './Testata'

interface Props {
  inCorso: Prova | null
  storico: Risultato[]
  caricamento: boolean
  errore: string | null
  onInizia: (materie: MateriaId[]) => void
  onRiprendi: () => void
  onAbbandona: () => void
  onApriRisultato: (r: Risultato) => void
  onElimina: (id: string) => void
  onSvuota: () => void
  onRipassa: () => void
}

function quando(ms: number) {
  return new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function minutiRimasti(p: Prova) {
  const s = p.sezioni[p.corrente]
  if (!s.scadenza) return minutiSezione(s.domande.length)
  return Math.max(0, Math.ceil((s.scadenza - Date.now()) / 60_000))
}

/** Un ritaglio del modulo risposte, compilato a penna: è l'immagine della prova vera. */
function ModuloIllustrato() {
  const righe: (number | null)[] = [1, 3, null, 0, 4, 2]
  const caselle = ['elicasi', '+6', '']
  return (
    <div className="foglio eroe-foglio" aria-hidden="true">
      <div className="foglio-testata">
        <span>Modulo risposte, Biologia</span>
        <span className="conteggio num">7 di 31</span>
      </div>
      <div className="foglio-blocco">
        <h3>Risposta multipla</h3>
        <ol className="foglio-righe">
          {righe.map((r, i) => (
            <li key={i}>
              <div className="foglio-riga">
                <span className="n num">{i + 1}</span>
                <span className="pallini">
                  {LETTERE.map((l, k) => (
                    <span key={l} className={`pallino${r === k ? ' pieno' : ''}`}>
                      <span>{l}</span>
                    </span>
                  ))}
                </span>
                <span className="dubbio">{i === 2 ? '?' : ''}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="foglio-blocco">
        <h3>Completamento</h3>
        <ol className="foglio-righe">
          {caselle.map((c, i) => (
            <li key={i}>
              <div className="foglio-riga">
                <span className="n num">{16 + i}</span>
                <span className={`casella${c ? ' piena' : ''}`}>{c}</span>
                <span className="dubbio" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export function Home({
  inCorso,
  storico,
  caricamento,
  errore,
  onInizia,
  onRiprendi,
  onAbbandona,
  onApriRisultato,
  onElimina,
  onSvuota,
  onRipassa,
}: Props) {
  const [confermaAbbandono, setConfermaAbbandono] = useState(false)
  // niente finestre di sistema: la conferma compare al posto della riga, come per l'abbandono
  const [daEliminare, setDaEliminare] = useState<string | null>(null)
  const [svuotaChiesto, setSvuotaChiesto] = useState(false)
  const deboli = argomentiDeboli(storico)

  return (
    <>
    <Testata />
    <main className="pagina home">

      {inCorso ? (
        <section className="ripresa" aria-label="Prova in corso">
          {confermaAbbandono ? (
            <>
              <p>
                <strong>Abbandonare la prova in corso?</strong>
                Le risposte date finora non verranno corrette né salvate.
              </p>
              <div className="bottoni">
                <button type="button" className="btn btn-pericolo" onClick={onAbbandona}>
                  Abbandona la prova
                </button>
                <button type="button" className="btn btn-secondario" onClick={() => setConfermaAbbandono(false)}>
                  Tienila
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                <strong>Hai una prova in corso</strong>
                {NOMI_BREVI[inCorso.sezioni[inCorso.corrente].materia]}
                {inCorso.sezioni.length > 1 ? `, sezione ${inCorso.corrente + 1} di ${inCorso.sezioni.length}` : ''},{' '}
                {minutiRimasti(inCorso) === 0 ? 'tempo scaduto' : `circa ${minutiRimasti(inCorso)} minuti rimasti`}.
              </p>
              <div className="bottoni">
                <button type="button" className="btn btn-primario" onClick={onRiprendi}>
                  Riprendi la prova
                </button>
                <button type="button" className="btn btn-testo" onClick={() => setConfermaAbbandono(true)}>
                  Abbandona
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="eroe">
        <div>
          <span className="etichetta">Semestre filtro di Medicina</span>
          <h1>
            Allenati sulle prove, <em>nel formato vero.</em>
          </h1>
          <p className="sottotitolo">
            Per ogni materia 31 domande in 45 minuti: 15 a risposta multipla e 16 a completamento. Ogni risposta corretta vale 1
            punto, ogni errore toglie 0,1.
          </p>
          <div className="azioni">
            <div className="azione-principale">
              <button type="button" className="btn btn-primario" disabled={caricamento || !!inCorso} onClick={() => onInizia(ORDINE_MATERIE)}>
                {caricamento ? 'Preparo la prova…' : 'Inizia la prova completa'}
              </button>
              <span className="nota">
                {inCorso ? 'Concludi o abbandona prima la prova in corso.' : 'Biologia, chimica e fisica una dopo l’altra, 2 ore e 15 minuti.'}
              </span>
            </div>
            <div className="una-materia">
              <span>Oppure una materia:</span>
              {ORDINE_MATERIE.map((m) => (
                <button key={m} type="button" className="btn btn-secondario" disabled={caricamento || !!inCorso} onClick={() => onInizia([m])}>
                  {NOMI_BREVI[m]}
                </button>
              ))}
            </div>
            {errore ? (
              <p role="alert" className="errore">
                {errore}
              </p>
            ) : null}
          </div>
        </div>
        <ModuloIllustrato />
      </section>

      <div className="colonne">
        <section className="blocco" aria-labelledby="titolo-storico">
          <h2 id="titolo-storico">Le tue prove</h2>
          {storico.length === 0 ? (
            <p className="vuoto">Qui troverai il punteggio di ogni prova consegnata, materia per materia.</p>
          ) : (
            <ul className="storico">
              {storico.slice(0, 12).map((r) => (
                <li key={r.id}>
                  {daEliminare === r.id ? (
                    <p className="storico-conferma">
                      Eliminare questa prova?{' '}
                      <button
                        type="button"
                        className="link-sommesso pericolo"
                        onClick={() => {
                          onElimina(r.id)
                          setDaEliminare(null)
                        }}
                      >
                        Elimina
                      </button>{' '}
                      <button type="button" className="link-sommesso" onClick={() => setDaEliminare(null)}>
                        Annulla
                      </button>
                    </p>
                  ) : (
                    <>
                      <button type="button" className="btn-riga" onClick={() => onApriRisultato(r)}>
                        <span>
                          <strong>
                            {r.modalita === 'completa'
                              ? 'Prova completa'
                              : r.modalita === 'ripasso'
                                ? 'Ripasso'
                                : NOMI_BREVI[r.sezioni[0].materia]}
                          </strong>
                          <br />
                          <span className="quando">{quando(r.data)}</span>
                        </span>
                        <span className="punti num">
                          {r.sezioni.map((s) => (
                            <span key={s.materia}>
                              {r.sezioni.length > 1 ? `${NOMI_BREVI[s.materia].slice(0, 3)} ` : ''}
                              <b>{formattaPunti(s.punti)}</b>
                            </span>
                          ))}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn-elimina"
                        aria-label={`Elimina la prova del ${quando(r.data)}`}
                        onClick={() => setDaEliminare(r.id)}
                      >
                        ×
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {storico.length > 0 ? (
            svuotaChiesto ? (
              <p className="storico-svuota">
                Eliminare tutte le {storico.length} prove?{' '}
                <button
                  type="button"
                  className="link-sommesso pericolo"
                  onClick={() => {
                    onSvuota()
                    setSvuotaChiesto(false)
                  }}
                >
                  Elimina tutto
                </button>{' '}
                <button type="button" className="link-sommesso" onClick={() => setSvuotaChiesto(false)}>
                  Annulla
                </button>
              </p>
            ) : (
              <p className="storico-svuota">
                <button type="button" className="link-sommesso" onClick={() => setSvuotaChiesto(true)}>
                  Elimina tutte le prove
                </button>
              </p>
            )
          ) : null}
        </section>

        <section className="blocco" aria-labelledby="titolo-deboli">
          <h2 id="titolo-deboli">Da ripassare</h2>
          {deboli.length === 0 ? (
            <p className="vuoto">Dopo qualche prova qui compariranno gli argomenti del syllabus in cui sbagli di più.</p>
          ) : (
            <ul className="deboli">
              {deboli.map((a) => {
                const info = argomento(a.argomento)
                const materia = materiaDi(a.argomento)
                return (
                  <li key={a.argomento}>
                    <div className="riga">
                      <span>
                        {info?.titolo}
                        <br />
                        <span className="materia">{materia ? MATERIE[materia].nome : ''}</span>
                      </span>
                      <span className="num">
                        {a.errate + a.omesse} su {a.viste} non corrette
                      </span>
                    </div>
                    <div className="segni" aria-hidden="true">
                      {Array.from({ length: a.errate }, (_, k) => (
                        <i key={`e${k}`} className="errata" />
                      ))}
                      {Array.from({ length: a.omesse }, (_, k) => (
                        <i key={`o${k}`} className="omessa" />
                      ))}
                      {Array.from({ length: a.corrette }, (_, k) => (
                        <i key={`c${k}`} className="corretta" />
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {deboli.length > 0 ? (
            <button
              type="button"
              className="btn btn-secondario btn-ripassa"
              disabled={caricamento || !!inCorso}
              onClick={onRipassa}
            >
              Allenati su questi argomenti
            </button>
          ) : null}
        </section>
      </div>

      <section className="fascia-udu" aria-label="UDU Lecce">
        <img src="udu-lecce.svg" alt="udu Lecce, Unione degli Universitari" width={400} height={100} />
      </section>

      <footer className="piede">
        <p>
          Ogni prova è estratta da una banca di domande sugli argomenti del syllabus 2026/27, con più domande sugli argomenti che pesano
          di più. Risultati e prove in corso restano salvati solo su questo dispositivo.
        </p>
        <p>
          Una sezione di <a href="../">QuickCheck</a>, progetto indipendente di Stefano Sciurba, realizzato in collaborazione con
          UDU Lecce, sindacato studentesco. Non è uno strumento ufficiale del Ministero né degli atenei.
        </p>
      </footer>
    </main>
    </>
  )
}
