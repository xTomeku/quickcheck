import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'

export type Stato = 'nuova' | 'presente' | 'errore'
export type RigaAnteprima = { numero: number; descrizione: string; stato: Stato; messaggio?: string }
export type Anteprima = {
  righe: RigaAnteprima[]
  // Salva le righe nuove; restituisce un messaggio d'errore oppure null se è andato tutto bene
  esegui: () => Promise<string | null>
}
export type TipoImport = {
  id: string
  nome: string
  colonne: string[]
  aiuto: string[]
  prepara: (tabella: string[][]) => Promise<Anteprima>
}

type Lettura<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

async function carica<T>(richiesta: Lettura<T>, cosa: string): Promise<T[]> {
  const { data, error } = await richiesta
  if (error) throw new Error(`Non riesco a leggere ${cosa} dal database.`)
  return data ?? []
}

// Legge le colonne richieste dal file, cercandole per nome nella prima riga
function leggi(tabella: string[][], colonne: string[]) {
  const [intestazione, ...corpo] = tabella
  if (!intestazione) throw new Error('Il file è vuoto.')
  const nomi = intestazione.map((h) => norm(h).replace(/ /g, '_'))
  const indici = colonne.map((c) => nomi.indexOf(c))
  const mancanti = colonne.filter((_, i) => indici[i] < 0)
  if (mancanti.length > 0) {
    throw new Error(
      `Nel file mancano le colonne: ${mancanti.join(', ')}. Scarica il modello e usalo come base.`,
    )
  }
  return corpo.map((riga, k) => ({
    numero: k + 2,
    v: Object.fromEntries(colonne.map((c, i) => [c, (riga[indici[i]] ?? '').trim()])) as Record<
      string,
      string
    >,
  }))
}

const TIPI_CORSO: Record<string, string> = {
  triennale: 'triennale',
  magistrale: 'magistrale',
  'ciclo unico': 'ciclo_unico',
  ciclo_unico: 'ciclo_unico',
  'magistrale a ciclo unico': 'ciclo_unico',
}

// ---------- Corsi di laurea ----------
async function preparaCorsi(tabella: string[][]): Promise<Anteprima> {
  const righeFile = leggi(tabella, ['nome', 'tipo', 'durata_anni'])
  const esistenti = await carica(
    supabase.from('corsi_di_laurea').select('nome') as Lettura<{ nome: string }>,
    'i corsi',
  )
  const noti = new Set(esistenti.map((c) => norm(c.nome)))
  const visti = new Set<string>()
  const daInserire: { nome: string; tipo: string; durata_anni: number }[] = []

  const righe = righeFile.map(({ numero, v }): RigaAnteprima => {
    const descrizione = v.nome || '(senza nome)'
    const errore = (messaggio: string): RigaAnteprima => ({ numero, descrizione, stato: 'errore', messaggio })
    const tipo = TIPI_CORSO[norm(v.tipo)]
    const durata = Number(v.durata_anni)
    if (!v.nome) return errore('Manca il nome.')
    if (!tipo) return errore('Tipo non valido: usa triennale, magistrale o ciclo unico.')
    if (!Number.isInteger(durata) || durata < 1 || durata > 6) {
      return errore('Durata non valida: un numero da 1 a 6.')
    }
    if (noti.has(norm(v.nome))) {
      return { numero, descrizione, stato: 'presente', messaggio: 'Il corso esiste già.' }
    }
    if (visti.has(norm(v.nome))) return errore('Il corso compare più volte nel file.')
    visti.add(norm(v.nome))
    daInserire.push({ nome: v.nome, tipo, durata_anni: durata })
    return { numero, descrizione: `${v.nome} · ${tipo.replace('_', ' ')} · ${durata} anni`, stato: 'nuova' }
  })

  return {
    righe,
    esegui: async () => {
      // Il sondaggio riguarda un solo dipartimento: i corsi vi sono associati in automatico
      const { data: dip } = await supabase
        .from('dipartimenti')
        .select('id')
        .eq('attivo', true)
        .order('created_at')
        .limit(1)
      if (!dip || dip.length === 0) return 'Manca il dipartimento nel database.'
      const { error } = await supabase
        .from('corsi_di_laurea')
        .insert(daInserire.map((c) => ({ ...c, dipartimento_id: dip[0].id })))
      return error ? messaggioErrore(error) : null
    },
  }
}

// ---------- Materie del corso ----------
async function preparaMaterieCorso(tabella: string[][]): Promise<Anteprima> {
  const righeFile = leggi(tabella, ['corso', 'materia', 'cfu', 'anno'])
  const corsi = await carica(
    supabase.from('corsi_di_laurea').select('id, nome, durata_anni') as Lettura<{
      id: string
      nome: string
      durata_anni: number
    }>,
    'i corsi',
  )
  const materie = await carica(
    supabase.from('materie').select('id, nome') as Lettura<{ id: string; nome: string }>,
    'le materie',
  )
  const collegamenti = await carica(
    supabase.from('materie_corso').select('materia_id, corso_id') as Lettura<{
      materia_id: string
      corso_id: string
    }>,
    'le materie dei corsi',
  )

  const corsoPerNome = new Map(corsi.map((c) => [norm(c.nome), c]))
  const materiePerNome = new Map<string, string[]>()
  for (const m of materie) {
    materiePerNome.set(norm(m.nome), [...(materiePerNome.get(norm(m.nome)) ?? []), m.id])
  }
  const nomePerId = new Map(materie.map((m) => [m.id, norm(m.nome)]))
  const giaCollegate = new Set(collegamenti.map((c) => `${nomePerId.get(c.materia_id)}|${c.corso_id}`))
  const visti = new Set<string>()
  const daInserire: { nome: string; cfu: number | null; corsoId: string; anno: number }[] = []

  const righe = righeFile.map(({ numero, v }): RigaAnteprima => {
    const descrizione = `${v.materia || '(senza nome)'} → ${v.corso || '(senza corso)'}`
    const errore = (messaggio: string): RigaAnteprima => ({ numero, descrizione, stato: 'errore', messaggio })
    const corso = corsoPerNome.get(norm(v.corso))
    const anno = Number(v.anno)
    const cfu = v.cfu === '' ? null : Number(v.cfu)
    if (!v.materia) return errore('Manca il nome della materia.')
    if (!corso) return errore('Corso non trovato: va prima inserito (o scritto come nell’elenco dei corsi).')
    if (!Number.isInteger(anno) || anno < 1 || anno > corso.durata_anni) {
      return errore(`Anno non valido: da 1 a ${corso.durata_anni} per questo corso.`)
    }
    if (cfu !== null && (!Number.isInteger(cfu) || cfu < 1)) return errore('CFU non validi: un numero intero oppure vuoto.')
    if ((materiePerNome.get(norm(v.materia))?.length ?? 0) > 1) {
      return errore('Esistono più materie con questo nome: collegala dalla scheda «Corsi di laurea» (pulsante «Materie»).')
    }
    const chiave = `${norm(v.materia)}|${corso.id}`
    if (giaCollegate.has(chiave)) {
      return { numero, descrizione, stato: 'presente', messaggio: 'La materia è già collegata a questo corso.' }
    }
    if (visti.has(chiave)) return errore('La stessa materia compare più volte per questo corso.')
    visti.add(chiave)
    daInserire.push({ nome: v.materia, cfu, corsoId: corso.id, anno })
    return { numero, descrizione: `${descrizione} · ${anno}° anno`, stato: 'nuova' }
  })

  return {
    righe,
    esegui: async () => {
      const idPerNome = new Map<string, string>()
      for (const [nome, ids] of materiePerNome) idPerNome.set(nome, ids[0])

      // Le materie che non esistono ancora si creano una volta sola
      const daCreare = new Map<string, { nome: string; cfu: number | null }>()
      for (const r of daInserire) {
        if (!idPerNome.has(norm(r.nome)) && !daCreare.has(norm(r.nome))) {
          daCreare.set(norm(r.nome), { nome: r.nome, cfu: r.cfu })
        }
      }
      if (daCreare.size > 0) {
        const { data, error } = await supabase
          .from('materie')
          .insert([...daCreare.values()])
          .select('id, nome')
        if (error || !data) return messaggioErrore(error ?? { message: '' })
        for (const m of data) idPerNome.set(norm(m.nome), m.id)
      }

      const { error } = await supabase.from('materie_corso').insert(
        daInserire.map((r) => ({
          materia_id: idPerNome.get(norm(r.nome)) as string,
          corso_id: r.corsoId,
          anno: r.anno,
        })),
      )
      return error ? messaggioErrore(error) : null
    },
  }
}

// ---------- Docenti ----------
async function preparaDocenti(tabella: string[][]): Promise<Anteprima> {
  const righeFile = leggi(tabella, ['cognome', 'nome'])
  const esistenti = await carica(
    supabase.from('docenti').select('nome, cognome') as Lettura<{ nome: string; cognome: string }>,
    'i docenti',
  )
  const chiave = (cognome: string, nome: string) => `${norm(cognome)}|${norm(nome)}`
  const noti = new Set(esistenti.map((d) => chiave(d.cognome, d.nome)))
  const visti = new Set<string>()
  const daInserire: { nome: string; cognome: string }[] = []

  const righe = righeFile.map(({ numero, v }): RigaAnteprima => {
    const descrizione = `${v.cognome} ${v.nome}`.trim() || '(vuoto)'
    if (!v.cognome || !v.nome) {
      return { numero, descrizione, stato: 'errore', messaggio: 'Servono sia il cognome sia il nome.' }
    }
    const k = chiave(v.cognome, v.nome)
    if (noti.has(k)) {
      return { numero, descrizione, stato: 'presente', messaggio: 'Il docente esiste già.' }
    }
    if (visti.has(k)) {
      return { numero, descrizione, stato: 'errore', messaggio: 'Il docente compare più volte nel file.' }
    }
    visti.add(k)
    daInserire.push({ nome: v.nome, cognome: v.cognome })
    return { numero, descrizione, stato: 'nuova' }
  })

  return {
    righe,
    esegui: async () => {
      const { error } = await supabase.from('docenti').insert(daInserire)
      return error ? messaggioErrore(error) : null
    },
  }
}

// ---------- Insegnamenti (materia + docente) ----------
async function preparaInsegnamenti(tabella: string[][]): Promise<Anteprima> {
  const righeFile = leggi(tabella, ['materia', 'cognome', 'nome'])
  const materie = await carica(
    supabase.from('materie').select('id, nome') as Lettura<{ id: string; nome: string }>,
    'le materie',
  )
  const docenti = await carica(
    supabase.from('docenti').select('id, nome, cognome') as Lettura<{
      id: string
      nome: string
      cognome: string
    }>,
    'i docenti',
  )
  const esistenti = await carica(
    supabase.from('insegnamenti').select('materia_id, docente_id') as Lettura<{
      materia_id: string
      docente_id: string
    }>,
    'gli insegnamenti',
  )

  const materiePerNome = new Map<string, string[]>()
  for (const m of materie) {
    materiePerNome.set(norm(m.nome), [...(materiePerNome.get(norm(m.nome)) ?? []), m.id])
  }
  const docentiPerNome = new Map<string, string[]>()
  for (const d of docenti) {
    const k = `${norm(d.cognome)}|${norm(d.nome)}`
    docentiPerNome.set(k, [...(docentiPerNome.get(k) ?? []), d.id])
  }
  const noti = new Set(esistenti.map((e) => `${e.materia_id}|${e.docente_id}`))
  const visti = new Set<string>()
  const daInserire: { materia_id: string; docente_id: string }[] = []

  const righe = righeFile.map(({ numero, v }): RigaAnteprima => {
    const descrizione = `${v.materia || '(senza materia)'} ← ${`${v.cognome} ${v.nome}`.trim() || '(senza docente)'}`
    const errore = (messaggio: string): RigaAnteprima => ({ numero, descrizione, stato: 'errore', messaggio })
    const idMaterie = materiePerNome.get(norm(v.materia)) ?? []
    const idDocenti = docentiPerNome.get(`${norm(v.cognome)}|${norm(v.nome)}`) ?? []
    if (idMaterie.length === 0) return errore('Materia non trovata: va prima inserita.')
    if (idMaterie.length > 1) return errore('Esistono più materie con questo nome: assegnali dalla scheda «Materie» (pulsante «Docenti»).')
    if (idDocenti.length === 0) return errore('Docente non trovato: va prima inserito.')
    if (idDocenti.length > 1) return errore('Esistono più docenti con questo nome: assegnali dalla scheda «Materie» (pulsante «Docenti»).')
    const k = `${idMaterie[0]}|${idDocenti[0]}`
    if (noti.has(k)) {
      return { numero, descrizione, stato: 'presente', messaggio: 'Il docente è già collegato alla materia.' }
    }
    if (visti.has(k)) return errore('La coppia compare più volte nel file.')
    visti.add(k)
    daInserire.push({ materia_id: idMaterie[0], docente_id: idDocenti[0] })
    return { numero, descrizione, stato: 'nuova' }
  })

  return {
    righe,
    esegui: async () => {
      const { error } = await supabase.from('insegnamenti').insert(daInserire)
      return error ? messaggioErrore(error) : null
    },
  }
}

export const TIPI: TipoImport[] = [
  {
    id: 'corsi',
    nome: 'Corsi di laurea',
    colonne: ['nome', 'tipo', 'durata_anni'],
    aiuto: [
      'tipo: triennale, magistrale oppure ciclo unico.',
      'durata_anni: un numero da 1 a 6.',
      'I corsi già presenti vengono saltati.',
    ],
    prepara: preparaCorsi,
  },
  {
    id: 'materie-corso',
    nome: 'Materie del corso',
    colonne: ['corso', 'materia', 'cfu', 'anno'],
    aiuto: [
      'corso: il nome esatto di un corso già inserito (importa prima i corsi).',
      'anno: da 1 alla durata del corso. cfu: facoltativo.',
      'Le materie nuove vengono create; quelle già esistenti si collegano al corso.',
    ],
    prepara: preparaMaterieCorso,
  },
  {
    id: 'docenti',
    nome: 'Docenti',
    colonne: ['cognome', 'nome'],
    aiuto: ['I docenti già presenti (stesso cognome e nome) vengono saltati.'],
    prepara: preparaDocenti,
  },
  {
    id: 'insegnamenti',
    nome: 'Insegnamenti (materia + docente)',
    colonne: ['materia', 'cognome', 'nome'],
    aiuto: [
      'materia, cognome e nome devono corrispondere a materie e docenti già inseriti.',
      'Importa prima materie e docenti.',
    ],
    prepara: preparaInsegnamenti,
  },
]
