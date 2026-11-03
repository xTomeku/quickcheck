import { useState, type FormEvent } from 'react'
import { Avviso, Campo, Input, Pulsante, Select } from '../../../components/ui'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import { collegaDocenti, useSceltaDocenti } from './SceltaDocenti'

type CorsoBreve = { id: string; nome: string; durata_anni: number }
type MateriaBreve = { id: string; nome: string }
type Collegamento = {
  id: string
  anno: number
  materie: { id: string; nome: string; cfu: number | null } | null
}

// Con `corsoFisso` il corso è già scelto (uso dentro la scheda Corsi) e non compare il selettore
export default function MaterieCorso({
  corsoFisso,
  onCambiato,
}: {
  corsoFisso?: string
  onCambiato?: () => void
}) {
  const corsi = useElenco<CorsoBreve>(
    () =>
      supabase
        .from('corsi_di_laurea')
        .select('id, nome, durata_anni')
        .eq('attivo', true)
        .order('nome'),
    'corsi-attivi',
  )
  const tutteLeMaterie = useElenco<MateriaBreve>(
    () => supabase.from('materie').select('id, nome').eq('attiva', true).order('nome'),
    'materie-attive',
  )
  const [corsoId, setCorsoId] = useState(corsoFisso ?? '')
  const corso = corsi.righe?.find((c) => c.id === corsoId)

  const collegamenti = useElenco<Collegamento>(async () => {
    if (!corsoId) return { data: [], error: null }
    return await supabase
      .from('materie_corso')
      .select('id, anno, materie(id, nome, cfu)')
      .eq('corso_id', corsoId)
      .order('anno')
  }, corsoId)

  const [avviso, setAvviso] = useState<string | null>(null)
  const [creaNuova, setCreaNuova] = useState(false)

  function ricaricaCollegamenti() {
    collegamenti.ricarica()
    onCambiato?.()
  }

  async function cambiaAnno(id: string, anno: number) {
    const { error } = await supabase.from('materie_corso').update({ anno }).eq('id', id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricaricaCollegamenti()
  }

  async function scollega(c: Collegamento) {
    if (!window.confirm(`Scollegare «${c.materie?.nome}» da questo corso?`)) return
    const { error } = await supabase.from('materie_corso').delete().eq('id', c.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricaricaCollegamenti()
  }

  const righe = collegamenti.righe ?? []
  const anni = corso ? Array.from({ length: corso.durata_anni }, (_, i) => i + 1) : []
  const giaCollegate = new Set(righe.map((r) => r.materie?.id))
  const collegabili = (tutteLeMaterie.righe ?? []).filter((m) => !giaCollegate.has(m.id))

  return (
    <div className="space-y-4">
      {!corsoFisso && (
        <>
          <h2 className="text-lg font-semibold">Materie del corso</h2>
          <Campo etichetta="Corso di laurea">
            <Select value={corsoId} onChange={(e) => setCorsoId(e.target.value)}>
              <option value="">Scegli un corso…</option>
              {(corsi.righe ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </>
      )}

      {corsi.errore && <Avviso>{corsi.errore}</Avviso>}
      {collegamenti.errore && <Avviso>{collegamenti.errore}</Avviso>}
      {avviso && <Avviso>{avviso}</Avviso>}

      {corso && (
        <>
          <CollegaEsistente
            corsoId={corso.id}
            anni={anni}
            materie={collegabili}
            creaAperta={creaNuova}
            onCreaNuova={() => setCreaNuova((v) => !v)}
            onFatto={() => {
              setAvviso(null)
              ricaricaCollegamenti()
            }}
          />
          {creaNuova && (
            <CreaECollega
              corsoId={corso.id}
              anni={anni}
              onFatto={() => {
                setAvviso(null)
                ricaricaCollegamenti()
                tutteLeMaterie.ricarica()
              }}
            />
          )}

          {collegamenti.righe === null ? (
            <p className="text-slate-500">Caricamento…</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
              {anni.map((anno) => {
                const delloAnno = righe.filter((r) => r.anno === anno)
                return (
                  <section
                    key={anno}
                    className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <h3 className="border-b-2 border-udu-giallo bg-giallo-velo px-4 py-2.5 text-sm font-extrabold">
                      {anno}° anno
                    </h3>
                    {delloAnno.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">Nessuna materia.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {delloAnno.map((r) => (
                          <li key={r.id} className="flex items-center gap-1 py-2 pr-1 pl-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{r.materie?.nome}</p>
                              {r.materie?.cfu != null && (
                                <p className="text-xs text-slate-500">{r.materie.cfu} CFU</p>
                              )}
                              <Select
                                aria-label={`Anno di ${r.materie?.nome}`}
                                className="mt-1 !w-auto !py-0.5 text-xs"
                                value={r.anno}
                                onChange={(e) => cambiaAnno(r.id, Number(e.target.value))}
                              >
                                {anni.map((a) => (
                                  <option key={a} value={a}>
                                    {a}° anno
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <button
                              type="button"
                              aria-label={`Scollega ${r.materie?.nome}`}
                              title="Scollega dal corso"
                              onClick={() => scollega(r)}
                              className="grid size-11 flex-none place-items-center rounded-lg text-pericolo-testo hover:bg-pericolo-velo"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden="true"
                              >
                                <path d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CollegaEsistente({
  corsoId,
  anni,
  materie,
  creaAperta,
  onCreaNuova,
  onFatto,
}: {
  corsoId: string
  anni: number[]
  materie: MateriaBreve[]
  creaAperta: boolean
  onCreaNuova: () => void
  onFatto: () => void
}) {
  const [materiaId, setMateriaId] = useState('')
  const [anno, setAnno] = useState('1')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const { error } = await supabase
      .from('materie_corso')
      .insert({ materia_id: materiaId, corso_id: corsoId, anno: Number(anno) })
    setInvio(false)
    if (error) setErrore(messaggioErrore(error))
    else {
      setMateriaId('')
      onFatto()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-56 flex-1">
          <Campo etichetta="Aggiungi una materia">
            <Select required value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
              <option value="">Scegli una materia…</option>
              {materie.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Pulsante
            variante="testo"
            className="-ml-3 mt-1"
            aria-expanded={creaAperta}
            onClick={onCreaNuova}
          >
            <span className="text-inchiostro-scuro">
              {creaAperta ? 'chiudi la creazione' : 'oppure crea una nuova materia →'}
            </span>
          </Pulsante>
        </div>
        <div className="w-36">
          <Campo etichetta="Anno">
            <Select value={anno} onChange={(e) => setAnno(e.target.value)}>
              {anni.map((a) => (
                <option key={a} value={a}>
                  {a}° anno
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <Pulsante
          type="submit"
          variante="primario"
          className="mt-6"
          disabled={invio || !materiaId}
        >
          Collega
        </Pulsante>
      </div>
      {errore && <Avviso>{errore}</Avviso>}
    </form>
  )
}

function CreaECollega({
  corsoId,
  anni,
  onFatto,
}: {
  corsoId: string
  anni: number[]
  onFatto: () => void
}) {
  const [nome, setNome] = useState('')
  const [cfu, setCfu] = useState('')
  const [anno, setAnno] = useState('1')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const docenti = useSceltaDocenti()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    const scelta = docenti.concludi()
    if ('errore' in scelta) return
    setInvio(true)
    const { data, error } = await supabase
      .from('materie')
      .insert({ nome: nome.trim(), cfu: cfu === '' ? null : Number(cfu) })
      .select('id')
      .single()
    if (error || !data) {
      setErrore(messaggioErrore(error ?? { message: '' }))
      setInvio(false)
      return
    }
    const { error: erroreLink } = await supabase
      .from('materie_corso')
      .insert({ materia_id: data.id, corso_id: corsoId, anno: Number(anno) })
    const problemaDocenti = await collegaDocenti(data.id, scelta.scelti)
    setInvio(false)
    const problemi = [
      erroreLink &&
        `la materia non è stata collegata al corso (${messaggioErrore(erroreLink)}): collegala dall'altro modulo`,
      problemaDocenti,
    ].filter(Boolean)
    if (problemi.length > 0) {
      setErrore(`Materia creata, ma ${problemi.join('; ')}. Per i docenti usa la scheda Materie.`)
    } else {
      setNome('')
      setCfu('')
    }
    docenti.azzera()
    onFatto()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">Crea e collega una nuova materia</h3>
      <Campo etichetta="Nome">
        <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etichetta="CFU (facoltativo)">
          <Input type="number" min={1} value={cfu} onChange={(e) => setCfu(e.target.value)} />
        </Campo>
        <Campo etichetta="Anno">
          <Select value={anno} onChange={(e) => setAnno(e.target.value)}>
            {anni.map((a) => (
              <option key={a} value={a}>
                {a}° anno
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      {docenti.campo}
      {errore && <Avviso>{errore}</Avviso>}
      <Pulsante type="submit" variante="primario" disabled={invio}>
        Crea e collega
      </Pulsante>
    </form>
  )
}
