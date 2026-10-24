/**
 * Piede del simulatore per il semestre filtro di Medicina.
 *
 * Collocato sotto la home e la pagina dei risultati (non durante la prova per non distrarre
 * lo studente e non rischiare tocchi involontari mentre il tempo scorre).
 *
 * Strutturato a colonne in armonia visiva con il sito principale di QuickCheck,
 * integrando la banca dati del Syllabus MUR 2026/27, i collegamenti all'app,
 * il modulo per segnalare domande errate, i badge sulla privacy e i canali social con udu Lecce.
 */

export function Piede() {
  const annoCorrente = new Date().getFullYear()

  // Template email precompilato per la segnalazione rapida di refusi o errori nelle domande
  const linkSegnalazione =
    'mailto:stefano.sciurba@studenti.unisalento.it?subject=' +
    encodeURIComponent('Simulatore semestre filtro - Segnalazione domanda') +
    '&body=' +
    encodeURIComponent(
      'Ciao Stefano,\n\nVorrei segnalare un problema su una domanda del simulatore:\n' +
        '- Materia (Biologia / Chimica / Fisica): \n' +
        '- Tipo (Risposta multipla / Completamento): \n' +
        '- Testo della domanda o ID: \n' +
        '- Refuso o errore riscontrato: \n\n' +
        'Grazie per il lavoro sul simulatore!'
    )

  return (
    <footer className="piede" aria-label="Informazioni e collegamenti del simulatore">
      {/* Box informativo sulla trasparenza della banca dati e i criteri ufficiali MUR */}
      <section className="piede-banca-info" aria-label="Informazioni sulla prova e il syllabus">
        <div className="piede-banca-icona" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
            <path d="M6 14h6" />
          </svg>
        </div>
        <div className="piede-banca-testo">
          <strong>Formato d'esame e Syllabus MUR 2026/27</strong>
          <p>
            Ogni simulazione replica il formato ufficiale delle prove del semestre filtro: <b>31 domande in 50 minuti</b> per
            materia (21 a risposta multipla e 10 a completamento). Criteri di correzione ministeriali: <b>+1</b> per risposta esatta,
            <b> −0,1</b> per risposta errata e <b>0</b> per risposta omessa (sufficienza a 18). Le domande sono estratte in modo bilanciato
            in base ai CFU e alla frequenza nelle prove ministeriali.
          </p>
        </div>
      </section>

      {/* Griglia principale a colonne */}
      <div className="piede-griglia">
        {/* Colonna 1: Presentazione del simulatore, collaborazione e privacy */}
        <div className="piede-colonna piede-col-brand">
          <div className="piede-logo-riga">
            <a href="../" className="piede-logo" aria-label="Vai alla home di QuickCheck">
              <img
                src="../assets/logo.png"
                alt=""
                width={30}
                height={30}
                onError={(e) => {
                  e.currentTarget.src = 'icona.svg'
                }}
              />
              <span>QuickCheck</span>
            </a>
            <span className="piede-separatore-loghi" aria-hidden="true">×</span>
            <a href="https://www.instagram.com/udu_lecce/" target="_blank" rel="noopener noreferrer" className="piede-marchio-udu" aria-label="Profilo Instagram udu Lecce">
              <img src="udu-lecce-distintivo.svg" alt="udu Lecce" width={32} height={32} />
            </a>
          </div>

          <p className="piede-descrizione">
            Simulatore gratuito per le prove del semestre filtro di Medicina, creato da studenti per gli studenti in collaborazione con <b>udu Lecce</b>.
          </p>

          {/* Badge rassicurante sulla privacy e funzionamento offline */}
          <div className="piede-badge-privacy">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div>
              <b>100% Locale & Privato</b>
              <span>Nessun account richiesto. Risposte, timer e storico restano solo su questo browser e funzionano anche offline.</span>
            </div>
          </div>
        </div>

        {/* Colonna 2: Collegamenti all'app QuickCheck */}
        <nav className="piede-colonna" aria-label="QuickCheck App e Download">
          <h4>QuickCheck</h4>
          <ul className="piede-elenco">
            <li>
              <a href="../">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Sito di QuickCheck</span>
              </a>
            </li>
            <li>
              <a href="../download.html">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                  <path d="M17.6 9.48l1.84-3.18a.5.5 0 1 0-.86-.5l-1.9 3.28A9.87 9.87 0 0 0 12 8.5c-1.63 0-3.16.4-4.48 1.08L5.62 6.3a.5.5 0 0 0-.86.5l1.84 3.18C3.8 11.66 2 15.02 2 18.9h20c0-3.88-1.8-7.24-4.4-9.42zM7 15a1.2 1.2 0 1 1 1.2-1.2A1.2 1.2 0 0 1 7 15zm10 0a1.2 1.2 0 1 1 1.2-1.2A1.2 1.2 0 0 1 17 15z" />
                </svg>
                <span>Scarica APK Android</span>
              </a>
            </li>
            <li>
              <a href="https://quick-check-unisalento.vercel.app/" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" x2="22" y1="12" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>Web App (iOS e PC)</span>
              </a>
            </li>
            <li>
              <a href="../download.html#guida">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                <span>Come installare l'app</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Colonna 3: Informazioni sul progetto, privacy e note legali */}
        <nav className="piede-colonna" aria-label="Informazioni e risorse">
          <h4>Progetto</h4>
          <ul className="piede-elenco">
            <li>
              <a href="../privacy.html">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Informativa Privacy</span>
              </a>
            </li>
            <li>
              <a href="../credits.html">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span>Credits & Collaboratori</span>
              </a>
            </li>
            <li>
              <a href="../bugs.html">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="8" height="14" x="8" y="5" rx="4" />
                  <path d="m19 7-3 2" />
                  <path d="m5 7 3 2" />
                  <path d="m19 19-3-2" />
                  <path d="m5 19 3-2" />
                  <path d="M20 13h-4" />
                  <path d="M4 13h4" />
                  <path d="m10 9 4 4" />
                </svg>
                <span>Problemi noti e note</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Colonna 4: Segnalazione errori e refusi nelle domande */}
        <div className="piede-colonna piede-col-segnala">
          <h4>Hai trovato un refuso?</h4>

          {/* Card in evidenza per segnalare domande errate */}
          <div className="piede-card-segnala">
            <div className="piede-card-segnala-testa">
              <span className="piede-card-icona" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" x2="4" y1="22" y2="15" />
                </svg>
              </span>
              <b>Segnala una domanda</b>
            </div>
            <p>Hai notato una domanda ambigua o un errore nella banca dati? Aiutaci a risolverlo per tutti.</p>
            <a href={linkSegnalazione} className="btn-piede-segnala">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Invia segnalazione</span>
            </a>
          </div>
        </div>
      </div>

      {/* Fascia orizzontale per tutti i canali Instagram: ideatori a sinistra e udu Lecce a destra */}
      <section className="piede-social-fascia" aria-label="Profili social ufficiali">
        <div className="piede-social-gruppo">
          <span className="piede-social-gruppo-titolo">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.1-9.4a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z" />
            </svg>
            Ideatori
          </span>
          <div className="piede-social-elenco">
            <a
              href="https://www.instagram.com/stefano_sciurba/"
              target="_blank"
              rel="noopener noreferrer"
              className="piede-social-link"
              title="Instagram Stefano Sciurba"
            >
              <span>@stefano_sciurba</span>
            </a>
            <a
              href="https://www.instagram.com/mosca.ilariaa/"
              target="_blank"
              rel="noopener noreferrer"
              className="piede-social-link"
              title="Instagram Ilaria Mosca"
            >
              <span>@mosca.ilariaa</span>
            </a>
          </div>
        </div>

        <div className="piede-social-divisore" aria-hidden="true" />

        <div className="piede-social-gruppo">
          <span className="piede-social-gruppo-titolo">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.1-9.4a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z" />
            </svg>
            udu Lecce
          </span>
          <div className="piede-social-elenco">
            <a
              href="https://www.instagram.com/udu_lecce/"
              target="_blank"
              rel="noopener noreferrer"
              className="piede-social-link"
              title="Instagram udu Lecce"
            >
              <span>@udu_lecce</span>
            </a>
            <a
              href="https://www.instagram.com/medicinasperimentalelecce/"
              target="_blank"
              rel="noopener noreferrer"
              className="piede-social-link"
              title="Instagram Medicina Sperimentale Lecce"
            >
              <span>@medicinasperimentalelecce</span>
            </a>
            <a
              href="https://www.instagram.com/udu_sindacatostudentescolecce/"
              target="_blank"
              rel="noopener noreferrer"
              className="piede-social-link"
              title="Instagram udu Sindacato Studentesco Lecce"
            >
              <span>@udu_sindacatostudentescolecce</span>
            </a>
          </div>
        </div>
      </section>

      {/* Fascia inferiore: Copyright e Disclaimer legale di non ufficialità */}
      <div className="piede-fondo">
        <p className="piede-crediti">
          © {annoCorrente} QuickCheck · Un progetto indipendente di{' '}
          <a href="https://www.instagram.com/stefano_sciurba/" target="_blank" rel="noopener noreferrer">
            Stefano Sciurba
          </a>{' '}
          e{' '}
          <a href="https://www.instagram.com/mosca.ilariaa/" target="_blank" rel="noopener noreferrer">
            Ilaria Mosca
          </a>{' '}
          in collaborazione con{' '}
          <a href="https://www.instagram.com/udu_lecce/" target="_blank" rel="noopener noreferrer">
            udu Lecce
          </a>.
        </p>
        <p className="piede-disclaimer">
          Strumento didattico e divulgativo indipendente senza fini di lucro. Non è affiliato né approvato dal Ministero dell'Università e della Ricerca (MUR) né dall'Università del Salento.
        </p>
      </div>
    </footer>
  )
}
