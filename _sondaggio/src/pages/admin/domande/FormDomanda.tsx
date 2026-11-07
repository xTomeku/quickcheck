import { useEffect, useState, type FormEvent } from 'react'
import {
  ANELLO_APERTO,
  Avviso,
  Campo,
  Input,
  Pulsante,
  Select,
  useAlApertura,
} from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import {
  CATEGORIE,
  NOME_AMBITO,
  NOME_TIPO,
  nRisposteDi,
  type DomandaElenco,
} from './etichette'

// Voce del menu dei gruppi che apre il campo per scriverne uno nuovo
const NUOVO_GRUPPO = '__nuovo__'

type Voce = { id: string; etichetta: string }
type Impostazione = { chiave: string; valore: string }
type InsegnamentoVoce = {
  id: string
  materie: { nome: string } | null
  docenti: { nome: string; cognome: string } | null
}

type Props = {
  domanda: DomandaElenco | null
  onAnnulla: () => void
  onSalvato: () => void
}

// Salva le opzioni di una domanda conservando l'id di quelle che c'erano già: prima si abbinano per
// testo uguale (così uno spostamento non cambia il significato), poi per posizione (così una
// correzione del testo, come «Si» → «Sì», non lo cambia). Le altre si cancellano o si aggiungono.
async function salvaOpzioni(
  domandaId: string,
  testi: string[],
): Promise<{ code?: string; message: string } | null> {
  const { data: esistenti, error: errLettura } = await supabase
    .from('opzioni_risposta')
    .select('id, testo')
    .eq('domanda_id', domandaId)
    .order('ordine')
  if (errLettura) return errLettura

  const libere = [...(esistenti ?? [])]
  const abbinate: (string | null)[] = testi.map((t) => {
    const k = libere.findIndex((o) => o.testo === t)
    return k < 0 ? null : libere.splice(k, 1)[0].id
  })
  for (let i = 0; i < testi.length; i++) {
    if (abbinate[i] === null && libere.length > 0) abbinate[i] = libere.shift()!.id
  }

  if (libere.length > 0) {
    const { error } = await supabase
      .from('opzioni_risposta')
      .delete()
      .in('id', libere.map((o) => o.id))
    if (error) return error
  }

  // Ogni domanda non può avere due opzioni con lo stesso ordine: si passa da un numero provvisorio
  for (const passo of [1000, 0]) {
    for (let i = 0; i < testi.length; i++) {
      const id = abbinate[i]
      if (!id) continue
      const { error } = await supabase
        .from('opzioni_risposta')
        .update({ testo: testi[i], ordine: passo + i + 1 })
        .eq('id', id)
      if (error) return error
    }
  }

  const nuove = testi.flatMap((t, i) =>
    abbinate[i] ? [] : [{ domanda_id: domandaId, testo: t, ordine: i + 1 }],
  )
  if (nuove.length > 0) {
    const { error } = await supabase.from('opzioni_risposta').insert(nuove)
    if (error) return error
  }
  return null
}

export default function FormDomanda({ domanda, onAnnulla, onSalvato }: Props) {
  const nRisposte = domanda ? nRisposteDi(domanda) : 0
  // Con risposte già raccolte testo, categoria, tipo e scala non si possono più cambiare
  const bloccata = nRisposte > 0

  const [idCorrente, setIdCorrente] = useState<string | null>(domanda?.id ?? null)
  const ref = useAlApertura<HTMLFormElement>()
  const [categoria, setCategoria] = useState(domanda?.categoria ?? 'generica')
  const [ambito, setAmbito] = useState(domanda?.ambito_docente ?? 'docente')
  const [testo, setTesto] = useState(domanda?.testo ?? '')
  const [gruppo, setGruppo] = useState(domanda?.gruppo ?? '')
  const [nuovoGruppo, setNuovoGruppo] = useState(false)
  // Condizione «mostra solo se»: la domanda da cui dipende e le sue risposte che la fanno comparire
  const [condDomanda, setCondDomanda] = useState(domanda?.mostra_se_domanda_id ?? '')
  const [condOpzioni, setCondOpzioni] = useState<Set<string>>(
    new Set(domanda?.mostra_se_opzioni ?? []),
  )
  const [tipo, setTipo] = useState(domanda?.tipo_risposta ?? 'scala')
  const [scalaMin, setScalaMin] = useState(String(domanda?.scala_min ?? 1))
  const [scalaMax, setScalaMax] = useState(String(domanda?.scala_max ?? 5))
  const [etMin, setEtMin] = useState(domanda?.etichetta_min ?? '')
  const [etMax, setEtMax] = useState(domanda?.etichetta_max ?? '')
  const [opzioni, setOpzioni] = useState<string[]>(['', '', ''])
  const [obbligatoria, setObbligatoria] = useState(domanda?.obbligatoria ?? true)
  const [colMaterie, setColMaterie] = useState<Set<string>>(new Set())
  const [colDocenti, setColDocenti] = useState<Set<string>>(new Set())
  const [colInsegnamenti, setColInsegnamenti] = useState<Set<string>>(new Set())
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  const impostazioni = useElenco<Impostazione>(
    () => supabase.from('impostazioni').select('chiave, valore'),
    'impostazioni',
  )
  const opzMin = Number(impostazioni.righe?.find((i) => i.chiave === 'opzioni_min')?.valore ?? 3)
  const opzMax = Number(impostazioni.righe?.find((i) => i.chiave === 'opzioni_max')?.valore ?? 5)

  // I gruppi già usati, da riproporre quando si scrive il titolo di un gruppo
  const gruppiUsati = useElenco<{ gruppo: string | null }>(
    () => supabase.from('domande').select('gruppo').not('gruppo', 'is', null),
    'gruppi-domande',
  )
  const titoliGruppi = [...new Set((gruppiUsati.righe ?? []).map((g) => g.gruppo ?? ''))]
    .filter((g) => g !== '')
    .sort((a, b) => a.localeCompare(b))

  // Domande da cui questa può dipendere: a scelta singola, della stessa categoria, a loro volta non condizionate
  const condizionabile = ['generica', 'generica_docente', 'extra'].includes(categoria)
  const genitori = useElenco<{ id: string; testo: string }>(
    async () =>
      condizionabile
        ? await supabase
            .from('domande')
            .select('id, testo')
            .eq('categoria', categoria)
            .eq('tipo_risposta', 'scelta_singola')
            .is('mostra_se_domanda_id', null)
            .order('ordine')
        : { data: [], error: null },
    `genitori-${categoria}`,
  )
  const opzioniGenitore = useElenco<{ id: string; testo: string; ordine: number }>(
    async () =>
      condDomanda
        ? await supabase
            .from('opzioni_risposta')
            .select('id, testo, ordine')
            .eq('domanda_id', condDomanda)
            .order('ordine')
        : { data: [], error: null },
    `opzioni-genitore-${condDomanda}`,
  )

  // Solo le risposte scelte che esistono ancora nella domanda da cui dipende
  const idOpzioniGenitore = new Set((opzioniGenitore.righe ?? []).map((o) => o.id))
  const condValide = new Set([...condOpzioni].filter((o) => idOpzioniGenitore.has(o)))
  const condOrfane =
    opzioniGenitore.righe !== null && condDomanda !== '' && condValide.size < condOpzioni.size

  const materie = useElenco<{ id: string; nome: string }>(
    () => supabase.from('materie').select('id, nome').eq('attiva', true).order('nome'),
    'materie-attive',
  )
  const docenti = useElenco<{ id: string; nome: string; cognome: string }>(
    () =>
      supabase
        .from('docenti')
        .select('id, nome, cognome')
        .eq('attivo', true)
        .order('cognome')
        .order('nome'),
    'docenti-attivi',
  )
  const insegnamenti = useElenco<InsegnamentoVoce>(
    () => supabase.from('insegnamenti').select('id, materie(nome), docenti(nome, cognome)'),
    'insegnamenti',
  )

  // Opzioni e collegamenti attuali della domanda che si sta modificando
  useEffect(() => {
    if (!domanda) return
    let annullato = false
    Promise.all([
      supabase
        .from('opzioni_risposta')
        .select('testo, ordine')
        .eq('domanda_id', domanda.id)
        .order('ordine'),
      supabase
        .from('collegamenti_domanda')
        .select('materia_id, docente_id, insegnamento_id')
        .eq('domanda_id', domanda.id),
    ]).then(([o, c]) => {
      if (annullato) return
      const testi = (o.data ?? []).map((x) => x.testo)
      setOpzioni(testi.length > 0 ? testi : ['', '', ''])
      const righe = c.data ?? []
      setColMaterie(new Set(righe.flatMap((r) => (r.materia_id ? [r.materia_id] : []))))
      setColDocenti(new Set(righe.flatMap((r) => (r.docente_id ? [r.docente_id] : []))))
      setColInsegnamenti(
        new Set(righe.flatMap((r) => (r.insegnamento_id ? [r.insegnamento_id] : []))),
      )
    })
    return () => {
      annullato = true
    }
  }, [domanda])

  const vociMaterie: Voce[] = (materie.righe ?? []).map((m) => ({ id: m.id, etichetta: m.nome }))
  const vociDocenti: Voce[] = (docenti.righe ?? []).map((d) => ({
    id: d.id,
    etichetta: `${d.cognome} ${d.nome}`,
  }))
  const vociInsegnamenti: Voce[] = (insegnamenti.righe ?? [])
    .map((i) => ({
      id: i.id,
      etichetta: `${i.materie?.nome ?? '?'} — ${i.docenti ? `${i.docenti.cognome} ${i.docenti.nome}` : '?'}`,
    }))
    .sort((a, b) => a.etichetta.localeCompare(b.etichetta))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)

    const testiOpzioni = opzioni.map((o) => o.trim()).filter((o) => o !== '')
    if (!bloccata && tipo === 'scala' && Number(scalaMin) >= Number(scalaMax)) {
      setErrore('Nella scala il valore minimo deve essere inferiore al massimo.')
      return
    }
    if (!bloccata && tipo === 'scelta_singola' && testiOpzioni.length > opzMax) {
      setErrore(`Una domanda a scelta singola può avere al massimo ${opzMax} opzioni.`)
      return
    }

    const condizionata = condizionabile && condDomanda !== ''
    if (!bloccata && condizionata && condValide.size === 0) {
      setErrore('Scegli almeno una risposta che fa comparire la domanda, oppure togli la condizione.')
      return
    }

    setInvio(true)

    // 1. La domanda
    const comuni = {
      gruppo: gruppo.trim() || null,
      obbligatoria,
      etichetta_min: tipo === 'scala' ? etMin.trim() || null : null,
      etichetta_max: tipo === 'scala' ? etMax.trim() || null : null,
    }
    const completi = {
      ...comuni,
      testo: testo.trim(),
      categoria,
      ambito_docente: categoria === 'specifica_docente' ? ambito : null,
      tipo_risposta: tipo,
      scala_min: tipo === 'scala' ? Number(scalaMin) : null,
      scala_max: tipo === 'scala' ? Number(scalaMax) : null,
      mostra_se_domanda_id: condizionata ? condDomanda : null,
      mostra_se_opzioni: condizionata ? [...condValide] : [],
    }

    // Una domanda nuova, o spostata in un'altra categoria, va in fondo alla categoria:
    // l'ordine si cambia poi con le frecce dell'elenco
    async function inFondo() {
      const { data } = await supabase
        .from('domande')
        .select('ordine')
        .eq('categoria', categoria)
        .order('ordine', { ascending: false })
        .limit(1)
      return (data?.[0]?.ordine ?? 0) + 10
    }

    let id = idCorrente
    if (id) {
      const cambiaCategoria = !bloccata && domanda !== null && categoria !== domanda.categoria
      const { error } = await supabase
        .from('domande')
        .update(bloccata ? comuni : { ...completi, ...(cambiaCategoria ? { ordine: await inFondo() } : {}) })
        .eq('id', id)
      if (error) return fallito(error)
    } else {
      const { data, error } = await supabase
        .from('domande')
        .insert({ ...completi, ordine: await inFondo() })
        .select('id')
        .single()
      if (error || !data) return fallito(error ?? { message: '' })
      id = data.id
      setIdCorrente(id)
    }

    // 2. Le opzioni di risposta. Quelle che ci sono già si aggiornano e non si ricreano: le domande
    // condizionate puntano al loro id, e un id nuovo le lascerebbe legate a una risposta sparita.
    if (!bloccata) {
      const errOpzioni = await salvaOpzioni(id, tipo === 'scelta_singola' ? testiOpzioni : [])
      if (errOpzioni) return fallito(errOpzioni)
    }

    // 3. I collegamenti (sostituiti per intero)
    const { error: errColl } = await supabase.from('collegamenti_domanda').delete().eq('domanda_id', id)
    if (errColl) return fallito(errColl)
    let nuovi: { domanda_id: string; materia_id?: string; docente_id?: string; insegnamento_id?: string }[] = []
    if (categoria === 'specifica_materia') {
      nuovi = [...colMaterie].map((m) => ({ domanda_id: id, materia_id: m }))
    } else if (categoria === 'specifica_docente' && ambito === 'docente') {
      nuovi = [...colDocenti].map((d) => ({ domanda_id: id, docente_id: d }))
    } else if (categoria === 'specifica_docente') {
      nuovi = [...colInsegnamenti].map((i) => ({ domanda_id: id, insegnamento_id: i }))
    }
    if (nuovi.length > 0) {
      const { error } = await supabase.from('collegamenti_domanda').insert(nuovi)
      if (error) return fallito(error)
    }

    setInvio(false)
    onSalvato()
  }

  function fallito(error: { code?: string; message: string }) {
    setErrore(messaggioErrore(error))
    setInvio(false)
  }

  const nOpzioniCompilate = opzioni.filter((o) => o.trim() !== '').length

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={`space-y-5 rounded-xl border border-slate-300 bg-white p-4 ${ANELLO_APERTO}`}
    >
      <h3 className="text-lg font-semibold">{domanda ? 'Modifica domanda' : 'Nuova domanda'}</h3>

      {bloccata && (
        <Avviso tipo="info">
          Questa domanda ha già {nRisposte} risposte: testo, categoria, tipo e scala non si possono
          più cambiare. Per modificarla, creane una nuova con «Duplica».
        </Avviso>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Campo etichetta="1. Categoria">
          <Select
            disabled={bloccata}
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value)
              // La domanda da cui dipende deve avere la stessa categoria
              setCondDomanda('')
              setCondOpzioni(new Set())
            }}
          >
            {CATEGORIE.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Campo>

        {categoria === 'specifica_docente' && (
          <Campo etichetta="2. Ambito">
            <Select disabled={bloccata} value={ambito} onChange={(e) => setAmbito(e.target.value)}>
              {Object.entries(NOME_AMBITO).map(([valore, nome]) => (
                <option key={valore} value={valore}>
                  {nome}
                </option>
              ))}
            </Select>
          </Campo>
        )}
      </div>

      <Campo etichetta="3. Testo della domanda">
        <textarea
          required
          disabled={bloccata}
          rows={2}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
        />
      </Campo>

      <Campo etichetta="Gruppo (titolo sopra le domande, facoltativo)">
        <Select
          value={nuovoGruppo ? NUOVO_GRUPPO : gruppo}
          onChange={(e) => {
            const scelto = e.target.value
            setNuovoGruppo(scelto === NUOVO_GRUPPO)
            setGruppo(scelto === NUOVO_GRUPPO ? '' : scelto)
          }}
        >
          <option value="">Nessun gruppo</option>
          {[...new Set([...titoliGruppi, ...(gruppo !== '' && !nuovoGruppo ? [gruppo] : [])])]
            .sort((a, b) => a.localeCompare(b))
            .map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          <option value={NUOVO_GRUPPO}>Nuovo gruppo…</option>
        </Select>
        {nuovoGruppo && (
          <Input
            autoFocus
            className="mt-2"
            aria-label="Nome del nuovo gruppo"
            maxLength={60}
            placeholder="ad esempio: Materiale didattico"
            value={gruppo}
            onChange={(e) => setGruppo(e.target.value)}
          />
        )}
      </Campo>

      <Campo etichetta="4. Tipo di risposta">
        <Select disabled={bloccata} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(NOME_TIPO).map(([valore, nome]) => (
            <option key={valore} value={valore}>
              {nome}
            </option>
          ))}
        </Select>
      </Campo>

      {tipo === 'scala' && (
        <div className="grid gap-4 md:grid-cols-4">
          <Campo etichetta="Valore minimo">
            <Input
              type="number"
              disabled={bloccata}
              value={scalaMin}
              onChange={(e) => setScalaMin(e.target.value)}
            />
          </Campo>
          <Campo etichetta="Valore massimo">
            <Input
              type="number"
              disabled={bloccata}
              value={scalaMax}
              onChange={(e) => setScalaMax(e.target.value)}
            />
          </Campo>
          <Campo etichetta="Etichetta del minimo">
            <Input
              placeholder="per niente"
              value={etMin}
              onChange={(e) => setEtMin(e.target.value)}
            />
          </Campo>
          <Campo etichetta="Etichetta del massimo">
            <Input
              placeholder="moltissimo"
              value={etMax}
              onChange={(e) => setEtMax(e.target.value)}
            />
          </Campo>
        </div>
      )}

      {tipo === 'scelta_singola' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Opzioni di risposta (da {opzMin} a {opzMax})
          </p>
          {opzioni.map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input
                aria-label={`Opzione ${i + 1}`}
                disabled={bloccata}
                value={o}
                onChange={(e) => setOpzioni(opzioni.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <Pulsante
                disabled={bloccata || opzioni.length <= 1}
                onClick={() => setOpzioni(opzioni.filter((_, j) => j !== i))}
              >
                Togli
              </Pulsante>
            </div>
          ))}
          <Pulsante
            disabled={bloccata || opzioni.length >= opzMax}
            onClick={() => setOpzioni([...opzioni, ''])}
          >
            Aggiungi opzione
          </Pulsante>
          {nOpzioniCompilate < opzMin && (
            <p className="text-sm text-amber-700">
              Per attivare la domanda servono almeno {opzMin} opzioni compilate.
            </p>
          )}
        </div>
      )}

      {categoria === 'specifica_materia' && (
        <ElencoSelezione
          titolo="5. Materie a cui è collegata"
          voci={vociMaterie}
          selezionati={colMaterie}
          onCambia={setColMaterie}
        />
      )}
      {categoria === 'specifica_docente' && ambito === 'docente' && (
        <ElencoSelezione
          titolo="5. Docenti a cui è collegata"
          voci={vociDocenti}
          selezionati={colDocenti}
          onCambia={setColDocenti}
        />
      )}
      {categoria === 'specifica_docente' && ambito === 'insegnamento' && (
        <ElencoSelezione
          titolo="5. Coppie materia + docente a cui è collegata"
          voci={vociInsegnamenti}
          selezionati={colInsegnamenti}
          onCambia={setColInsegnamenti}
        />
      )}
      {(categoria === 'generica' || categoria === 'generica_docente' || categoria === 'extra') && (
        <p className="text-sm text-slate-500">
          {categoria === 'generica'
            ? 'Le domande generiche valgono per tutte le materie: non hanno collegamenti.'
            : categoria === 'generica_docente'
              ? 'Le domande generiche sui docenti valgono per ogni docente di ogni materia: non hanno collegamenti.'
              : 'Le domande Extra si chiedono una sola volta a ogni studente, dopo tutte le materie e prima dell\'invio: non riguardano una materia né un docente. Le risposte scritte restano anonime e possono essere nascoste da Statistiche.'}
        </p>
      )}

      {condizionabile && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <Campo etichetta="Mostra solo se… (facoltativo)">
            <Select
              disabled={bloccata}
              value={condDomanda}
              onChange={(e) => {
                setCondDomanda(e.target.value)
                setCondOpzioni(new Set())
              }}
            >
              <option value="">Sempre (nessuna condizione)</option>
              {(genitori.righe ?? [])
                .filter((g) => g.id !== idCorrente)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.testo}
                  </option>
                ))}
            </Select>
          </Campo>
          {condDomanda !== '' && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium text-slate-700">
                …e la risposta è una di queste ({condValide.size}{' '}
                {condValide.size === 1 ? 'scelta' : 'scelte'})
              </legend>
              {condOrfane && (
                <Avviso>
                  La condizione era legata a risposte che non esistono più, perché la domanda da cui
                  dipende è stata modificata. Scegli di nuovo la risposta che fa comparire questa domanda.
                </Avviso>
              )}
              {(opzioniGenitore.righe ?? []).map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    disabled={bloccata}
                    checked={condOpzioni.has(o.id)}
                    onChange={() => {
                      const nuove = new Set(condOpzioni)
                      if (nuove.has(o.id)) nuove.delete(o.id)
                      else nuove.add(o.id)
                      setCondOpzioni(nuove)
                    }}
                  />
                  {o.testo}
                </label>
              ))}
            </fieldset>
          )}
          <p className="text-sm text-slate-500">
            Serve a chiedere «È utile?» solo a chi risponde «Sì» a «C'è un tutoraggio?». La domanda da cui
            dipende deve essere a scelta singola, della stessa categoria e attiva prima di questa.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          className="size-4"
          checked={obbligatoria}
          onChange={(e) => setObbligatoria(e.target.checked)}
        />
        6. Risposta obbligatoria
      </label>

      <Anteprima
        testo={testo}
        tipo={tipo}
        scalaMin={Number(scalaMin)}
        scalaMax={Number(scalaMax)}
        etMin={etMin}
        etMax={etMax}
        opzioni={opzioni.filter((o) => o.trim() !== '')}
        obbligatoria={obbligatoria}
      />

      {errore && <Avviso>{errore}</Avviso>}
      <p className="text-sm text-slate-500">
        La domanda si salva come bozza: si attiva dall'elenco, quando è completa.
      </p>
      <div className="flex gap-2">
        <Pulsante type="submit" variante="primario" disabled={invio}>
          {invio ? 'Salvataggio…' : 'Salva'}
        </Pulsante>
        <Pulsante onClick={onAnnulla}>Chiudi</Pulsante>
      </div>
    </form>
  )
}

function ElencoSelezione({
  titolo,
  voci,
  selezionati,
  onCambia,
}: {
  titolo: string
  voci: Voce[]
  selezionati: Set<string>
  onCambia: (s: Set<string>) => void
}) {
  const [cerca, setCerca] = useState('')
  const visibili = voci.filter((v) => v.etichetta.toLowerCase().includes(cerca.trim().toLowerCase()))

  function alterna(id: string) {
    const nuovo = new Set(selezionati)
    if (nuovo.has(id)) nuovo.delete(id)
    else nuovo.add(id)
    onCambia(nuovo)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">
        {titolo} ({selezionati.size} selezionate)
      </p>
      <Input placeholder="Cerca" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
        {visibili.length === 0 ? (
          <li className="p-3 text-sm text-slate-500">Nessuna voce.</li>
        ) : (
          visibili.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selezionati.has(v.id)}
                  onChange={() => alterna(v.id)}
                />
                {v.etichetta}
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function Anteprima({
  testo,
  tipo,
  scalaMin,
  scalaMax,
  etMin,
  etMax,
  opzioni,
  obbligatoria,
}: {
  testo: string
  tipo: string
  scalaMin: number
  scalaMax: number
  etMin: string
  etMax: string
  opzioni: string[]
  obbligatoria: boolean
}) {
  const valori =
    tipo === 'scala' && Number.isInteger(scalaMin) && Number.isInteger(scalaMax) && scalaMax > scalaMin && scalaMax - scalaMin < 11
      ? Array.from({ length: scalaMax - scalaMin + 1 }, (_, i) => scalaMin + i)
      : []

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
        Anteprima come la vede lo studente
      </p>
      <p className="font-medium">
        {testo.trim() || 'Testo della domanda'}
        {obbligatoria && <span className="text-red-600"> *</span>}
      </p>
      {tipo === 'testo' ? (
        <div className="mt-3 h-20 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-400">
          Scrivi qui (massimo 1000 caratteri)
        </div>
      ) : tipo === 'scala' ? (
        <div className="mt-3">
          <div className="flex gap-2">
            {valori.map((v) => (
              <span
                key={v}
                className="flex size-10 items-center justify-center rounded-lg border border-slate-300 bg-white"
              >
                {v}
              </span>
            ))}
          </div>
          {(etMin || etMax) && (
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{etMin}</span>
              <span>{etMax}</span>
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {opzioni.length === 0 ? (
            <li className="text-sm text-slate-400">Nessuna opzione.</li>
          ) : (
            opzioni.map((o, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="size-4 rounded-full border border-slate-400 bg-white" />
                {o}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
