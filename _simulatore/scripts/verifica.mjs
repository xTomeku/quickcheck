// Verifica alla cieca di un argomento: prepara le domande senza soluzione, e confronta le risposte
// del verificatore con le chiavi.
//
//   node scripts/verifica.mjs --cieca bio.6.3       # scrive le domande senza soluzione, e le chiavi
//   node scripts/verifica.mjs --nuove biologia      # i fogli (da 45) delle domande del terzo giro e del quarto lotto
//   node scripts/verifica.mjs --prof fisica         # i fogli (da 45) delle bozze della profondità 20, prima di importarle
//   node scripts/verifica.mjs --confronta bio.6.3   # legge dati/verifica/bio.6.3-risposte.txt
//
// È il passo 4 della catena in dati/piano-banca.md, fatto a mano: le domande si incollano in una
// conversazione NUOVA (meglio con un modello diverso da quello che le ha scritte), la risposta si
// salva e si confronta. Dove il verificatore non è d'accordo, o la domanda è ambigua o la chiave è
// sbagliata: sono i due casi che fanno più danno a chi studia.
//
// Il confronto non usa una copia della correzione: carica `src/lib/correzione.ts` con il module
// runner di Vite, cioè lo stesso codice che corregge la prova vera. Così una risposta che il
// simulatore accetterebbe risulta accettata anche qui, e una che rifiuterebbe risulta rifiutata:
// se il verificatore scrive "Ca" e viene segnata errata, hai trovato una variante mancante.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SALTO = String.fromCharCode(10)
const LETTERE = 'ABCDE'
const SICUREZZA = /^(alta|media|bassa)$/i
const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cartellaGenerate = resolve(radice, 'dati/generate')
const cartellaVerifica = resolve(radice, 'dati/verifica')

/** I file di un argomento: `<codice>.json` se non è spezzato, `<codice>-a.json` e `-b.json` se lo è. */
function lottiDi(codice) {
  if (!existsSync(cartellaGenerate)) return []
  const atteso = new RegExp(`^${codice.replace(/\./g, '\\.')}(-[a-z])?\\.json$`)
  return readdirSync(cartellaGenerate)
    .filter((n) => atteso.test(n))
    .sort()
}

const bancaDi = (materia) =>
  JSON.parse(readFileSync(resolve(radice, 'public/domande', `${materia}.json`), 'utf8')).domande.filter(
    (d) => !d.stato || d.stato === 'approvata',
  )
const PREFISSO_MATERIA = { bio: 'biologia', chim: 'chimica', fis: 'fisica' }
const PEZZO = 45

/** Gli id scritti nel terzo giro e nel quarto lotto: dati/generate/_terzo-giro-*.json e _quarto-giro-*.json. */
function idNuovi(materia) {
  return ['_terzo-giro', '_quarto-giro'].flatMap((p) => {
    const f = resolve(cartellaGenerate, `${p}-${materia}.json`)
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).domande.map((d) => d.id) : []
  })
}

/** Le bozze della profondità 20 di una materia (non ancora in banca). */
function bozzeProfondita(materia, suffisso = '') {
  const f = resolve(cartellaGenerate, `_giro5${suffisso}-${materia}.json`)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).domande : []
}

/**
 * Le domande da verificare. Di norma si guarda la banca approvata, che è quella vera, dopo la revisione:
 *   bio.6.3            tutte le approvate di quell'argomento
 *   biologia-nuove-2   il secondo pezzo (45 domande) di quelle scritte nel terzo giro e nel quarto lotto
 * Con --lotti si torna ai vecchi file di dati/generate (<codice>.json, <codice>-a.json...).
 */
function domandeDi(codice) {
  // fogli della profondità 20: le bozze di dati/generate/_giro5-<materia>.json, da verificare prima di importarle
  const prof = codice.match(/^(biologia|chimica|fisica)-prof([a-z]?)-(\d+)$/)
  if (prof) {
    const da = (Number(prof[3]) - 1) * PEZZO
    return bozzeProfondita(prof[1], prof[2]).slice(da, da + PEZZO)
  }
  const nuove = codice.match(/^(biologia|chimica|fisica)-nuove-(\d+)$/)
  if (nuove) {
    const ids = new Set(idNuovi(nuove[1]))
    const tutte = bancaDi(nuove[1]).filter((d) => ids.has(d.id))
    const da = (Number(nuove[2]) - 1) * PEZZO
    return tutte.slice(da, da + PEZZO)
  }
  if (!process.argv.includes('--lotti')) {
    const materia = PREFISSO_MATERIA[codice.split('.')[0]]
    if (!materia) {
      console.error(`Non capisco "${codice}": serve un argomento come bio.6.3 o un pezzo come biologia-nuove-1.`)
      process.exit(1)
    }
    const domande = bancaDi(materia).filter((d) => d.argomento === codice)
    if (!domande.length) {
      console.error(`Nessuna domanda approvata per "${codice}" in public/domande/${materia}.json.`)
      process.exit(1)
    }
    return domande
  }
  const lotti = lottiDi(codice)
  if (!lotti.length) {
    console.error(`Nessun lotto per "${codice}" in dati/generate/. Cerco ${codice}.json oppure ${codice}-a.json.`)
    process.exit(1)
  }
  return lotti.flatMap((n) => JSON.parse(readFileSync(resolve(cartellaGenerate, n), 'utf8')).domande)
}

const taglia = (s, n = 44) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function cieca(codice) {
  const domande = domandeDi(codice)
  mkdirSync(resolve(cartellaVerifica, 'domande'), { recursive: true })
  mkdirSync(resolve(cartellaVerifica, 'chiavi'), { recursive: true })

  const righe = [
    `VERIFICA ALLA CIECA — ${codice} (${domande.length} domande)`,
    '',
    'Rispondi senza cercare in rete e senza spiegare. Una riga per domanda, in questa forma:',
    '',
    '  numero · risposta · sicurezza (alta, media o bassa)',
    '',
    'Per le multiple indica la lettera. Per i completamenti scrivi la parola che va al posto di «……».',
    'Se due opzioni ti sembrano entrambe accettabili, o la domanda ti pare ambigua, aggiungilo in coda',
    'alla riga. Rispondi a tutte, anche dove non sei sicuro: la sicurezza bassa è un dato utile.',
    '',
    '---',
    '',
  ]
  const chiavi = [`CHIAVI — ${codice}`, '']

  domande.forEach((d, i) => {
    const num = String(i + 1).padStart(2, '0')
    righe.push(`${num}. ${d.testo}`)
    if (d.tipo === 'multipla') {
      d.opzioni.forEach((o, k) => righe.push(`    ${LETTERE[k]}) ${o}`))
      chiavi.push(`${num}  ${d.id}  ${LETTERE[d.corretta]}) ${d.opzioni[d.corretta]}`)
    } else {
      chiavi.push(`${num}  ${d.id}  ${d.accettate[0]}   [accettate: ${d.accettate.join(' / ')}]`)
    }
    righe.push('')
  })

  const fileDomande = resolve(cartellaVerifica, 'domande', `${codice}-domande.txt`)
  writeFileSync(fileDomande, righe.join(SALTO))
  writeFileSync(resolve(cartellaVerifica, 'chiavi', `${codice}-chiavi.txt`), `${chiavi.join(SALTO)}${SALTO}`)

  console.log(`${domande.length} domande senza soluzione.`)
  console.log(`  dati/verifica/domande/${codice}-domande.txt   da incollare in una conversazione nuova`)
  console.log(`  dati/verifica/chiavi/${codice}-chiavi.txt    le chiavi, da non guardare prima`)
  console.log(`${SALTO}Salva la risposta in dati/verifica/${codice}-risposte.txt, poi:`)
  console.log(`  npm run verifica -- --confronta ${codice}`)
}

/** Una riga del verificatore: "01 · C · alta", "1) ionotropici", "05 | B | bassa | ambigua". */
function leggiRisposte(testo) {
  const perNumero = new Map()
  const perId = new Map()
  const t = testo.trim()

  if (t.startsWith('[') || t.startsWith('{')) {
    const letto = JSON.parse(t)
    for (const v of Array.isArray(letto) ? letto : (letto.risposte ?? [])) {
      const voce = {
        risposta: String(v.risposta ?? v.r ?? ''),
        sicurezza: String(v.sicurezza ?? '').toLowerCase(),
        nota: String(v.nota ?? ''),
      }
      if (v.id) perId.set(v.id, voce)
      if (v.numero ?? v.n) perNumero.set(Number(v.numero ?? v.n), voce)
    }
    return { perNumero, perId }
  }

  for (const riga of t.split(/\r?\n/)) {
    const m = riga.match(/^\s*(\d{1,3})\s*[.)\]]?\s*[·|;:-]?\s*(.+)$/)
    if (!m) continue
    let campi = m[2]
      .split(/\s*[·|;]\s*|\s+-\s+|\t+/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (!campi.length) continue
    // chi scrive tutto di fila ("C alta") invece di separare con ·
    if (campi.length === 1) {
      const coda = campi[0].match(/^(.*\S)\s+(alta|media|bassa)$/i)
      if (coda) campi = [coda[1], coda[2]]
    }
    const [risposta, ...resto] = campi
    perNumero.set(Number(m[1]), {
      risposta,
      sicurezza: (resto.find((c) => SICUREZZA.test(c)) ?? '').toLowerCase(),
      nota: resto.filter((c) => !SICUREZZA.test(c)).join(' · '),
    })
  }
  return { perNumero, perId }
}

/** La correzione vera del simulatore, caricata dal sorgente TypeScript con il module runner di Vite. */
async function correzioneVera() {
  const { createServer, createServerModuleRunner } = await import('vite')
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
  const runner = createServerModuleRunner(server.environments.ssr)
  const modulo = await runner.import('/src/lib/correzione.ts')
  return { ...modulo, chiudi: () => server.close() }
}

function giudica(d, risposta, { normalizza, rispostaCorretta }) {
  if (d.tipo === 'multipla') {
    const pulita = risposta.trim()
    const lettera = pulita.match(/^\(?([a-e])\)?$/i)
    const indice = lettera
      ? LETTERE.indexOf(lettera[1].toUpperCase())
      : d.opzioni.findIndex((o) => normalizza(o) === normalizza(pulita))
    return {
      ok: indice === d.corretta,
      atteso: `${LETTERE[d.corretta]}) ${taglia(d.opzioni[d.corretta])}`,
      dato: indice >= 0 ? `${LETTERE[indice]}) ${taglia(d.opzioni[indice])}` : `«${taglia(pulita)}» non riconosciuta`,
    }
  }
  return {
    ok: rispostaCorretta(d, risposta),
    atteso: `«${taglia(d.accettate[0])}»`,
    dato: `«${taglia(risposta)}»`,
  }
}

async function confronta(codice) {
  const domande = domandeDi(codice)
  const fileRisposte = resolve(cartellaVerifica, `${codice}-risposte.txt`)
  if (!existsSync(fileRisposte)) {
    console.error(`Manca dati/verifica/${codice}-risposte.txt.`)
    console.error(`Prepara le domande con:  npm run verifica -- --cieca ${codice}`)
    console.error('poi incollale in una conversazione nuova e salva lì la risposta.')
    process.exit(1)
  }

  const { perNumero, perId } = leggiRisposte(readFileSync(fileRisposte, 'utf8'))
  if (!perNumero.size && !perId.size) {
    console.error('Nel file delle risposte non ho trovato nessuna riga leggibile.')
    console.error('Serve una riga per domanda, tipo:  01 · C · alta')
    process.exit(1)
  }

  const correzione = await correzioneVera()
  const daRivedere = []
  const insicure = []
  const note = []
  const mancanti = []
  let accordo = 0

  domande.forEach((d, i) => {
    const num = i + 1
    const dato = perId.get(d.id) ?? perNumero.get(num)
    if (!dato || !dato.risposta) {
      mancanti.push(`${String(num).padStart(2, '0')}  ${d.id}`)
      return
    }
    const esito = giudica(d, dato.risposta, correzione)
    const riga = `${String(num).padStart(2, '0')}  ${d.id}  ${d.tipo === 'multipla' ? 'multipla     ' : 'completamento'}`
    if (esito.ok) {
      accordo++
      if (dato.sicurezza === 'bassa') insicure.push(`${riga}  ${esito.atteso}`)
    } else {
      daRivedere.push(`${riga}${SALTO}      atteso  ${esito.atteso}${SALTO}      dato    ${esito.dato}`)
    }
    if (dato.nota) note.push(`${String(num).padStart(2, '0')}  ${d.id}  ${dato.nota}`)
  })

  await correzione.chiudi()

  const stampa = (titolo, righe, coda) => {
    if (!righe.length) return
    console.log(`${SALTO}${titolo}`)
    for (const r of righe) console.log(`  ${r}`)
    if (coda) console.log(`  ${coda}`)
  }

  console.log(`${codice} · ${domande.length} domande · il verificatore è d'accordo su ${accordo}`)
  stampa(`DA RIVEDERE (${daRivedere.length})`, daRivedere, 'Per i completamenti: o la domanda è ambigua, o manca la variante in "accettate".')
  stampa(`GIUSTE MA CON SICUREZZA BASSA (${insicure.length})`, insicure)
  stampa('NOTE DEL VERIFICATORE', note)
  stampa(`SENZA RISPOSTA (${mancanti.length})`, mancanti)

  if (!daRivedere.length) {
    console.log(`${SALTO}Nessuna discordanza. Attenzione: l'accordo non è una prova di correttezza —`)
    console.log("se il verificatore ha studiato le stesse cose sbagliate, sbaglia d'accordo con te.")
  } else {
    console.log(`${SALTO}Le domande da rivedere si cercano nel pannello per id, e lì si correggono o si scartano.`)
  }
}

const argv = process.argv.slice(2)
const comando = argv.find((a) => a.startsWith('--'))
const codice = argv.find((a) => !a.startsWith('--'))

if (!comando || !codice) {
  console.error('Serve un comando e un argomento. Esempi:')
  console.error('  node scripts/verifica.mjs --cieca bio.6.3')
  console.error('  node scripts/verifica.mjs --confronta bio.6.3')
  process.exit(1)
}
if (comando === '--nuove') {
  // un foglio ogni PEZZO domande nuove della materia: biologia-nuove-1, biologia-nuove-2...
  const pezzi = Math.ceil(bancaDi(codice).filter((d) => new Set(idNuovi(codice)).has(d.id)).length / PEZZO)
  if (!pezzi) {
    console.error(`Nessuna domanda nuova di ${codice} approvata in banca: importa e approva prima le bozze.`)
    process.exit(1)
  }
  for (let k = 1; k <= pezzi; k++) cieca(`${codice}-nuove-${k}`)
} else if (comando === '--prof') {
  // un foglio ogni PEZZO bozze della profondità 20: biologia-prof-1, biologia-prof-2...
  // `--prof fisica` legge _giro5-fisica.json; `--prof fisica b` legge _giro5b-fisica.json (fogli fisica-profb-1...)
  const suf = argv.filter((a) => !a.startsWith('--'))[1] ?? ''
  const pezzi = Math.ceil(bozzeProfondita(codice, suf).length / PEZZO)
  if (!pezzi) {
    console.error(`Nessuna bozza in dati/generate/_giro5${suf}-${codice}.json.`)
    process.exit(1)
  }
  for (let k = 1; k <= pezzi; k++) cieca(`${codice}-prof${suf}-${k}`)
} else if (comando === '--cieca') cieca(codice)
else if (comando === '--confronta') await confronta(codice)
else {
  console.error(`Comando sconosciuto: ${comando}. Sono --cieca, --nuove, --prof e --confronta.`)
  process.exit(1)
}
