import { normalizza } from '../../../../lib/nomi'
import { supabase } from '../../../../lib/supabase'
import { caricaStatRisposte, caricaTesti } from '../dati'
import type { Contesto } from '../esporta'
import { argomenti, type Filtri } from '../filtri'
import { componiReport, type DatiGrezzi, type Opzioni, type Richiesta } from './componi'
import { paginaHtml } from './pagina'
import type { Riferimenti } from './riferimenti'

// Se una lettura fallisce il report non si crea: meglio nessun file che uno con dei buchi
function dati<T>({ data, error }: { data: T[] | null; error: { message: string } | null }): T[] {
  if (error) throw new Error(error.message)
  return data ?? []
}

async function testiExtra(edizione: string) {
  const righe: { domanda_id: string; testo: string }[] = []
  for (let da = 0; ; da += 1000) {
    const blocco = dati(
      await supabase
        .from('risposte_extra')
        .select('domanda_id, testo')
        .eq('edizione_id', edizione)
        .eq('nascosta', false)
        .not('testo', 'is', null)
        .order('id')
        .range(da, da + 999),
    )
    righe.push(...blocco.map((r) => ({ domanda_id: r.domanda_id, testo: r.testo ?? '' })))
    if (blocco.length < 1000) return righe
  }
}

async function leggi(richiesta: Richiesta, opzioni: Opzioni, filtri: Filtri): Promise<DatiGrezzi> {
  const args = argomenti(filtri)
  const { p_docente: _docente, ...senzaDocente } = args
  const generale = richiesta.tipo === 'generale'

  const [compilazioni, studenti, perMateria, perDocente, saltati, testi, extra, scritteExtra] =
    await Promise.all([
      supabase.rpc('stat_compilazioni', senzaDocente).then(dati),
      generale
        ? supabase
            .rpc('stat_studenti', {
              p_edizione: filtri.edizione,
              p_tipo_corso: filtri.tipoCorso || undefined,
              p_corso: args.p_corso,
              p_anno_corso: args.p_anno_corso,
              p_anno_studente: args.p_anno_studente,
              p_fuori_corso: args.p_fuori_corso,
            })
            .then(dati)
        : [],
      caricaStatRisposte(args, 'domanda_materia').then(dati),
      opzioni.docenti ? caricaStatRisposte(args, 'domanda_docente').then(dati) : [],
      opzioni.docenti && !generale ? supabase.rpc('stat_saltati', args).then(dati) : [],
      opzioni.testi ? caricaTesti(args).then(dati) : [],
      generale ? supabase.rpc('stat_extra', { p_edizione: filtri.edizione }).then(dati) : [],
      generale && opzioni.testi ? testiExtra(filtri.edizione) : [],
    ])

  return {
    compilazioni,
    studenti: studenti[0]?.n ?? null,
    perMateria,
    perDocente,
    saltati,
    testi,
    extra,
    testiExtra: scritteExtra,
  }
}

// Il logo va dentro il file, così il report si vede anche da solo. Se non si legge, se ne fa a meno.
async function caricaLogo(): Promise<string> {
  try {
    const risposta = await fetch('./udu-lecce-ingegneria.png')
    if (!risposta.ok) return ''
    const file = await risposta.blob()
    return await new Promise((fatto) => {
      const lettore = new FileReader()
      lettore.onloadend = () => fatto(typeof lettore.result === 'string' ? lettore.result : '')
      lettore.readAsDataURL(file)
    })
  } catch {
    return ''
  }
}

export async function creaReport({
  richiesta,
  opzioni,
  filtri,
  contesto,
  rif,
  nome,
}: {
  richiesta: Richiesta
  opzioni: Opzioni
  filtri: Filtri
  contesto: Contesto
  rif: Riferimenti
  // Nome della materia o del docente, per il nome del file
  nome?: string
}) {
  const [grezzi, logo] = await Promise.all([leggi(richiesta, opzioni, filtri), caricaLogo()])
  const modello = componiReport({ richiesta, opzioni, filtri, contesto, rif, dati: grezzi })

  const oggi = new Date().toLocaleDateString('sv-SE') // anno-mese-giorno, con l'ora di qui
  const base = [
    'report-sondaggio',
    richiesta.tipo,
    nome ? normalizza(nome).replace(/ /g, '-') : '',
    oggi,
  ]
    .filter(Boolean)
    .join('-')

  const indirizzo = URL.createObjectURL(
    new Blob([paginaHtml(modello, logo, base)], { type: 'text/html;charset=utf-8' }),
  )
  const collegamento = document.createElement('a')
  collegamento.href = indirizzo
  collegamento.download = `${base}.html`
  collegamento.click()
  // Il browser deve fare in tempo ad avviare il salvataggio
  setTimeout(() => URL.revokeObjectURL(indirizzo), 10_000)
}
