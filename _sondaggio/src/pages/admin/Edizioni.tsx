import { useState, type FormEvent } from 'react'
import { ANELLO_APERTO, Avviso, Campo, Input, Pulsante, useAlApertura } from '../../components/ui'
import type { Tables } from '../../lib/database.types'
import { messaggioErrore } from '../../lib/errori'
import { supabase } from '../../lib/supabase'
import { useElenco } from '../../lib/useElenco'

type Edizione = Tables<'edizioni'> & { compilazioni: { count: number }[] }

function data(valore: string | null) {
  return valore
    ? new Date(valore).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })
    : null
}

function stato(e: Edizione) {
  if (e.aperta) return { testo: 'Aperta', stile: 'bg-green-100 text-green-800' }
  if (!e.aperta_il) return { testo: 'Non ancora aperta', stile: 'bg-amber-100 text-amber-800' }
  return { testo: 'Chiusa', stile: 'bg-slate-200 text-slate-700' }
}

export default function Edizioni() {
  const { righe, errore, ricarica } = useElenco<Edizione>(
    () =>
      supabase
        .from('edizioni')
        .select('*, compilazioni(count)')
        .order('created_at', { ascending: false }),
    'edizioni',
  )
  const [modifica, setModifica] = useState<Edizione | 'nuova' | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)

  async function apri(e: Edizione) {
    const ok = window.confirm(
      `Aprire «${e.nome}»? Gli studenti potranno iniziare a compilare il sondaggio.`,
    )
    if (!ok) return
    const { error } = await supabase.from('edizioni').update({ aperta: true }).eq('id', e.id)
    if (error?.code === '23505') {
      setAvviso("C'è già un'edizione aperta: chiudila prima di aprirne un'altra.")
    } else {
      setAvviso(error ? messaggioErrore(error) : null)
    }
    ricarica()
  }

  async function chiudi(e: Edizione) {
    const ok = window.confirm(
      `Chiudere «${e.nome}»? Gli studenti non potranno più inviare risposte e le bozze non inviate non saranno più utilizzabili.`,
    )
    if (!ok) return
    const { error } = await supabase.from('edizioni').update({ aperta: false }).eq('id', e.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Edizioni</h1>
          <p className="mt-1 text-sm text-slate-500">
            Un'edizione è un ciclo di compilazione. I dati di ogni edizione restano separati da
            quelli delle altre e può essere aperta una sola edizione alla volta.
          </p>
        </div>
        <Pulsante variante="primario" onClick={() => setModifica('nuova')}>
          Nuova edizione
        </Pulsante>
      </div>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modifica && (
        <FormEdizione
          edizione={modifica === 'nuova' ? null : modifica}
          onAnnulla={() => setModifica(null)}
          onSalvato={() => {
            setModifica(null)
            setAvviso(null)
            ricarica()
          }}
        />
      )}

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : righe.length === 0 ? (
        <Avviso tipo="info">Nessuna edizione. Creane una con «Nuova edizione».</Avviso>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {righe.map((e) => {
            const s = stato(e)
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {e.nome}{' '}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.stile}`}>
                      {s.testo}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Anno accademico {e.anno_accademico} · {e.compilazioni[0]?.count ?? 0}{' '}
                    compilazioni
                  </p>
                  {(e.aperta_il || e.chiusa_il) && (
                    <p className="text-sm text-slate-500">
                      {e.aperta_il && `Aperta il ${data(e.aperta_il)}`}
                      {e.chiusa_il && ` · chiusa il ${data(e.chiusa_il)}`}
                    </p>
                  )}
                </div>
                <Pulsante onClick={() => setModifica(e)}>Modifica</Pulsante>
                {e.aperta ? (
                  <Pulsante variante="pericolo" onClick={() => chiudi(e)}>
                    Chiudi
                  </Pulsante>
                ) : (
                  <Pulsante variante="primario" onClick={() => apri(e)}>
                    {e.aperta_il ? 'Riapri' : 'Apri'}
                  </Pulsante>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FormEdizione({
  edizione,
  onAnnulla,
  onSalvato,
}: {
  edizione: Edizione | null
  onAnnulla: () => void
  onSalvato: () => void
}) {
  const ref = useAlApertura<HTMLFormElement>()
  const [nome, setNome] = useState(edizione?.nome ?? '')
  const [anno, setAnno] = useState(edizione?.anno_accademico ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const valori = { nome: nome.trim(), anno_accademico: anno.trim() }
    const { error } = edizione
      ? await supabase.from('edizioni').update(valori).eq('id', edizione.id)
      : await supabase.from('edizioni').insert(valori)
    setInvio(false)
    if (error) setErrore(messaggioErrore(error))
    else onSalvato()
  }

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className={`space-y-4 rounded-xl border border-slate-300 bg-white p-4 ${ANELLO_APERTO}`}
    >
      <h3 className="font-semibold">{edizione ? 'Modifica edizione' : 'Nuova edizione'}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etichetta="Nome">
          <Input
            required
            placeholder="Primo semestre 2026/27"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </Campo>
        <Campo etichetta="Anno accademico">
          <Input
            required
            placeholder="2026/27"
            pattern="\d{4}/\d{2}"
            title="Nel formato 2026/27"
            value={anno}
            onChange={(e) => setAnno(e.target.value)}
          />
        </Campo>
      </div>
      {!edizione && <p className="text-sm text-slate-500">L'edizione nasce chiusa: si apre dall'elenco.</p>}
      {errore && <Avviso>{errore}</Avviso>}
      <div className="flex gap-2">
        <Pulsante type="submit" variante="primario" disabled={invio}>
          {invio ? 'Salvataggio…' : 'Salva'}
        </Pulsante>
        <Pulsante onClick={onAnnulla}>Annulla</Pulsante>
      </div>
    </form>
  )
}
