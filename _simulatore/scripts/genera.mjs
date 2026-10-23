// Genera domande per un argomento del syllabus, un argomento per volta.
// È la tappa 0 del piano in dati/piano-banca.md: si prova su un argomento, si leggono le domande,
// e solo quando il taglio convince si passa alle altre materie.
//
//   node scripts/genera.mjs bio.1.2          # quante ne prevede il piano per quell'argomento
//   node scripts/genera.mjs bio.1.2 10       # quante ne vuoi tu
//   node scripts/genera.mjs bio.1.2 10 --prompt   # stampa il prompt da incollare in chat, senza chiamare nessuno
//   node scripts/genera.mjs --prompts biologia 10 # i 10 argomenti ancora da fare, i piu' scoperti prima
//   node scripts/genera.mjs --prompts biologia 10 --anche-pronti  # senza saltare quelli gia' coperti
//
// Gli argomenti pesanti vogliono più domande di quante ne stiano bene in una risposta sola, quindi
// oltre MASSIMO_PER_LOTTO le domande si spezzano in più lotti, uno per conversazione, ognuno su una
// fetta diversa dei contenuti del syllabus.
//
// Con --prompt il testo è pronto per essere incollato in una conversazione con Claude: chiede il
// JSON già nella forma della banca, da salvare in dati/generate/<argomento>.json e importare dal
// pannello. È la strada senza chiave API: più lenta, ma non costa niente.
//
// Serve una chiave: variabile d'ambiente ANTHROPIC_API_KEY, oppure un file .env qui accanto
// con dentro ANTHROPIC_API_KEY=sk-ant-...  (il .env è fuori da git).
//
// L'uscita è un file in dati/generate/<argomento>.json nel formato della banca, da importare dal
// pannello domande: entra come bozza e lì si rivede. I controlli sui problemi li fa il pannello,
// che ha già `problemi()`: qui non vengono duplicati.
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

const SALTO = String.fromCharCode(10)
const MODELLO = 'claude-opus-5-5'
const BASE_PIANO = 500 // domande per materia, come da piano
const MASSIMO_PER_LOTTO = 12 // più di così in una risposta sola e in fondo la qualità cala
const LETTERE = 'abcdefgh'
const SOGLIA_COPERTO = 3 // da qui in su l'argomento si considera già fatto e --prompts lo salta
const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const leggiJson = (rel) => JSON.parse(readFileSync(resolve(radice, rel), 'utf8'))

/** La chiave può stare in un .env accanto al progetto invece che nell'ambiente. */
function caricaEnv() {
  if (process.env.ANTHROPIC_API_KEY) return
  const env = resolve(radice, '.env')
  if (!existsSync(env)) return
  for (const riga of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
}

const PREFISSI = { biologia: 'bio', chimica: 'chim', fisica: 'fis' }

/**
 * Ogni campo è obbligatorio e i vuoti si dicono con '' o []: con i campi facoltativi lo schema
 * diventa ambiguo e il modello ne approfitta. La forma della banca si ricostruisce dopo.
 */
const SchemaDomanda = z.object({
  tipo: z.enum(['multipla', 'completamento']),
  testo: z.string(),
  opzioni: z.array(z.string()),
  corretta: z.number(),
  accettate: z.array(z.string()),
  valore_numerico: z.string(),
  tolleranza: z.number(),
  unita: z.string(),
  spiegazione: z.string(),
})
const SchemaLotto = z.object({ domande: z.array(SchemaDomanda) })

function trovaArgomento(codice) {
  const analisi = leggiJson('dati/argomenti-analisi.json')
  for (const materia of analisi.materie) {
    for (const unita of materia.unita) {
      const arg = unita.argomenti.find((a) => a.id === codice)
      if (arg) return { materia, unita, arg }
    }
  }
  return null
}

/** Le domande ufficiali 2025 su questo argomento: solo le sintesi, i testi non li abbiamo e non li vogliamo. */
function esempi2025(codice) {
  const prove = leggiJson('dati/prove_2025_classificate.json')
  return prove.prove.flatMap((p) => p.domande.filter((d) => d.argomento === codice).map((d) => ({ ...d, materia: p.materia })))
}

/**
 * Divide un elenco in `quanti` gruppi consecutivi, bilanciati sulla lunghezza del testo e non sul
 * numero di voci. "fibronectina" e "struttura, funzioni e degradazione della matrice" sono una voce
 * per uno ma non sono due mezzi argomento: spartendo a conteggio, un lotto da dieci domande finiva
 * tutto sulla fibronectina. Ogni gruppo resta non vuoto e l'ordine non cambia, così le voci affini
 * restano insieme.
 */
function fette(elenco, quanti) {
  if (quanti >= elenco.length) return elenco.map((v) => [v])
  const lunghezze = elenco.map((v) => v.length)
  const gruppi = []
  let i = 0
  for (let k = 0; k < quanti; k++) {
    const restanti = quanti - k
    const quota = lunghezze.slice(i).reduce((s, l) => s + l, 0) / restanti
    const gruppo = []
    let preso = 0
    // almeno una voce per gruppo, e una va lasciata a ciascuno dei gruppi che vengono dopo
    while (i < elenco.length - (restanti - 1) && (!gruppo.length || preso + lunghezze[i] / 2 <= quota)) {
      gruppo.push(elenco[i])
      preso += lunghezze[i]
      i++
    }
    gruppi.push(gruppo)
  }
  return gruppi
}

/**
 * Spezza le domande di un argomento in lotti da scrivere in conversazioni separate. I lotti non si
 * vedono fra loro, quindi a ognuno tocca una fetta dei contenuti del syllabus: così non escono due
 * volte le stesse domande e non resta scoperto niente. Mai più lotti che contenuti, o uno resta a secco.
 */
function spezza(arg, quante) {
  const quanti = Math.min(Math.ceil(quante / MASSIMO_PER_LOTTO), arg.contenuti.length || 1)
  const porzioni = fette(arg.contenuti, quanti)
  return porzioni.map((contenuti, i) => ({
    lettera: LETTERE[i],
    quale: i + 1,
    su: quanti,
    quante: Math.floor(quante / quanti) + (i < quante % quanti ? 1 : 0),
    contenuti,
    altrove: porzioni.filter((_, k) => k !== i).flat(),
  }))
}

/**
 * Gli id di un lotto: bio.6.3 lotto a dà bio-63a-01, bio-63a-02… Sono fissi, non casuali, così
 * rigenerando un lotto il pannello sostituisce le sue domande invece di affiancarne una seconda copia.
 */
const marcaLotto = (codice, lettera) => codice.split('.').slice(1).join('') + lettera

/** Dove va salvata la risposta di un lotto. */
const fileLotto = (codice, lotto) => (lotto.su > 1 ? `${codice}-${lotto.lettera}.json` : `${codice}.json`)

/**
 * Il blocco che serve solo quando il prompt si incolla in chat: senza API non c'è lo schema a
 * tenere la forma, quindi il formato va chiesto a parole. La risposta si salva com'è in
 * dati/generate/<argomento>.json e si importa dal pannello.
 */
function formatoPerChat({ materia, arg }, codice, lotto) {
  const marca = `${PREFISSI[materia.id]}-${marcaLotto(codice, lotto.lettera)}`
  return `
FORMATO DELLA RISPOSTA
Rispondi soltanto con un blocco JSON, senza una parola prima né dopo, fatto così:

{
 "materia": "${materia.id}",
 "argomento": "${codice}",
 "titolo": "${arg.titolo}",
 "nota": "${lotto.su > 1 ? `Lotto ${lotto.quale} di ${lotto.su}. ` : ''}Bozze da rivedere nel pannello domande.",
 "domande": [
  {
   "id": "${marca}-01",
   "argomento": "${codice}",
   "tipo": "multipla",
   "stato": "bozza",
   "fonte": "ai-chat",
   "testo": "...",
   "opzioni": ["...", "...", "...", "...", "..."],
   "corretta": 0,
   "spiegazione": "..."
  },
  {
   "id": "${marca}-02",
   "argomento": "${codice}",
   "tipo": "completamento",
   "stato": "bozza",
   "fonte": "ai-chat",
   "testo": "... …… ...",
   "accettate": ["...", "..."],
   "spiegazione": "..."
  }
 ]
}

- Gli id vanno da "${marca}-01" a "${marca}-${String(lotto.quante).padStart(2, '0')}", esattamente così:
  servono a non scontrarsi con i codici già in banca.
- "stato" è sempre "bozza": in prova non deve entrare niente senza che un umano l'abbia letto.
- Nelle multiple non mettere "accettate". Nei completamenti non mettere "opzioni" né "corretta".
- Se la risposta di un completamento è un numero, aggiungi anche
  "numero": {"valore": 0.02, "tolleranza": 0.02} e, se serve, "unita": "m/s".
  La tolleranza è relativa e serve agli arrotondamenti: 0 se la risposta è esatta.`
}

/** Con l'API la forma la tiene lo schema: qui bastano le convenzioni sui campi vuoti. */
const FORMATO_SCHEMA = `
FORMATO
- Nelle multiple lascia "accettate" vuoto. Nei completamenti lascia "opzioni" vuoto e "corretta" a -1.
- Se la risposta di un completamento è un numero, mettilo in "valore_numerico" con il punto decimale
  (es. "0.02"), dai una "tolleranza" relativa per gli arrotondamenti (0.02 vale il 2%, 0 se la
  risposta è esatta) e se serve l'unità in "unita". Altrimenti "valore_numerico" vuoto,
  "tolleranza" 0, "unita" vuota.`

function costruisciPrompt({ materia, unita, arg }, lotto, esempi, perChat = false) {
  const quante = lotto.quante
  const multiple = Math.round((quante * 15) / 31)
  const completamenti = quante - multiple
  const righeEsempi = esempi.length
    ? esempi
        .map((e) => `- [${e.tipo}${e.con_calcolo ? ', con calcolo' : ''}] ${e.sintesi}`)
        .join('\n')
    : '(nessuna domanda ufficiale 2025 su questo argomento: regolati sui contenuti)'

  // I lotti si scrivono in conversazioni separate, che non si vedono: il confine fra l'uno e l'altro
  // va detto a parole, o le stesse domande escono due volte.
  const confine =
    lotto.su > 1
      ? `${SALTO}Questo è il LOTTO ${lotto.quale} DI ${lotto.su} su questo argomento: il resto lo scrive un'altra` +
        `${SALTO}conversazione, sui contenuti rimasti. NON fare domande su: ${lotto.altrove.join('; ')}.${SALTO}`
      : ''

  // Le domande ufficiali 2025 sono classificate per argomento, non per contenuto: a un lotto
  // arrivano anche esempi su contenuti che toccano a un altro. Vanno lette come stile, non come
  // oggetto, e conviene dirlo, altrimenti sembrano contraddire il confine qui sopra.
  const titoloEsempi =
    lotto.su > 1
      ? 'COME HANNO INTERROGATO NEL 2025 SU QUESTO ARGOMENTO (tutto l’argomento, comprese le parti\ndegli altri lotti: guardane il taglio, non il contenuto)'
      : 'COME HANNO INTERROGATO NEL 2025 SU QUESTO ARGOMENTO (solo per capire il taglio, non da riprodurre)'

  return `Prepari domande per la prova del semestre filtro di Medicina, materia ${materia.nome}.

ARGOMENTO: ${arg.titolo}
UNITÀ ${unita.numero} DEL SYLLABUS: ${unita.titolo}
CONTENUTI DA COPRIRE: ${lotto.contenuti.join('; ')}
${confine}
DA PRODURRE: ${quante} domande, ${multiple} a risposta multipla e ${completamenti} a completamento.

${titoloEsempi}:
${righeEsempi}

REGOLE
- Domande originali. Non riprendere domande da UDU, Testbusters, manuali o raccolte, e non
  riprodurre quelle del 2025: le sintesi qui sopra dicono come interrogano, non cosa scrivere.
- Una sola cosa chiesta per domanda.
- Nessun riferimento a figure, tabelle o immagini: la prova è solo testo.
- Copri contenuti diversi fra loro: non ${quante} varianti della stessa domanda.
- MULTIPLE: esattamente cinque opzioni, una sola corretta, "corretta" è l'indice da 0 a 4.
  I distrattori devono essere errori che uno studente fa davvero, non assurdità.
  Mai "tutte le precedenti" o "nessuna delle precedenti".
- COMPLETAMENTO: nel testo metti "……" dove va la risposta. La risposta è UNA SOLA PAROLA, o una
  sigla, un numero, vero/falso: mai una frase, mai due parole. Articoli e preposizioni restano
  nella frase, così che a mancare sia solo il termine: "si dice dipendente da ……" (contatto), e
  non "si dice segnalazione ……" (da contatto). Se la risposta che hai in mente è di due parole,
  riscrivi la frase finché a mancare ne resta una sola.
  In "accettate" elenca tutte le varianti ragionevoli (singolare e plurale, sigla ed esteso), con
  per prima la parola singola, che è quella mostrata nella correzione.
- SPIEGAZIONE: due righe che dicono PERCHÉ la risposta è quella, non la ripetizione della risposta.
- Italiano, registro dei testi ministeriali, niente domande scherzose.
${perChat ? formatoPerChat({ materia, arg }, arg.id, lotto) : FORMATO_SCHEMA}`
}

/** Dalla forma piatta dello schema a quella della banca. */
function perBanca(d, codice, prefisso, indice, marca) {
  const comune = {
    id: `${prefisso}-${marca}-${String(indice + 1).padStart(2, '0')}`,
    argomento: codice,
    tipo: d.tipo,
    stato: 'bozza',
    fonte: `ai-${MODELLO}`,
    testo: d.testo.trim(),
    spiegazione: d.spiegazione.trim(),
  }
  if (d.tipo === 'multipla') {
    return { ...comune, opzioni: d.opzioni.map((o) => o.trim()), corretta: d.corretta }
  }
  const numero = d.valore_numerico.trim() && !Number.isNaN(Number(d.valore_numerico))
    ? { valore: Number(d.valore_numerico), tolleranza: d.tolleranza }
    : undefined
  return {
    ...comune,
    accettate: d.accettate.map((a) => a.trim()).filter(Boolean),
    ...(numero ? { numero } : {}),
    ...(d.unita.trim() ? { unita: d.unita.trim() } : {}),
  }
}

/**
 * Prepara in un colpo solo i prompt degli argomenti che pesano di più di una materia, numerati
 * nell'ordine in cui conviene farli. Serve al giro a mano: una esecuzione, poi si lavora di copia
 * e incolla senza tornare al terminale.
 */
/** Quante domande ha già in banca ciascun argomento di una materia. */
function quanteInBanca(materiaId) {
  const conta = new Map()
  const f = resolve(radice, 'public/domande', `${materiaId}.json`)
  if (!existsSync(f)) return conta
  for (const d of JSON.parse(readFileSync(f, 'utf8')).domande)
    conta.set(d.argomento, (conta.get(d.argomento) ?? 0) + 1)
  return conta
}

function preparaPrompts(materiaId, quanti, anchePronti = false) {
  const analisi = leggiJson('dati/argomenti-analisi.json')
  const materia = analisi.materie.find((m) => m.id === materiaId)
  if (!materia) {
    console.error(`Materia sconosciuta: "${materiaId}". Sono biologia, chimica, fisica.`)
    process.exit(1)
  }
  // Di default si saltano gli argomenti già coperti, altrimenti chiedendone venti si rifanno anche
  // i dieci della volta scorsa. Con --anche-pronti si prendono i più pesanti e basta.
  const conta = quanteInBanca(materiaId)
  const tutti = materia.unita
    .flatMap((u) => u.argomenti.map((a) => ({ unita: u, arg: a })))
    .sort((x, y) => y.arg.peso.suggerito - x.arg.peso.suggerito)
  // Fra gli argomenti da fare vengono prima quelli a zero domande, poi quelli a una, poi quelli a
  // due; a pari copertura decide il peso, che l'ordinamento qui sopra ha già dato. Un argomento mai
  // visto nel simulatore è una domanda che all'esame arriva nuova, e questo conta più di mezzo punto
  // percentuale di peso: il peso dice quanto spesso escono, non quanto è grave non averle.
  const daFare = anchePronti
    ? tutti
    : tutti
        .filter((v) => (conta.get(v.arg.id) ?? 0) < SOGLIA_COPERTO)
        .sort((x, y) => (conta.get(x.arg.id) ?? 0) - (conta.get(y.arg.id) ?? 0))
  const ordinati = daFare.slice(0, quanti)
  if (!ordinati.length) {
    console.error(`Tutti gli argomenti di ${materia.nome} hanno già almeno ${SOGLIA_COPERTO} domande.`)
    console.error('Per prepararli lo stesso: npm run genera -- --prompts ' + materiaId + ' ' + quanti + ' --anche-pronti')
    process.exit(1)
  }
  if (!anchePronti && tutti.length > daFare.length) {
    console.log(`(${tutti.length - daFare.length} argomenti saltati: hanno già ${SOGLIA_COPERTO} domande o più)`)
  }

  const cartella = resolve(radice, 'dati/prompt')
  mkdirSync(cartella, { recursive: true })

  // Via i prompt di questa materia rimasti da un giro precedente: cambiando il numero di argomenti
  // o di lotti i nomi cambiano, e due elenchi accanto non si capisce più quale sia quello buono.
  const vecchi = new RegExp(`^\\d+[a-z]?-${PREFISSI[materiaId]}\\.`)
  const puliti = readdirSync(cartella).filter((n) => vecchi.test(n))
  for (const n of puliti) unlinkSync(resolve(cartella, n))
  if (puliti.length) console.log(`(${puliti.length} prompt del giro precedente cancellati)`)

  const righe = []
  let totale = 0
  let quantiFile = 0
  ordinati.forEach((voce, i) => {
    const quante = Math.max(4, Math.round(voce.arg.peso.suggerito * BASE_PIANO))
    const lotti = spezza(voce.arg, quante)
    const esempi = esempi2025(voce.arg.id)
    totale += quante
    const gia = conta.get(voce.arg.id) ?? 0
    righe.push(
      `### ${i + 1}. ${voce.arg.titolo} — ${quante} domande${lotti.length > 1 ? ` in ${lotti.length} lotti` : ''}` +
        ` · ${gia ? `in banca ne ha ${gia}` : 'in banca non ne ha nessuna'}, peso ${(voce.arg.peso.suggerito * 100).toFixed(1)}%`,
    )
    for (const lotto of lotti) {
      const nome = `${String(i + 1).padStart(2, '0')}${lotto.lettera}-${voce.arg.id}.txt`
      writeFileSync(resolve(cartella, nome), costruisciPrompt({ ...voce, materia }, lotto, esempi, true) + SALTO)
      righe.push(`- [ ] \`${nome}\` (${lotto.quante} domande) → salva in \`dati/generate/${fileLotto(voce.arg.id, lotto)}\``)
      console.log(`  ${nome}  ${String(lotto.quante).padStart(2)} domande  ${voce.arg.titolo}`)
      quantiFile++
    }
    righe.push('')
  })

  const quota = Math.round(ordinati.reduce((s, v) => s + v.arg.peso.suggerito, 0) * 100)
  const elenco = [
    anchePronti
      ? `# ${materia.nome}: i ${quanti} argomenti che pesano di più`
      : `# ${materia.nome}: ${ordinati.length} argomenti ancora da coprire`,
    '',
    `${totale} domande in ${quantiFile} prompt, circa il ${quota}% di quelle che escono in una prova di ${materia.nome.toLowerCase()}.`,
    anchePronti
      ? ''
      : 'In ordine di buco: prima gli argomenti senza nemmeno una domanda, poi quelli a una o due; a pari copertura viene prima quello che pesa di più.',
    '',
    'Per ogni file: aprilo, copia tutto, incollalo in una conversazione NUOVA con Claude, salva il',
    'JSON della risposta dove dice la riga e importalo dal pannello.',
    'Una conversazione nuova ogni volta, anche fra due lotti dello stesso argomento: ognuno ha la sua',
    'fetta di contenuti, e se si vedono fra loro le domande cominciano a somigliarsi.',
    '',
    ...righe,
  ]
  writeFileSync(resolve(cartella, `_${materiaId}.md`), elenco.join(SALTO))
  console.log(`${SALTO}${quantiFile} prompt in dati/prompt/ su ${ordinati.length} argomenti, ${totale} domande (~${quota}% della prova).`)
  console.log(`Le caselle da spuntare sono in dati/prompt/_${materiaId}.md`)
}

/** Una chiamata all'API per un lotto. Gli errori finiscono qui dentro: da qui si esce e basta. */
async function chiediLotto(client, prompt) {
  let risposta
  try {
    risposta = await client.messages.parse({
      model: MODELLO,
      max_tokens: 16000,
      output_config: { effort: 'high', format: zodOutputFormat(SchemaLotto) },
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.error('Chiave rifiutata: controlla ANTHROPIC_API_KEY.')
    else if (e instanceof Anthropic.RateLimitError) console.error('Troppe richieste: riprova fra un minuto.')
    else if (e instanceof Anthropic.APIError) console.error(`Errore ${e.status} dall'API: ${e.message}`)
    else console.error(e)
    process.exit(1)
  }
  if (risposta.stop_reason === 'refusal') {
    console.error(`Richiesta declinata (${risposta.stop_details?.category}). Rivedi il prompt.`)
    process.exit(1)
  }
  if (!risposta.parsed_output) {
    console.error('Il modello non ha restituito il formato chiesto. Riprova.')
    process.exit(1)
  }
  return risposta
}

async function main() {
  const soloPrompt = process.argv.includes('--prompt')
  if (process.argv.includes('--prompts')) {
    const i = process.argv.indexOf('--prompts')
    preparaPrompts(
      process.argv[i + 1] ?? 'biologia',
      Number(process.argv[i + 2]) || 10,
      process.argv.includes('--anche-pronti'),
    )
    return
  }
  const codice = process.argv[2]
  if (!codice) {
    console.error('Serve il codice di un argomento. Esempio: node scripts/genera.mjs bio.1.2 10')
    process.exit(1)
  }
  const trovato = trovaArgomento(codice)
  if (!trovato) {
    console.error(`L'argomento "${codice}" non è nel syllabus. I codici stanno in src/data/argomenti.json.`)
    process.exit(1)
  }

  const quante = Number(process.argv[3]) || Math.max(4, Math.round(trovato.arg.peso.suggerito * BASE_PIANO))
  const esempi = esempi2025(codice)
  const lotti = spezza(trovato.arg, quante)

  if (soloPrompt) {
    for (const lotto of lotti) {
      if (lotto.su > 1) {
        const dove = `dati/generate/${fileLotto(codice, lotto)}`
        console.log(`${SALTO}===== LOTTO ${lotto.quale} DI ${lotto.su} — conversazione a parte, risposta in ${dove} =====${SALTO}`)
      }
      console.log(costruisciPrompt(trovato, lotto, esempi, true))
    }
    return
  }

  caricaEnv()
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'Manca la chiave. Mettila in ANTHROPIC_API_KEY, oppure in un file _simulatore/.env con dentro:\n' +
        '  ANTHROPIC_API_KEY=sk-ant-...\n' +
        'La chiave si fa da console.anthropic.com. Il .env è già escluso da git.',
    )
    process.exit(1)
  }

  console.log(`${trovato.materia.nome} · ${trovato.arg.titolo}`)
  console.log(
    `${quante} domande in ${lotti.length === 1 ? 'un lotto' : `${lotti.length} lotti`}, ` +
      `${esempi.length} esempi dal 2025, modello ${MODELLO}. Attendi…`,
  )

  const client = new Anthropic()
  const prefisso = PREFISSI[trovato.materia.id]
  const domande = []
  let dentro = 0
  let fuori = 0
  for (const lotto of lotti) {
    if (lotto.su > 1) console.log(`  lotto ${lotto.quale} di ${lotto.su}: ${lotto.quante} domande su ${lotto.contenuti.join('; ')}`)
    const risposta = await chiediLotto(client, costruisciPrompt(trovato, lotto, esempi))
    const marca = marcaLotto(codice, lotto.lettera)
    domande.push(...risposta.parsed_output.domande.map((d, i) => perBanca(d, codice, prefisso, i, marca)))
    dentro += risposta.usage.input_tokens
    fuori += risposta.usage.output_tokens
  }

  mkdirSync(resolve(radice, 'dati/generate'), { recursive: true })
  const uscita = resolve(radice, 'dati/generate', `${codice}.json`)
  writeFileSync(
    uscita,
    JSON.stringify(
      {
        materia: trovato.materia.id,
        argomento: codice,
        titolo: trovato.arg.titolo,
        generato: new Date().toISOString(),
        modello: MODELLO,
        nota:
          'Bozze da rivedere nel pannello domande: nessuna di queste è approvata.' +
          (lotti.length > 1 ? ` Scritte in ${lotti.length} lotti su contenuti diversi.` : ''),
        domande,
      },
      null,
      1,
    ) + '\n',
  )

  const multiple = domande.filter((d) => d.tipo === 'multipla').length
  console.log(`\nScritte ${domande.length} domande (${multiple} multiple, ${domande.length - multiple} completamenti)`)
  console.log(`in ${uscita}`)
  console.log(`Token: ${dentro} in ingresso, ${fuori} in uscita.`)
  console.log('\nOra aprile dal pannello (npm run dev, /admin.html) con "Importa JSON".')
}

main()
