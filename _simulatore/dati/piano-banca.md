# Piano di generazione della banca domande

Come passare dalle 93 domande dimostrative a una banca vera, senza copiare da nessuno e senza
ritrovarsi 1200 domande da buttare. Scritto il 22 ottobre 2026.

## 1. Quante domande, e dove

Obiettivo **500 per materia** (scelto il 22 ottobre 2026), distribuite per argomento con la formula
dei pesi già usata dal generatore: `peso = 0,5·CFU + 0,35·prove 2025 + 0,15·banca 2024`, con un
**minimo di 4 per argomento** perché nessuno resti scoperto.

| materia | domande | multiple | completamenti | per argomento |
|---|---|---|---|---|
| biologia | 499 | 240 | 259 | da 5 a 22 |
| chimica | 498 | 239 | 259 | da 4 a 30 |
| fisica | 501 | 239 | 262 | da 4 a 29 |
| **totale** | **1498** | 718 | 780 | |

A 500 il minimo di 4 serve per un argomento solo, in fisica: la distribuzione per peso fa tutto da sé.

Il taglio multiple/completamenti è 15:16, lo stesso della prova. Non è una scelta estetica: serve a
garantire che ogni materia abbia sempre abbastanza domande di entrambi i tipi per comporre una prova.
Con questi numeri il margine è **sedici volte** il minimo, quindi si possono fare molte prove di fila
senza rivedere le stesse domande.

Oggi siamo a 31 per materia, cioè esattamente il minimo per una prova sola.

## 2. Da dove viene il contenuto

Tutto quello che serve è già nel progetto, non va cercato altrove:

- **`dati/argomenti-analisi.json`** — per ogni argomento: `titolo`, l'elenco dei `contenuti`
  (i sotto-argomenti precisi del syllabus), il peso, quante domande ne sono uscite nel 2025 e in che
  forma. È questo che dice al modello di cosa parlare.
- **`dati/prove_2025_classificate.json`** — le 186 domande ufficiali 2025, classificate per argomento,
  con tipo, `con_calcolo` e una `sintesi` di una riga che dice che taglio aveva la domanda. **Non
  contiene i testi originali**, e va tenuto così: serve a capire come interrogano, non a ricopiare.
- **`src/data/argomenti.json`** — i codici degli argomenti, che sono la chiave di tutto.

Attenzione: solo 28–32 argomenti per materia hanno almeno una domanda ufficiale 2025. Per il resto
(circa un quarto) non esiste un esempio di taglio e il prompt si appoggia ai soli `contenuti`.

## 3. La catena di montaggio

Sei passi, ognuno con un'uscita controllabile prima di passare al successivo.

1. **Prompt per argomento** — uno script costruisce, argomento per argomento, la richiesta al modello:
   unità e titolo, l'elenco dei `contenuti`, quante domande e di che tipo, le sintesi delle domande
   ufficiali 2025 su quell'argomento come esempi di taglio, e le regole del punto 5.
   L'argomento è l'unità di lavoro giusta: il prompt resta corto e mirato, e si può rifare un
   argomento solo senza toccare gli altri.
2. **Generazione** — il modello risponde nel formato della banca, con `stato: "bozza"` e
   `fonte: "ai-<data>"`. Niente entra approvato: la revisione umana non è saltabile.
3. **Controlli automatici** — gli stessi di `src/admin/modello.ts` (`problemi()`), riusati da script:
   cinque opzioni non vuote e non ripetute, risposta corretta indicata, "……" presente nei
   completamenti, argomento esistente e della materia giusta. Quello che non passa non viene buttato:
   resta bozza con l'avviso attaccato, da sistemare a mano o da rigenerare.
4. **Verifica con un secondo modello** — un modello **diverso** da quello che ha generato risponde
   alla domanda **senza vedere la soluzione**. Se concorda, la domanda è candidata. Se non concorda,
   va in revisione: o la domanda è ambigua, o la soluzione è sbagliata, e sono i due casi che fanno
   più danno a uno studente. Per i completamenti la verifica passa anche da `correzione.ts`: la
   risposta del verificatore deve essere accettata dalla correzione vera, altrimenti il problema è
   nelle `accettate` troppo strette. Senza chiave API questo passo si fa a mano con
   `npm run verifica`, descritto nel §9.
5. **Quasi-duplicati** — dentro ogni argomento si confrontano le domande generate; a quelle troppo
   simili (testo normalizzato e risposta) si assegna lo stesso `gruppo`, che il generatore già usa per
   non farle uscire insieme. È un meccanismo che esiste da sempre e non è mai stato messo alla prova,
   perché nessuna delle 93 domande attuali ha un `gruppo`.
6. **Import e revisione nel pannello** — un file JSON per materia, importato dal pannello come bozza,
   poi si approva a mano.

## 4. Lo schema del prompt

```
Sei un docente che prepara domande per la prova del semestre filtro di Medicina.

ARGOMENTO: <titolo> (unità <n>: <titolo unità>, materia <materia>)
CONTENUTI DEL SYLLABUS: <la fetta di contenuti di questo lotto>
<se spezzato> LOTTO <i> DI <n>, NON fare domande su: <i contenuti degli altri lotti>
DA PRODURRE: <n> domande, <m> a risposta multipla e <c> a completamento
COME HANNO INTERROGATO NEL 2025 SU QUESTO ARGOMENTO:
  - [multipla] <sintesi>
  - [completamento, con calcolo] <sintesi>
REGOLE: <punto 5>
FORMATO: <lo schema JSON della banca>
```

Le sintesi 2025 vanno date come *esempi di taglio*, con l'istruzione esplicita di non riprodurle.
Sono classificate per argomento e non per contenuto, quindi a un lotto spezzato arrivano anche
esempi su contenuti che toccano a un altro: il prompt lo dice, altrimenti sembrano contraddire il
confine del lotto.

## 5. Regole di contenuto

- **Domande originali.** Non copiare da UDU, Testbusters, manuali o raccolte. Le sintesi 2025 dicono
  che taglio hanno le domande vere, non cosa scrivere.
- Una sola cosa chiesta per domanda.
- Nessun riferimento a figure, tabelle o immagini: la prova è solo testo.
- Multiple: cinque opzioni, una sola corretta, distrattori plausibili (errori che uno studente fa
  davvero, non assurdità). Mai "tutte le precedenti" o "nessuna delle precedenti".
- Completamenti: la risposta è **una sola parola**, sigla, numero o vero/falso. Mai una frase, mai
  due parole: articoli e preposizioni restano nella frase, così che a mancare sia solo il termine
  (`si dice dipendente da ……` → "contatto", non `si dice segnalazione ……` → "da contatto"). Se la
  risposta viene di due parole, lo spazio è nel posto sbagliato e la frase va riscritta.
  Le varianti ragionevoli (singolare/plurale, sigla ed esteso) vanno tutte in `accettate`, con per
  prima la parola singola, che è quella mostrata in correzione; le altre possono essere lunghe,
  servono solo a non bocciare chi scrive per esteso.
  Il pannello lo controlla da sé: se la prima accettata ha più di una parola segnala
  "la risposta è più di una parola" e la domanda entra come bozza.
- Numeri: `numero: {valore, tolleranza}` e `unita`. La tolleranza è relativa e serve agli
  arrotondamenti, non a perdonare un errore di metodo.
- **Quota di calcolo per materia**, dal dato 2025: fisica circa il 40% delle domande, chimica circa
  l'11%, biologia quasi zero. È la differenza più grossa fra le tre e va rispettata.
- Italiano, registro dei testi ministeriali.
- Spiegazione obbligatoria: due righe che dicono perché la risposta è quella, non la ripetizione
  della risposta.

## 6. La revisione umana è il collo di bottiglia

1498 domande da leggere una per una. Non si aggira, ma si può ordinare:

- Si approva **per argomento**, partendo da quelli che pesano di più. Così la banca diventa usabile
  molto prima di essere completa: con i primi 15 argomenti per peso si coprono già quasi metà delle
  domande che escono in una prova.
- Il pannello mostra gli avvisi: le domande che non passano i controlli e quelle su cui il
  verificatore non era d'accordo vanno guardate per prime, sono quelle dove si nasconde il danno.
- Finché una materia non ha almeno 15 multiple e 16 completamenti approvati non compone una prova:
  è il pannello stesso a dirlo, con l'avviso rosso sotto i conteggi.

## 7. Le tappe

- ~~**Tappa 0 — un argomento solo.**~~ **Fatta il 22 ottobre 2026 su `bio.1.2` (Virus): taglio
  approvato.** Dieci domande, 5 multiple e 5 completamenti, lette una per una. Hanno superato
  `problemi()` del pannello senza un avviso, e per ogni completamento la correzione vera accetta
  tutte le varianti elencate in `accettate` (`f` per falso, `RNA messaggero` per `mRNA`,
  `capsomeri` al plurale): è il controllo del punto 4 della catena, utile già alla prima prova.
  Le domande stanno in `dati/generate/bio.1.2.json`, tutte come bozze.
  Nota: quelle dieci sono state scritte in conversazione, non dallo script. Il prompt è lo stesso,
  ma dalla tappa 1 in poi serve la chiave API: 1488 domande a mano non si fanno.
- **Tappa 1 — biologia** (44 argomenti, 499 domande): generazione, verifica, import, revisione,
  pubblicazione. A fine tappa il simulatore è già vero per una materia.
  **Fatta per i primi dieci argomenti** (23 ottobre 2026): 179 domande scritte, riviste una per una
  e approvate, più le 10 della tappa 0. La banca di biologia è a 220 domande, margine 7,1 volte il
  minimo. Restano i 34 argomenti più leggeri, il 21% del peso della prova.
  Due cose imparate qui, che valgono per chimica e fisica:
  i file in `dati/generate/` vanno riallineati alla banca dopo la revisione, altrimenti una seconda
  importazione riporta indietro le correzioni fatte nel pannello (è capitato: una domanda riscritta
  a mano è tornata alla versione generata);
  e la revisione non serve solo a scartare — su 36 domande ha allargato le risposte accettate,
  che è il lavoro che nessun modello può fare al posto nostro.
  I fogli per la verifica alla cieca di tutti e dieci restano in `dati/verifica/`, non ancora usati.
- **Tappa 2 — chimica. Fatta per i primi dieci argomenti** (23 ottobre 2026): 190 domande in 21
  lotti, 91 multiple e 99 completamenti, 17 con risposta numerica (il 9%, contro l'11% di domande
  con calcolo misurato nel 2025). Riviste, approvate e pubblicate: la banca di chimica è a 221
  domande, margine 7,1 volte il minimo. Restano i 32 argomenti più leggeri, il 16% del peso.
  Nota: `chim.4.1` (acidi e basi) pesa da sola 30 domande e si spezza in tre lotti; nei numerici
  conviene controllare in revisione che la `tolleranza` sia quella giusta, perché è l'unico campo
  che i controlli automatici non possono giudicare.
- **Tappa 3 — fisica. Fatta per i primi dieci argomenti** (23 ottobre 2026): 218 domande in 23
  lotti, 103 multiple e 115 completamenti, **81 con calcolo, il 37%** contro il 40% delle prove 2025.
  Riviste, approvate e pubblicate: la banca di fisica è a 249 domande, margine 7,9 volte il minimo.
  Restano i 28 argomenti più leggeri, il 14% del peso.
  La quota non è stata alzata a caso: il confronto argomento per argomento con le prove ufficiali
  mostra che la media globale nasconde due mondi. Statica dei fluidi 6 domande su 6 con calcolo,
  unità di misura 6 su 7, corrente 2 su 3; dinamica 0 su 1, lavoro ed energia 0 su 3,
  termodinamica 0 su 2. Sono state quindi sostituite 21 domande concettuali ridondanti con esercizi
  numerici **solo nei quattro argomenti che calcolano** (fluidi, unità, corrente, idrodinamica),
  lasciando intatti gli altri. Il campione 2025 per argomento è di 1-7 domande: va preso come
  direzione, non come obiettivo da centrare.
  Qui la verifica ha trovato un difetto nella correzione, non nelle domande: `leggiNumero` non
  riconosceva un numero seguito da un'unità con cifre dentro (`5 m/s^2`), quindi avrebbe segnato
  errate risposte giuste. Corretto, con sette casi nuovi nei test. È il tipo di difetto che
  solo le domande di fisica potevano far emergere, e che nessun controllo sulle domande avrebbe visto.

Ogni tappa finisce con `npm run pubblica`, commit e push, quindi il simulatore migliora a pezzi invece
di restare fermo fino alla fine.

**Dove siamo alla fine delle tre tappe** (23 ottobre 2026): 690 domande approvate e online, da 93
che erano. La revisione umana ne ha corrette 136 su 597, quasi sempre allargando le risposte
accettate. Restano 33 argomenti su 124 senza nemmeno una domanda: sono i più leggeri, fra il 14% e
il 21% del peso a seconda della materia, e per coprirli basta rilanciare `--prompts <materia> 20`
e lavorare sui dieci successivi.
Dopo ogni revisione vanno riallineati i file in `dati/generate/`, altrimenti un reimport riporta
indietro le correzioni fatte nel pannello.

## 8. Lo script

`scripts/genera.mjs` fa la tappa 0: un argomento per volta.

```bash
npm run genera -- bio.1.2 10            # dieci domande su Virus
npm run genera -- bio.1.2               # quante ne prevede il piano per quell'argomento
npm run genera -- bio.1.2 10 --prompt   # stampa il prompt e basta, senza chiamare nessuno
```

Costruisce il prompt dai tre file di dati, chiama **Claude Opus 5.5** con gli output strutturati
(così il JSON torna sempre nella forma giusta) una volta per lotto, e scrive un solo
`dati/generate/<argomento>.json` con dentro tutti i lotti, nel formato
della banca, con `stato: "bozza"` su tutto. Da lì si importa dal pannello, che fa i controlli con il
suo `problemi()`: non sono duplicati nello script, altrimenti un giorno divergono.

`--prompt` serve a tarare il testo senza spendere niente: è la cosa che si tocca di più.

**Serve una chiave API** in `ANTHROPIC_API_KEY` o in un file `_simulatore/.env` (già escluso da
git), presa da console.anthropic.com. Senza, lo script si ferma e lo dice.

## 9. Senza chiave API: il giro a mano

La chiave costa, i crediti dei piani Max e Team non ci sono. Allora il prompt si incolla in una
conversazione con Claude, che è già pagata: più lento, ma non costa niente e il risultato è lo
stesso, perché il prompt è identico.

Un comando solo prepara tutti i prompt di una materia, in ordine di peso:

```bash
npm run genera -- --prompts biologia 10
```

Scrive `dati/prompt/01a-bio.6.3.txt`, `01b-bio.6.3.txt`, `02a-bio.4.2.txt` e via dicendo, più un
`dati/prompt/_biologia.md` con le caselle da spuntare mano a mano. Da lì si lavora di copia e
incolla senza tornare al terminale. Rilanciando il comando i prompt del giro precedente di quella
materia vengono cancellati, così non restano due elenchi accanto.

Per un argomento singolo basta `npm run genera -- <argomento> --prompt`, che stampa e basta.

**I lotti.** Un argomento pesante vuole più di venti domande, e in fondo a una risposta così lunga
la qualità cala. Oltre `MASSIMO_PER_LOTTO` (12) lo script spezza: due file invece di uno, una
conversazione per ciascuno. I lotti non si vedono fra loro, quindi a ognuno tocca una fetta diversa
dei contenuti del syllabus, scritta nel prompt insieme all'elenco di quelli da non toccare: è
questo che evita sia i doppioni sia i buchi. Gli id sono fissi per argomento e lotto
(`bio-63a-01`… per il lotto a di `bio.6.3`), non casuali: rigenerando un lotto venuto male il
pannello sostituisce le sue domande invece di affiancarne una seconda copia.

Poi, per ogni file:

1. Aprilo e copia tutto.
2. Incollalo in una conversazione nuova con Claude (una per file, anche fra due lotti dello stesso
   argomento: la memoria della conversazione precedente farebbe assomigliare le domande fra loro).
3. Copia il JSON della risposta e salvalo dove dice la riga dell'elenco:
   `dati/generate/<argomento>.json`, o `<argomento>-a.json` e `-b.json` se l'argomento è spezzato.
4. Dal pannello domande, "Importa JSON": entra tutto come bozza, con gli avvisi se qualcosa non va.
5. Rileggi e approva.

Con `--prompt` il testo chiede il JSON già nella forma della banca, id compresi: non c'è niente da
sistemare a mano fra la risposta e il file.

**La verifica alla cieca, sempre senza chiave.** È il passo 4 della catena, fatto come il resto:

```bash
npm run verifica -- --cieca bio.6.3       # le domande senza soluzione, e le chiavi a parte
npm run verifica -- --confronta bio.6.3   # legge dati/verifica/bio.6.3-risposte.txt
```

`--cieca` raccoglie tutti i lotti dell'argomento, toglie risposte e spiegazioni e numera le domande;
`dati/verifica/<codice>-domande.txt` si incolla in una conversazione **nuova**, meglio con un
modello diverso da quello che le ha scritte, perché lo stesso modello conferma i propri errori.
La risposta si salva in `<codice>-risposte.txt` (una riga per domanda: `01 · C · alta`; il parser
accetta anche `|`, ` - `, il JSON, e la riga senza separatori).

`--confronta` carica `src/lib/correzione.ts` con il module runner di Vite: **non è una copia della
correzione, è quella vera**, la stessa che corregge la prova. Quindi una risposta che il simulatore
accetterebbe risulta accettata anche qui. È da qui che vengono fuori le varianti mancanti: se il
verificatore scrive `Ca` dove la chiave è `calcio` e `accettate` non lo prevede, il confronto lo
segnala come discordanza, e sta a te decidere se la domanda è ambigua o se la variante va aggiunta.
Il rapporto divide le discordanze da rivedere, le risposte giuste ma date con sicurezza bassa, le
note del verificatore e le domande senza risposta.

L'accordo non è una prova di correttezza: due modelli che hanno imparato lo stesso errore sbagliano
insieme. Serve a trovare le domande sospette, non a promuovere le altre.

**L'ordine conta più della completezza.** Sono 124 argomenti: a mano sono tante sedute, e non è
necessario finirle tutte prima che il simulatore diventi utile. Facendo per ogni materia i dieci
argomenti che pesano di più:

| | argomenti | domande | conversazioni | quota della prova coperta |
|---|---|---|---|---|
| biologia, primi 10 | 10 su 44 | 179 | 20 | 36% |
| chimica, primi 10 | 10 su 42 | 190 | 21 | 38% |
| fisica, primi 10 | 10 su 38 | 218 | 23 | 44% |
| **in tutto** | **30 su 124** | **587** | **64** | **~40%** |

Trenta argomenti invece di 124, e la banca passa da 93 a quasi 700 domande: il simulatore smette di
dare sempre le stesse. Le conversazioni sono più degli argomenti perché i pesanti si spezzano in
due lotti; una seduta ne regge più di una. Arrivando a venti argomenti per materia si copre il 60-73%.
L'elenco ordinato per peso sta in `argomenti-analisi.json`, campo `peso.suggerito`.

## 10. Deciso

1. **500 per materia**, 1498 domande in tutto.
2. **Chi genera e chi verifica devono essere modelli diversi**, altrimenti il secondo conferma gli
   errori del primo. La verifica alla cieca c'è e si fa a mano (§9, `npm run verifica`): è il
   passo 4 della catena, e l'unico pezzo che usa la correzione vera del simulatore invece di una
   copia. Quella automatica, con i due modelli chiamati dallo script, resta da fare e vuole la chiave.
3. **Gli script stanno in `_simulatore/scripts/`** e girano in locale, con i lotti salvati su file
   così una generazione interrotta riprende invece di ricominciare.
