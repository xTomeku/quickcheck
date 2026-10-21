# Simulatore semestre filtro · QuickCheck

Simulatore delle prove del semestre filtro di Medicina (biologia, chimica, fisica), pubblicato come sezione
del sito di QuickCheck: https://xtomeku.github.io/quickcheck/simulatore/
Fatto in collaborazione con UDU Lecce, sindacato studentesco: lo dice il piede della home, e da lì
vengono i colori e i due marchi.
Ispirato al simulatore di UDU Bari (medicina.udubari.org/medicina), ma con domande nostre.

## Decisioni prese

- **App statica, nessun backend.** React + Vite + TypeScript, PWA. Estrazione, timer, correzione e storico
  girano nel browser; le domande sono file JSON in `public/domande/`. Costo zero, nessuna carta.
  Limite accettato: le soluzioni sono leggibili dagli strumenti sviluppatore.
  (Valutati e scartati: **Firebase** con Cloud Functions, che vuole il piano Blaze e per questo account
  Google chiedeva un pagamento anticipato; **Supabase Free**, che invece non addebita mai — oltre la
  quota limita il progetto finché la quota non si ricarica — ma mette in pausa i progetti dopo una
  settimana di inattività, pessimo per uno strumento stagionale. L'implementazione Firebase stava in
  `_firebase/` ed è stata cancellata il 22 ottobre 2026: era codice morto, e il pannello domande, che
  era l'unico motivo per tenerla, ormai esiste. Se un giorno servirà un backend si riparte da Supabase
  e si riscrive: di quel lavoro valeva il disegno, non il codice, legato al Realtime Database.)
- **Tutto dentro il repo del sito** (GitHub Pages, repo xTomeku/quickcheck): il sorgente sta in
  `sito/_simulatore/`, la build pubblicata in `sito/simulatore/`. Da `_simulatore/` si lancia
  `npm run pubblica`, che compila e copia `dist/` in `../simulatore/`, poi commit e push del sito.
  `node_modules/` e `dist/` restano fuori da git grazie a `_simulatore/.gitignore`.
  Dal sito ci si arriva dal piede, colonna "Progetto", in tutte e 5 le pagine. Nel menu in alto non
  c'è più: lì stava stretto e non si capiva cosa fosse (tolto anche il blocco @media 769–1000px
  di `style.css`, che serviva solo a tenere quella voce in riga sui tablet).
- **Grafica:** colori di UDU (rosso #c6242d, giallo #feec03, bianco) e azzurro del dipartimento di
  Medicina #50aed0; font Inter come QuickCheck. Fondo bianco; barre in alto rosse con filo giallo;
  azione principale rossa; foglio risposte con inchiostro azzurro (#247a9a per i testi, #50aed0 per i
  pallini pieni); giallo per evidenziare (domanda corrente, filtro attivo, ultimi minuti); errori in rosso.
  Elemento identitario: il "foglio risposte" a pallini. Barra in alto `Testata.tsx` con logo QuickCheck
  (../assets/logo.png). Il ritorno in alto a destra porta al sito solo dalla home: dalla correzione
  riporta all'inizio del simulatore, perché lì uscire dal sito non è quello che serve.
  In fondo alla home una fascia rossa con il logo bianco di
  UDU Lecce (`public/udu-lecce.svg`); in alto il marchio QuickCheck e accanto il distintivo tondo
  (`public/udu-lecce-distintivo.svg`), con un anello bianco che lo stacca dal rosso della barra.
  Sotto i 440px la barra perde la parola "Simulatore", altrimenti i due marchi e "Torna al sito"
  si accavallano. Negli argomenti con errori la
  barra a percentuale è stata sostituita da una tacca per domanda (`.segni`), così un argomento con
  una domanda sola non sembra grave quanto uno con sei.
- **Ripasso:** dal blocco "Da ripassare" parte una prova corta (`RIPASSO` in `dati.ts`: 5 multiple +
  5 completamenti per materia, minuti in proporzione alle domande) sulle sole materie che hanno
  argomenti deboli, con quegli argomenti moltiplicati per `RINFORZO_RIPASSO`. Il rinforzo non li
  isola: con una banca piccola un ripasso che peschi solo da lì resterebbe a corto di domande.
- **Lingua:** tutta l'interfaccia, il codice (nomi di variabili e funzioni) e i commenti sono in italiano.

## Formato della prova (dai testi ufficiali MUR 2025/26 e dalle linee guida)

Per materia: 31 domande in 45 minuti, prima 15 a risposta multipla (5 opzioni) poi 16 a completamento
(risposta breve: termine, sigla, numero, vero/falso). Punteggio +1 corretta, −0,1 errata, 0 omessa.
Sufficienza 18. Prova completa = tre sezioni in sequenza, non si torna a una sezione consegnata.

## Struttura

- `src/lib/generatore.ts`: estrazione pesata per argomento (il peso si dimezza a ogni domanda già presa
  dallo stesso argomento), `gruppo` per non far uscire quasi-duplicati insieme, meno domande già viste,
  opzioni mescolate (`ordine`).
- `src/lib/correzione.ts`: correzione tollerante (accenti, maiuscole, articolo iniziale; numeri con virgola,
  separatore migliaia, notazione scientifica, unità in coda; `numero.tolleranza` relativa).
- `src/lib/archivio.ts`: prova in corso, storico, domande viste, tutto in localStorage con try/catch.
  Dalla home si cancella una prova per volta o tutto lo storico; via con la prova se ne vanno anche
  le risposte tenute per rivederla (`sf.prove-consegnate.v1`), così non restano orfane. L'elenco
  delle domande già viste non si tocca: non è un risultato, serve a variare le estrazioni.
  Le conferme sono in pagina, non con le finestre del browser, come per l'abbandono della prova.
- `src/lib/statistiche.ts`: argomenti da ripassare. Non la quota grezza di errori, che premierebbe i
  campioni minuscoli (2 sbagli su 2 batterebbe 7 su 8): ogni argomento parte da 4 domande immaginarie
  andate a metà e sale solo con prove vere di andar male. Una non data pesa 0,6 di un errore, perché
  spesso a lasciare in bianco è il tempo che finisce.
  La correzione di una prova sola invece raggruppa per **unità del syllabus** (`perUnita`, 7 per
  materia): il generatore sparpaglia le domande su quasi novanta argomenti diversi, quindi per
  argomento i conti sarebbero tutti "1 su 1" e l'elenco andava troncato a 8 su 88 senza dirlo.
  Le unità sono 21 in tutto, quindi ci stanno tutte e l'elenco è completo.
- `src/components/`: Home, Esame (timer, foglio a cassetto su mobile), FoglioRisposte, Risultati, Testata.
  La scadenza di una sezione è un istante salvato (`scadenza`), non un cronometro: uscire non la
  ferma, come alla prova vera. Se il tempo finisce mentre sei davanti allo schermo la consegna è
  automatica; se invece era già scaduta quando riapri, Esame mostra un avviso e consegni tu, per
  non sbattere in faccia una correzione che nessuno si aspetta.
- `src/data/argomenti.json`: 124 argomenti del syllabus 2026/27 con peso suggerito.
- `dati/argomenti-analisi.json`: analisi completa (CFU, frequenze nelle prove 2025, banca MUR 2024).
  Peso = 0,5·CFU + 0,35·prove 2025 + 0,15·banca 2024. `dati/prove_2025_classificate.json`: le 186 domande
  ufficiali 2025 classificate per argomento.
- `src/admin/`: pannello domande, solo in sviluppo. `npm run dev` e poi `/admin.html`: apre
  `public/domande/` con la File System Access API (Chrome/Edge), elenco filtrabile per
  materia/argomento/stato, editor, approva/scarta, import di lotti JSON, avvisi sui problemi.
  Fuori dalla build: `admin.html` non è fra gli input di Vite, quindi online non ci finisce.
- Test: `npm test` (vitest, 47 test su motore e pannello; i conteggi di prima includevano anche i
  test del backend Firebase, che vitest raccoglieva da `_firebase/`).

## Formato delle domande (public/domande/<materia>.json)

`{ "domande": [ ... ] }`; ogni domanda: `id`, `argomento` (codice di argomenti.json, es. "bio.4.2"),
`tipo` ("multipla" | "completamento"), `testo` (nei completamenti lo spazio è "……"), `stato`
("approvata" | "bozza" | "scartata"; in prova entrano solo approvate o senza stato), `spiegazione`,
`gruppo` facoltativo. Multipla: `opzioni` (5) + `corretta` (indice). Completamento: `accettate` (la prima è
quella mostrata in correzione), facoltativi `numero: {valore, tolleranza}` e `unita`.
Ora ci sono 93 domande dimostrative (15+16 per materia), scritte a mano.

## Prossimi passi

1. **Generazione della banca con l'AI** (stesso metodo di UDU, migliorato): per ogni argomento domande
   in numero proporzionale al peso, usando contenuti del syllabus e domande ufficiali 2025 come esempi di
   stile; verifica con un secondo modello che risponde senza vedere la soluzione; raggruppamento dei
   quasi-duplicati; revisione umana nel pannello. Obiettivo 300–500 domande per materia.
   Non copiare domande da UDU, Testbusters o manuali.
2. Aggiungere il simulatore a `sitemap.xml` e `sitemap.txt` del sito: i meta della pagina
   (description, og:*) ci sono già, e da quando la voce non è più nel menu la sitemap conta di più.

## Fonti

- Syllabus MUR 2026/27: https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027
- Testi ufficiali esami 2025/26 (copia): https://wauniversity.it/esami-semestre-filtro-medicina-2025/
- Banca dati MUR test 2024 (3500 quesiti con risposte): https://domande-ap.mur.gov.it/
