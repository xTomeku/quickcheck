import { useState } from 'react'
import { Avviso, Azioni, Input, Pulsante, Select, StatoPill, TestataSezione } from '../../../components/ui'
import type { Tables } from '../../../lib/database.types'
import { messaggioErrore } from '../../../lib/errori'
import { supabase } from '../../../lib/supabase'
import { useElenco } from '../../../lib/useElenco'
import DocentiMateria from './DocentiMateria'
import FormMateria from './FormMateria'

type Materia = Tables<'materie'> & {
  materie_corso: { anno: number; corsi_di_laurea: { id: string; nome: string } | null }[]
  insegnamenti: { docenti: { nome: string; cognome: string } | null }[]
}

export default function Materie() {
  const { righe, errore, ricarica } = useElenco<Materia>(
    () =>
      supabase
        .from('materie')
        .select(
          '*, materie_corso(anno, corsi_di_laurea(id, nome)), insegnamenti(docenti(nome, cognome))',
        )
        .order('nome'),
    'materie',
  )
  const [modifica, setModifica] = useState<Materia | 'nuovo' | null>(null)
  const [cerca, setCerca] = useState('')
  const [corsoFiltro, setCorsoFiltro] = useState('')
  const [docentiAperti, setDocentiAperti] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)

  async function cambiaStato(m: Materia) {
    if (m.attiva && m.materie_corso.length > 0) {
      const ok = window.confirm(
        `La materia compare in ${m.materie_corso.length} corsi. Disattivandola non sarà più scelta dagli studenti. Continuare?`,
      )
      if (!ok) return
    }
    const { error } = await supabase.from('materie').update({ attiva: !m.attiva }).eq('id', m.id)
    setAvviso(error ? messaggioErrore(error) : null)
    ricarica()
  }

  // Il filtro per corso offre solo i corsi che hanno almeno una materia
  const corsiFiltro = new Map<string, string>()
  for (const m of righe ?? [])
    for (const mc of m.materie_corso)
      if (mc.corsi_di_laurea) corsiFiltro.set(mc.corsi_di_laurea.id, mc.corsi_di_laurea.nome)

  const filtrate = (righe ?? []).filter(
    (m) =>
      m.nome.toLowerCase().includes(cerca.trim().toLowerCase()) &&
      (!corsoFiltro || m.materie_corso.some((mc) => mc.corsi_di_laurea?.id === corsoFiltro)),
  )

  return (
    <div className="space-y-4">
      <TestataSezione
        titolo="Materie"
        aiuto="L'elenco di tutte le materie. Con «Gestisci docenti» scegli chi le insegna."
      >
        <Pulsante variante="primario" onClick={() => setModifica('nuovo')}>
          Nuova materia
        </Pulsante>
      </TestataSezione>

      {avviso && <Avviso>{avviso}</Avviso>}
      {errore && <Avviso>{errore}</Avviso>}

      {modifica && (
        <FormMateria
          materia={modifica === 'nuovo' ? null : modifica}
          onAnnulla={() => setModifica(null)}
          onSalvato={(idNuova, problema) => {
            setModifica(null)
            setAvviso(problema ?? null)
            ricarica()
            // Se i docenti non sono stati salvati, la materia si apre sul loro pannello per completarli
            if (idNuova && problema) {
              setCerca('')
              setDocentiAperti(idNuova)
            }
          }}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <Input
            type="search"
            aria-label="Cerca per nome"
            placeholder="Cerca una materia per nome"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filtra per corso"
          className="!w-auto min-w-52"
          value={corsoFiltro}
          onChange={(e) => setCorsoFiltro(e.target.value)}
        >
          <option value="">Tutti i corsi</option>
          {[...corsiFiltro].map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </Select>
      </div>

      {righe === null ? (
        <p className="text-slate-500">Caricamento…</p>
      ) : filtrate.length === 0 ? (
        <Avviso tipo="info">
          {righe.length === 0 ? 'Nessuna materia inserita.' : 'Nessuna materia corrisponde alla ricerca.'}
        </Avviso>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {filtrate.map((m) => (
            <li
              key={m.id}
              className={`flex flex-wrap items-start gap-3 p-4 ${
                docentiAperti === m.id ? 'relative z-10 my-2 rounded-xl bg-white shadow-lg ring-2 ring-inchiostro' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p
                    className={`text-[17px] font-bold ${m.attiva ? '' : 'text-slate-400 line-through'}`}
                  >
                    {m.nome}
                  </p>
                  {m.cfu !== null && <span className="text-sm text-slate-500">{m.cfu} CFU</span>}
                  <StatoPill attivo={m.attiva} femminile />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] text-slate-500">Corsi</span>
                  {m.materie_corso.length === 0 ? (
                    <span className="text-sm text-slate-500">nessuno</span>
                  ) : (
                    m.materie_corso.map((mc, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-inchiostro-velo px-2.5 py-0.5 text-[13px] font-semibold text-inchiostro-scuro"
                      >
                        {mc.corsi_di_laurea?.nome ?? '?'} · {mc.anno}° anno
                      </span>
                    ))
                  )}
                </div>
                <p className="mt-1.5 text-sm">
                  <span className="text-[13px] text-slate-500">Docenti </span>
                  <span className="font-semibold">
                    {m.insegnamenti.length === 0
                      ? 'nessuno'
                      : m.insegnamenti
                          .map((i) => (i.docenti ? `${i.docenti.cognome} ${i.docenti.nome}` : '?'))
                          .join(', ')}
                  </span>
                </p>
              </div>
              <Azioni>
                <Pulsante
                  variante={docentiAperti === m.id ? 'attivo' : 'secondario'}
                  aria-expanded={docentiAperti === m.id}
                  onClick={() => setDocentiAperti(docentiAperti === m.id ? null : m.id)}
                >
                  {docentiAperti === m.id ? 'Chiudi docenti' : 'Gestisci docenti'}
                </Pulsante>
                <Pulsante onClick={() => setModifica(m)}>Modifica</Pulsante>
                <Pulsante variante={m.attiva ? 'pericolo' : 'secondario'} onClick={() => cambiaStato(m)}>
                  {m.attiva ? 'Disattiva' : 'Riattiva'}
                </Pulsante>
              </Azioni>
              {docentiAperti === m.id && (
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="mb-3 font-extrabold">Docenti di «{m.nome}»</h3>
                  <DocentiMateria materiaId={m.id} onCambiato={ricarica} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
