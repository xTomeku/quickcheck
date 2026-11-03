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
  type DomandaElenco,
} from './etichette'

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

export default function FormDomanda({ domanda, onAnnulla, onSalvato }: Props) {
  const nRisposte = domanda?.risposte[0]?.count ?? 0
  // Con risposte già raccolte testo, categoria, tipo e scala non si possono più cambiare
  const bloccata = nRisposte > 0

  const [idCorrente, setIdCorrente] = useState<string | null>(domanda?.id ?? null)
  const ref = useAlApertura<HTMLFormElement>()
  const [categoria, setCategoria] = useState(domanda?.categoria ?? 'generica')
  const [ambito, setAmbito] = useState(domanda?.ambito_docente ?? 'docente')
  const [testo, setTesto] = useState(domanda?.testo ?? '')
  const [tipo, setTipo] = useState(domanda?.tipo_risposta ?? 'scala')
  const [scalaMin, setScalaMin] = useState(String(domanda?.scala_min ?? 1))
  const [scalaMax, setScalaMax] = useState(String(domanda?.scala_max ?? 5))
  const [etMin, setEtMin] = useState(domanda?.etichetta_min ?? '')
  const [etMax, setEtMax] = useState(domanda?.etichetta_max ?? '')
  const [opzioni, setOpzioni] = useState<string[]>(['', '', ''])
  const [obbligatoria, setObbligatoria] = useState(domanda?.obbligatoria ?? true)
  const [ordine, setOrdine] = useState(String(domanda?.ordine ?? 0))
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

    setInvio(true)

    // 1. La domanda
    const comuni = {
      obbligatoria,
      ordine: Number(ordine) || 0,
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
    }

    let id = idCorrente
    if (id) {
      const { error } = await supabase
        .from('domande')
        .update(bloccata ? comuni : completi)
        .eq('id', id)
      if (error) return fallito(error)
    } else {
      const { data, error } = await supabase.from('domande').insert(completi).select('id').single()
      if (error || !data) return fallito(error ?? { message: '' })
      id = data.id
      setIdCorrente(id)
    }

    // 2. Le opzioni di risposta (sostituite per intero)
    if (!bloccata) {
      const { error: errDel } = await supabase.from('opzioni_risposta').delete().eq('domanda_id', id)
      if (errDel) return fallito(errDel)
      if (tipo === 'scelta_singola' && testiOpzioni.length > 0) {
        const { error } = await supabase
          .from('opzioni_risposta')
          .insert(testiOpzioni.map((t, i) => ({ domanda_id: id, testo: t, ordine: i + 1 })))
        if (error) return fallito(error)
      }
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
            onChange={(e) => setCategoria(e.target.value)}
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
      {(categoria === 'generica' || categoria === 'generica_docente') && (
        <p className="text-sm text-slate-500">
          {categoria === 'generica'
            ? 'Le domande generiche valgono per tutte le materie: non hanno collegamenti.'
            : 'Le domande generiche sui docenti valgono per ogni docente di ogni materia: non hanno collegamenti.'}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="size-4"
            checked={obbligatoria}
            onChange={(e) => setObbligatoria(e.target.checked)}
          />
          6. Risposta obbligatoria
        </label>
        <Campo etichetta="7. Ordine nella categoria (numero più basso = prima)">
          <Input type="number" value={ordine} onChange={(e) => setOrdine(e.target.value)} />
        </Campo>
      </div>

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
      {tipo === 'scala' ? (
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
