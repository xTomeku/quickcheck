import { useState } from 'react'
import PulsanteElimina from '../../../components/PulsanteElimina'
import { Avviso, Input, Pulsante, Select } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import {
  CATEGORIE,
  NOME_CATEGORIA,
  NOME_TIPO,
  nRisposteDi,
  type DomandaElenco,
} from './etichette'
import FormDomanda from './FormDomanda'

export default function Domande() {
  const { righe, errore, ricarica } = useElenco<DomandaElenco>(
    () =>
      supabase
        .from('domande')
        .select('*, collegamenti_domanda(count), risposte(count), risposte_extra(count)')
        .order('ordine')
        .order('created_at'),
    'domande',
  )
  const [modifica, setModifica] = useState<DomandaElenco | 'nuova' | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [categoria, setCategoria] = useState('')
  const [stato, setStato] = useState('')
  const [cerca, setCerca] = useState('')

  async function cambiaStato(d: DomandaElenco) {
    if (d.attiva && !window.confirm('Disattivare la domanda? Gli studenti non la vedranno più.')) {
      return
    }
    const { error } = await supabase.from('domande').update({ attiva: !d.attiva }).eq('id', d.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  async function duplica(d: DomandaElenco) {
    const [opzioni, collegamenti] = await Promise.all([
      supabase.from('opzioni_risposta').select('testo, ordine').eq('domanda_id', d.id),
      supabase
        .from('collegamenti_domanda')
        .select('materia_id, docente_id, insegnamento_id')
        .eq('domanda_id', d.id),
    ])
    const { data, error } = await supabase
      .from('domande')
      .insert({
        testo: `${d.testo} (copia)`,
        categoria: d.categoria,
        gruppo: d.gruppo,
        mostra_se_domanda_id: d.mostra_se_domanda_id,
        mostra_se_opzioni: d.mostra_se_opzioni,
        ambito_docente: d.ambito_docente,
        tipo_risposta: d.tipo_risposta,
        scala_min: d.scala_min,
        scala_max: d.scala_max,
        etichetta_min: d.etichetta_min,
        etichetta_max: d.etichetta_max,
        obbligatoria: d.obbligatoria,
        ordine: d.ordine,
      })
      .select('id')
      .single()
    if (error || !data) {
      setAvviso(messaggioErrore(error ?? { message: '' }))
      return
    }
    if (opzioni.data && opzioni.data.length > 0) {
      await supabase
        .from('opzioni_risposta')
        .insert(opzioni.data.map((o) => ({ ...o, domanda_id: data.id })))
    }
    if (collegamenti.data && collegamenti.data.length > 0) {
      await supabase
        .from('collegamenti_domanda')
        .insert(collegamenti.data.map((c) => ({ ...c, domanda_id: data.id })))
    }
    setAvviso(null)
    ricarica()
  }

  const ordineCategorie = CATEGORIE.map((c) => c.id as string)
  const filtrate = (righe ?? [])
    .filter((d) => !categoria || d.categoria === categoria)
    .filter((d) => !stato || (stato === 'attiva') === d.attiva)
    .filter((d) => d.testo.toLowerCase().includes(cerca.trim().toLowerCase()))
    .sort(
      (a, b) =>
        ordineCategorie.indexOf(a.categoria) - ordineCategorie.indexOf(b.categoria) ||
        a.ordine - b.ordine,
    )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Domande</h1>
          <p className="mt-1 text-sm text-slate-500">
            Le domande nascono come bozza e si attivano quando sono complete. Una domanda attiva si
            modifica solo dopo averla disattivata.
          </p>
        </div>
        <Pulsante variante="primario" onClick={() => setModifica('nuova')}>
          Nuova domanda
        </Pulsante>
      </div>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modifica && (
        <FormDomanda
          key={modifica === 'nuova' ? 'nuova' : modifica.id}
          domanda={modifica === 'nuova' ? null : modifica}
          onAnnulla={() => {
            setModifica(null)
            ricarica()
          }}
          onSalvato={() => {
            setModifica(null)
            setAvviso(null)
            ricarica()
          }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Select aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Select aria-label="Stato" value={stato} onChange={(e) => setStato(e.target.value)}>
          <option value="">Tutti gli stati</option>
          <option value="attiva">Attive</option>
          <option value="non-attiva">Non attive (bozze e disattivate)</option>
        </Select>
        <Input
          placeholder="Cerca nel testo"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      </div>

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : filtrate.length === 0 ? (
        <Avviso tipo="info">
          {righe.length === 0
            ? 'Nessuna domanda. Creane una con «Nuova domanda».'
            : 'Nessuna domanda corrisponde ai filtri.'}
        </Avviso>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {filtrate.map((d) => {
            const nRisposte = nRisposteDi(d)
            const nColl = d.collegamenti_domanda[0]?.count ?? 0
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{d.testo}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.attiva ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {d.attiva ? 'Attiva' : nRisposte > 0 ? 'Disattivata' : 'Bozza'}
                    </span>
                    <span>{NOME_CATEGORIA[d.categoria] ?? d.categoria}</span>
                    {d.gruppo && <span>· Gruppo «{d.gruppo}»</span>}
                    {d.mostra_se_domanda_id && (
                      <span>
                        · Solo se «
                        {(righe ?? []).find((x) => x.id === d.mostra_se_domanda_id)?.testo ?? '…'}»
                      </span>
                    )}
                    <span>· {NOME_TIPO[d.tipo_risposta] ?? d.tipo_risposta}</span>
                    {(d.categoria === 'specifica_materia' || d.categoria === 'specifica_docente') && (
                      <span>· {nColl} collegamenti</span>
                    )}
                    <span>· {nRisposte} risposte</span>
                  </p>
                </div>
                <Pulsante
                  disabled={d.attiva}
                  title={d.attiva ? 'Disattiva la domanda per modificarla' : undefined}
                  onClick={() => setModifica(d)}
                >
                  Modifica
                </Pulsante>
                <Pulsante onClick={() => duplica(d)}>Duplica</Pulsante>
                <Pulsante
                  variante={d.attiva ? 'pericolo' : 'primario'}
                  onClick={() => cambiaStato(d)}
                >
                  {d.attiva ? 'Disattiva' : 'Attiva'}
                </Pulsante>
                <PulsanteElimina
                  tipo="domanda"
                  id={d.id}
                  nome={d.testo}
                  onEliminata={ricarica}
                  onMessaggio={setAvviso}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
